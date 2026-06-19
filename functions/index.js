import { onRequest } from "firebase-functions/v2/https";
import { defineString, defineSecret } from "firebase-functions/params";
import crypto from "node:crypto";

const clientId = defineString("OAUTH_CLIENT_ID");
const clientSecret = defineSecret("OAUTH_CLIENT_SECRET");

function requestOrigin(req) {
  const proto = req.get("x-forwarded-proto") || "https";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

function routeName(req) {
  const path = req.path.replace(/\/$/, "");
  if (path.endsWith("/auth")) return "auth";
  if (path.endsWith("/callback")) return "callback";
  return "";
}

function authSuccessPage(token) {
  const payload = JSON.stringify({ token, provider: "github" });
  return `<!doctype html>
<html lang="en">
  <body>
    <p>Login successful. This window should close automatically.</p>
    <script>
      window.opener.postMessage("authorization:github:success:" + ${JSON.stringify(payload)}, "*");
      window.close();
    </script>
  </body>
</html>`;
}

export const cmsOAuth = onRequest(
  {
    cors: true,
    secrets: [clientSecret],
    invoker: "public",
  },
  async (req, res) => {
    const origin = requestOrigin(req);
    const route = routeName(req);

    if (route === "auth") {
      const scope = typeof req.query.scope === "string" ? req.query.scope : "repo";
      const state = crypto.randomBytes(16).toString("hex");
      const redirectUri = `${origin}/callback`;

      res.setHeader(
        "Set-Cookie",
        `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
      );

      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", clientId.value());
      authorize.searchParams.set("redirect_uri", redirectUri);
      authorize.searchParams.set("scope", scope);
      authorize.searchParams.set("state", state);
      res.redirect(authorize.toString());
      return;
    }

    if (route === "callback") {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const cookies = req.get("cookie") || "";
      const match = cookies.match(/oauth_state=([^;]+)/);
      const savedState = match ? match[1] : "";

      if (!code || !state || !savedState || savedState !== state) {
        res.status(400).send("OAuth state mismatch. Close this window and try again.");
        return;
      }

      const redirectUri = `${origin}/callback`;
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId.value(),
          client_secret: clientSecret.value(),
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        res.status(400).send(`GitHub token error: ${JSON.stringify(tokenData)}`);
        return;
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(authSuccessPage(tokenData.access_token));
      return;
    }

    res.status(404).send("Decap CMS OAuth endpoint. Use /auth or /callback.");
  }
);
