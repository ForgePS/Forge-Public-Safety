import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";
import { newForgeId } from "../ids.js";
import { writeAudit } from "./audit.js";

function normalize(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown>} input
 */
export async function upsertDepartment(input) {
  const firestore = db();
  let forgeDepartmentId = normalize(input.forgeDepartmentId);
  const rmsDepartmentId = normalize(input.rmsDepartmentId);
  const academyDepartmentId = normalize(input.academyDepartmentId);
  const fdid = normalize(input.fdid);

  if (!forgeDepartmentId && rmsDepartmentId) {
    const existing = await firestore
      .collection(COLLECTIONS.connections)
      .where("rmsDepartmentId", "==", rmsDepartmentId)
      .limit(1)
      .get();
    if (!existing.empty) forgeDepartmentId = existing.docs[0].id;
  }

  if (!forgeDepartmentId) {
    forgeDepartmentId = newForgeId("fd");
  }

  const ref = firestore.doc(`${COLLECTIONS.connections}/${forgeDepartmentId}`);
  const prev = await ref.get();
  const payload = {
    forgeDepartmentId,
    rmsDepartmentId: rmsDepartmentId || prev.data()?.rmsDepartmentId || null,
    academyDepartmentId: academyDepartmentId || prev.data()?.academyDepartmentId || null,
    fdid: fdid || prev.data()?.fdid || null,
    name: normalize(input.name) || prev.data()?.name || "",
    status: prev.data()?.status || "pending",
    tenantId: normalize(input.tenantId) || prev.data()?.tenantId || "forge-platform",
    permissions: input.permissions ?? prev.data()?.permissions ?? defaultPermissions(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!prev.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
  await writeAudit({
    action: prev.exists ? "department.updated" : "department.created",
    forgeDepartmentId,
    details: payload,
  });
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() };
}

export async function getDepartment(forgeDepartmentId) {
  const snap = await db().doc(`${COLLECTIONS.connections}/${forgeDepartmentId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function connectDepartment(forgeDepartmentId, meta = {}) {
  const ref = db().doc(`${COLLECTIONS.connections}/${forgeDepartmentId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await upsertDepartment({ forgeDepartmentId, ...meta, name: meta.name || forgeDepartmentId });
  }
  await ref.set(
    {
      status: "active",
      connectedAt: FieldValue.serverTimestamp(),
      authorizedBy: normalize(meta.authorizedBy) || null,
      authorizationNotes: normalize(meta.notes) || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit({
    action: "department.connection.authorized",
    forgeDepartmentId,
    details: meta,
  });
  return getDepartment(forgeDepartmentId);
}

export async function disconnectDepartment(forgeDepartmentId, meta = {}) {
  const ref = db().doc(`${COLLECTIONS.connections}/${forgeDepartmentId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.set(
    {
      status: "revoked",
      disconnectedAt: FieldValue.serverTimestamp(),
      revokedBy: normalize(meta.revokedBy) || null,
      revokeReason: normalize(meta.reason) || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit({
    action: "department.connection.revoked",
    forgeDepartmentId,
    details: meta,
  });
  return getDepartment(forgeDepartmentId);
}

function defaultPermissions() {
  return {
    registerPersonnel: true,
    approveRegistrations: true,
    viewInvoices: true,
    submitPurchaseOrders: false,
    viewStudentRecords: true,
    downloadCertificates: true,
    managePayments: false,
  };
}
