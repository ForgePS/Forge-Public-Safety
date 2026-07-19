import { Router } from "express";
import { requireHubAuth } from "../auth.js";
import {
  connectDepartment,
  disconnectDepartment,
  getDepartment,
  upsertDepartment,
} from "../services/connections.js";
import {
  approveFemaSidCorrection,
  getPersonIdentity,
  listDepartmentPersonnel,
  listDuplicateReviews,
  listFemaSidCorrections,
  mergeIdentities,
  patchPersonIdentity,
  rejectFemaSidCorrection,
  requestFemaSidCorrection,
  resolveDuplicateReview,
  resolvePersonIdentity,
  verifyIdentity,
} from "../services/identity.js";
import { getEvent } from "../services/events.js";
import { getSyncStatusSummary, ingestEvent, resync } from "../services/pipeline.js";
import { runReconcile } from "../services/reconcile.js";

const router = Router();

function actorFromReq(req) {
  return req.hubCaller?.system || req.hubCaller?.subject || "hub";
}

function errorStatus(error) {
  const message = error instanceof Error ? error.message : "Failed";
  if (/not found/i.test(message)) return 404;
  if (/required|cannot|must|invalid|empty|immutable/i.test(message)) return 400;
  return 400;
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "forge-integration-hub", version: "1.1.0-identity" });
});

router.use(requireHubAuth);

// --- Departments ---

