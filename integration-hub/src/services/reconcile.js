import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";

/**
 * Report-only nightly reconciliation. Does not auto-overwrite systems of record.
 */
export async function runReconcile() {
  const firestore = db();
  const [identities, connections, failures, reviews] = await Promise.all([
    firestore.collection(COLLECTIONS.identities).limit(1000).get(),
    firestore.collection(COLLECTIONS.connections).get(),
    firestore.collection(COLLECTIONS.syncFailures).where("status", "in", ["failed", "retry_scheduled"]).get(),
    firestore.collection(COLLECTIONS.duplicateReviews).where("status", "==", "pending").get(),
  ]);

  const activePeople = identities.docs.filter((d) => d.data()?.status !== "inactive").length;
  const activeConnections = connections.docs.filter((d) => d.data()?.status === "active").length;
  const missingStudentLink = identities.docs.filter((d) => !d.data()?.academyStudentId && !d.data()?.forgeAcademyStudentId)
    .length;
  const missingRmsLink = identities.docs.filter((d) => !d.data()?.rmsPersonId).length;

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "report_only",
    counts: {
      identities: identities.size,
      activePeople,
      connections: connections.size,
      activeConnections,
      openFailures: failures.size,
      pendingDuplicateReviews: reviews.size,
      missingAcademyStudentLink: missingStudentLink,
      missingRmsPersonLink: missingRmsLink,
    },
    failureEventIds: failures.docs.slice(0, 100).map((d) => d.id),
    notes: [
      "Phase 1 reconcile does not mutate Academy or RMS records.",
      "Use POST /sync/resync to retry failed events manually.",
    ],
  };

  await firestore.collection(COLLECTIONS.reconcileReports).add({
    ...report,
    createdAt: FieldValue.serverTimestamp(),
  });

  return report;
}
