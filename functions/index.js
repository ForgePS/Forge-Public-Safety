import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();
const db = getFirestore();

export const submitForm = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }
  try {
    const { formId, data } = req.body;
    if (!formId || !data) {
      res.status(400).json({ error: "Missing formId or data" });
      return;
    }
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
      if (snap.empty) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ id: snap.docs[0].id, ...snap.docs[0].data() });
      return;
    }
    res.status(404).json({ error: "Unknown endpoint" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
