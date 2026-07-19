import { loadSecrets } from "../config.js";

export async function hubOutboundHeaders() {
  const secrets = await loadSecrets();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = secrets.academyServiceToken || secrets.integrationSecret;
  const secret = secrets.integrationSecret || secrets.academyServiceToken;
  if (secret) headers["X-Integration-Secret"] = secret;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
