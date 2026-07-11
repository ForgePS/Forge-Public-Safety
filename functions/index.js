import { onRequest } from "firebase-functions/v2/https";
import { defineString, defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "node:crypto";

if (!getApps().length) initializeApp();
const db = getFirestore();

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
<html lang="en"><body><p>Login successful.</p>
<script>window.opener.postMessage("authorization:github:success:" + ${JSON.stringify(payload)}, "*");window.close();</script>
</body></html>`;
}

export const cmsOAuth = onRequest({ cors: true, secrets: [clientSecret], invoker: "public" }, async (req, res) => {
  const origin = requestOrigin(req);
  const route = routeName(req);

  if (route === "auth") {
    const scope = typeof req.query.scope === "string" ? req.query.scope : "repo";
    const state = crypto.randomBytes(16).toString("hex");
    res.setHeader("Set-Cookie", `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId.value());
    authorize.searchParams.set("redirect_uri", `${origin}/callback`);
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
    if (!code || !state || !match || match[1] !== state) {
      res.status(400).send("OAuth state mismatch.");
      return;
    }
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId.value(), client_secret: clientSecret.value(), code, redirect_uri: `${origin}/callback` }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) { res.status(400).send("Token error"); return; }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(authSuccessPage(tokenData.access_token));
    return;
  }

  res.status(404).send("OAuth endpoint");
});

export const submitForm = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  try {
    const { formId, data } = req.body;
    if (!formId || !data) { res.status(400).json({ error: "Missing formId or data" }); return; }
    const submission = {
      formId,
      data,
      status: "new",
      createdAt: new Date().toISOString(),
      ip: req.ip,
    };
    const ref = await db.collection("cms_form_submissions").add(submission);
    res.json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export const cmsApi = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  const path = req.path.replace(/^\/cmsApi\/?/, "");
  try {
    if (path === "pages" && req.method === "GET") {
      const snap = await db.collection("cms_pages").where("status", "==", "published").get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      return;
    }
    if (path.startsWith("pages/") && req.method === "GET") {
      const slug = path.replace("pages/", "");
      const snap = await db.collection("cms_pages").where("slug", "==", slug).limit(1).get();
      if (snap.empty) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ id: snap.docs[0].id, ...snap.docs[0].data() });
      return;
    }
    res.status(404).json({ error: "Unknown endpoint" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
