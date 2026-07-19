import { loadSecrets } from "./config.js";

/**
 * Accept Bearer service token (Academy/RMS) or X-Integration-Secret compat shim.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireHubAuth(req, res, next) {
  try {
    const secrets = await loadSecrets();
    const bearer = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    const secretHeader = String(req.headers["x-integration-secret"] ?? "").trim();

    const tokens = [secrets.academyServiceToken, secrets.rmsServiceToken, secrets.integrationSecret].filter(
      Boolean,
    );

    // Dev/open mode only when no secrets configured.
    if (!tokens.length) {
      req.hubCaller = { system: "anonymous", mode: "open" };
      return next();
    }

    if (bearer && tokens.includes(bearer)) {
      req.hubCaller = {
        system: bearer === secrets.rmsServiceToken ? "rms" : bearer === secrets.academyServiceToken ? "academy" : "hub",
        mode: "bearer",
      };
      return next();
    }

    if (secretHeader && secrets.integrationSecret && secretHeader === secrets.integrationSecret) {
      req.hubCaller = { system: "compat", mode: "secret" };
      return next();
    }

    return res.status(401).json({ ok: false, error: "Unauthorized. Use Bearer token or X-Integration-Secret." });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Auth failed.",
    });
  }
}