router.post("/departments", async (req, res) => {
  try {
    const dept = await upsertDepartment(req.body || {});
    res.json({ ok: true, department: dept });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/departments/:departmentId", async (req, res) => {
  const dept = await getDepartment(req.params.departmentId);
  if (!dept) return res.status(404).json({ ok: false, error: "Not found" });
  return res.json({ ok: true, department: dept });
});

router.patch("/departments/:departmentId", async (req, res) => {
  try {
    const dept = await upsertDepartment({ ...(req.body || {}), forgeDepartmentId: req.params.departmentId });
    res.json({ ok: true, department: dept });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/departments/:departmentId/connect", async (req, res) => {
  try {
    const dept = await connectDepartment(req.params.departmentId, req.body || {});
    await ingestEvent({
      eventType: "department.connection.authorized",
      sourceSystem: req.hubCaller?.system === "rms" ? "rms" : "hub",
      forgeDepartmentId: req.params.departmentId,
      data: req.body || {},
    });
    res.json({ ok: true, department: dept });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/departments/:departmentId/disconnect", async (req, res) => {
  try {
    const dept = await disconnectDepartment(req.params.departmentId, req.body || {});
    if (!dept) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, department: dept });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/departments/:departmentId/personnel", async (req, res) => {
  const people = await listDepartmentPersonnel(req.params.departmentId);
  res.json({ ok: true, people });
});

router.post("/departments/:departmentId/personnel", async (req, res) => {
  try {
    const people = Array.isArray(req.body?.people) ? req.body.people : [];
    const forgeDepartmentId = req.params.departmentId;
    const results = { accepted: 0, errors: [], resolved: [] };

    for (const person of people) {
      try {
        // Canonical path: resolve identity before event ingest so Academy/RMS share personId.
        const resolved = await resolvePersonIdentity({
          ...person,
          forgeDepartmentId,
          sourceSystem: req.hubCaller?.system === "rms" ? "rms" : "hub",
        });
        if (resolved.review) {
          results.errors.push({
            rmsPersonId: person.rmsPersonId,
            message: `Duplicate review required: ${resolved.review.reason}`,
            reviewId: resolved.review.id,
          });
          continue;
        }
        const forgePersonId = resolved.identity?.forgePersonId || resolved.identity?.personId;
        await ingestEvent({
          eventType: person.forgePersonId || person.rmsPersonId ? "person.updated" : "person.created",
          sourceSystem: "rms",
          forgeDepartmentId,
          forgePersonId,
          relatedRecordId: person.rmsPersonId || null,
          data: { ...person, forgeDepartmentId, forgePersonId },
        });
        results.accepted += 1;
        results.resolved.push({
          rmsPersonId: person.rmsPersonId || null,
          forgePersonId,
          created: Boolean(resolved.created),
        });
      } catch (error) {
        results.errors.push({
          rmsPersonId: person.rmsPersonId,
          message: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    res.json({ ok: true, forgeDepartmentId, ...results });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

// --- Person Identity (canonical) ---

router.post("/identity/resolve", async (req, res) => {
  try {
    const body = req.body || {};
    const resolved = await resolvePersonIdentity({
      ...body,
      sourceSystem: body.sourceSystem || (req.hubCaller?.system === "rms" ? "rms" : "academy"),
    });
    if (resolved.review) {
      return res.status(202).json({
        ok: true,
        created: false,
        identity: null,
        review: resolved.review,
        message: "Duplicate or ambiguous identity requires review before a personId is assigned.",
      });
    }
    return res.json({
      ok: true,
      created: Boolean(resolved.created),
      identity: resolved.identity,
      personId: resolved.identity?.personId || resolved.identity?.forgePersonId || null,
      forgePersonId: resolved.identity?.forgePersonId || resolved.identity?.personId || null,
    });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

// Static identity paths must be registered before /identity/:personId
router.get("/identity/duplicates", async (req, res) => {
  const reviews = await listDuplicateReviews({
    status: req.query.status,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ ok: true, reviews });
});

router.get("/identity/fema-sid/corrections", async (req, res) => {
  const corrections = await listFemaSidCorrections({
    status: req.query.status,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ ok: true, corrections });
});

router.post("/identity/fema-sid/corrections/:correctionId/approve", async (req, res) => {
  try {
    const result = await approveFemaSidCorrection(req.params.correctionId, {
      actor: req.body?.actor || actorFromReq(req),
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.post("/identity/fema-sid/corrections/:correctionId/reject", async (req, res) => {
  try {
    const correction = await rejectFemaSidCorrection(req.params.correctionId, {
      actor: req.body?.actor || actorFromReq(req),
      reason: req.body?.reason,
    });
    return res.json({ ok: true, correction });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.post("/identity/duplicates/:reviewId/resolve", async (req, res) => {
  try {
    const result = await resolveDuplicateReview(req.params.reviewId, {
      ...(req.body || {}),
      actor: req.body?.actor || actorFromReq(req),
    });
    if (result.decision === "merge" && result.survivor) {
      await ingestEvent({
        eventType: "person.merged",
        sourceSystem: "hub",
        forgePersonId: result.survivor.personId || result.survivor.forgePersonId,
        data: {
          survivorPersonId: result.survivor.personId,
          loserPersonId: result.loser?.personId,
          mergeId: result.mergeId,
        },
      });
    }
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.post("/identity/merge", async (req, res) => {
  try {
    const result = await mergeIdentities({
      survivorPersonId: req.body?.survivorPersonId,
      loserPersonId: req.body?.loserPersonId,
      reviewId: req.body?.reviewId,
      actor: req.body?.actor || actorFromReq(req),
      reason: req.body?.reason,
    });
    await ingestEvent({
      eventType: "person.merged",
      sourceSystem: "hub",
      forgePersonId: result.survivor?.personId || result.survivor?.forgePersonId,
      data: {
        survivorPersonId: result.survivor?.personId,
        loserPersonId: result.loser?.personId,
        mergeId: result.mergeId,
      },
    });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.get("/identity/:personId", async (req, res) => {
  const follow = String(req.query.follow ?? "") === "1" || String(req.query.follow ?? "") === "true";
  const identity = await getPersonIdentity(req.params.personId, { follow });
  if (!identity) return res.status(404).json({ ok: false, error: "Not found" });
  if (!follow && identity.verificationStatus === "merged_away") {
    return res.status(404).json({
      ok: false,
      error: "Identity merged away. Retry with ?follow=1",
      mergedIntoPersonId: identity.mergedIntoPersonId || null,
    });
  }
  return res.json({ ok: true, identity });
});

router.post("/identity/:personId/verify", async (req, res) => {
  try {
    const identity = await verifyIdentity(req.params.personId, {
      actor: req.body?.actor || actorFromReq(req),
      evidence: req.body?.evidence,
      verifyFemaSid: req.body?.verifyFemaSid,
    });
    if (!identity) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, identity });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.post("/identity/:personId/fema-sid/corrections", async (req, res) => {
  try {
    const correction = await requestFemaSidCorrection(req.params.personId, {
      newFemaSid: req.body?.newFemaSid,
      reason: req.body?.reason,
      actor: req.body?.actor || actorFromReq(req),
    });
    return res.status(201).json({ ok: true, correction });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

// --- Personnel aliases (backward compatible) ---

router.patch("/personnel/:personId", async (req, res) => {
  try {
    const identity = await patchPersonIdentity(req.params.personId, req.body || {});
    if (!identity) return res.status(404).json({ ok: false, error: "Not found" });
    await ingestEvent({
      eventType: "person.updated",
      sourceSystem: req.hubCaller?.system === "rms" ? "rms" : "hub",
      forgePersonId: req.params.personId,
      data: req.body || {},
    });
    return res.json({ ok: true, identity });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

router.post("/personnel/:personId/status", async (req, res) => {
  try {
    const status = String(req.body?.status ?? "").trim();
    if (!status) return res.status(400).json({ ok: false, error: "status is required" });
    const identity = await patchPersonIdentity(req.params.personId, {
      status,
      employmentStatus: req.body?.employmentStatus,
    });
    if (!identity) return res.status(404).json({ ok: false, error: "Not found" });
    await ingestEvent({
      eventType: "person.status_changed",
      sourceSystem: req.hubCaller?.system === "rms" ? "rms" : "hub",
      forgePersonId: req.params.personId,
      data: { status, employmentStatus: req.body?.employmentStatus },
    });
    return res.json({ ok: true, identity });
  } catch (error) {
    return res.status(errorStatus(error)).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
});

// --- Events & sync ---

router.post("/events", async (req, res) => {
  try {
    const event = await ingestEvent({
      ...(req.body || {}),
      sourceSystem: req.body?.sourceSystem || (req.hubCaller?.system === "rms" ? "rms" : "academy"),
    });
    res.status(202).json({ ok: true, event });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/events/:eventId", async (req, res) => {
  const event = await getEvent(req.params.eventId);
  if (!event) return res.status(404).json({ ok: false, error: "Not found" });
  return res.json({ ok: true, event });
});

router.get("/sync/status", async (_req, res) => {
  const status = await getSyncStatusSummary();
  const [reviews, corrections] = await Promise.all([
    listDuplicateReviews({ status: "pending", limit: 50 }),
    listFemaSidCorrections({ status: "pending", limit: 50 }),
  ]);
  res.json({
    ...status,
    pendingDuplicateReviews: reviews,
    pendingFemaSidCorrections: corrections,
  });
});

router.post("/sync/resync", async (req, res) => {
  try {
    const result = await resync(req.body || {});
    res.status(202).json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/reconcile/run", async (_req, res) => {
  try {
    const report = await runReconcile();
    res.json({ ok: true, report });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

export default router;
