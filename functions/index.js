const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

exports.submitForm = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }
  try {
    const { formId, data } = req.body || {};
    if (!formId || !data) {
      res.status(400).json({ error: "Missing formId or data" });
      return;
    }
    const ref = await getDb().collection("cms_form_submissions").add({
      formId,
      data,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.cmsApi = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  const path = (req.path || "").replace(/^\/cmsApi\/?/, "");
  try {
    const db = getDb();
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
