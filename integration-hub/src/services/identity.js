import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";
import { writeAudit } from "./audit.js";

export const FEMA_SID_STATUSES = Object.freeze({
  UNVERIFIED: "unverified",
  VERIFIED: "verified",
  DISPUTED: "disputed",
  CLEARED: "cleared",
});

export const VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: "unverified",
  VERIFIED: "verified",
  MERGED_AWAY: "merged_away",
});

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalize(value) {
  return String(value ?? "").trim();
}

/**
 * Strip non-digits. Valid FEMA SIDs are 9–12 digits.
 * @param {unknown} value
 * @returns {{ ok: true, display: string, normalized: string } | { ok: false, error: string, display: string, normalized: string }}
 */
export function normalizeFemaSid(value) {
  const display = normalize(value);
  const normalized = display.replace(/\D/g, "");
  if (!normalized) {
    return { ok: false, error: "FEMA SID is empty.", display, normalized: "" };
  }
  if (!/^\d{9,12}$/.test(normalized)) {
    return {
      ok: false,
      error: "FEMA SID must be 9–12 digits after normalization.",
      display,
      normalized,
    };
  }
  return { ok: true, display: normalized, normalized };
}

function mapIdentity(doc) {
  if (!doc?.exists) return null;
  const data = doc.data() || {};
  const id = doc.id;
  return {
    id,
    personId: data.personId || data.forgePersonId || id,
    forgePersonId: data.forgePersonId || data.personId || id,
    ...data,
  };
}

async function getIdentityRef(personId) {
  return db().doc(`${COLLECTIONS.identities}/${personId}`);
}

/** @param {string} personId @param {{ follow?: boolean }} [options] */
export async function getPersonIdentity(personId, options = {}) {
  const id = normalize(personId);
  if (!id) return null;
  const snap = await (await getIdentityRef(id)).get();
  let identity = mapIdentity(snap);
  if (!identity) return null;

  if (
    options.follow &&
    identity.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY &&
    identity.mergedIntoPersonId
  ) {
    const survivor = await getPersonIdentity(identity.mergedIntoPersonId, { follow: true });
    return survivor || identity;
  }
  return identity;
}

async function autoLinkFields(identity, person) {
  const patch = {};
  const rmsPersonId = normalize(person.rmsPersonId);
  const academyStudentId = normalize(person.academyStudentId || person.forgeAcademyStudentId);
  const forgeDepartmentId = normalize(person.forgeDepartmentId);
  const email = normalizeEmail(person.email);

  if (rmsPersonId && !identity.rmsPersonId) patch.rmsPersonId = rmsPersonId;
  if (academyStudentId && !identity.academyStudentId) {
    patch.academyStudentId = academyStudentId;
    patch.forgeAcademyStudentId = academyStudentId;
  }
  if (forgeDepartmentId && !identity.forgeDepartmentId) patch.forgeDepartmentId = forgeDepartmentId;
  if (email) {
    const emails = new Set(identity.emails ?? []);
    if (!emails.has(email)) {
      emails.add(email);
      patch.emails = [...emails];
    }
  }

  if (!Object.keys(patch).length) {
    return { identity, created: false, review: null };
  }

  const updated = await patchPersonIdentity(identity.personId || identity.id, patch);
  return { identity: updated, created: false, review: null };
}

/**
 * Resolve or create forgePersonId / personId.
 * Verified unique FEMA SID → return existing. Ambiguous / unverified collisions → review (no create).
 * New creates use Firestore auto-generated document IDs.
 * @param {Record<string, unknown>} person
 */
export async function resolvePersonIdentity(person) {
  const firestore = db();
  const forgePersonId = normalize(person.forgePersonId || person.personId);
  const rmsPersonId = normalize(person.rmsPersonId);
  const email = normalizeEmail(person.email);
  const academyStudentId = normalize(person.academyStudentId || person.forgeAcademyStudentId);
  const markVerified = person.markVerified === true || person.femaSidStatus === FEMA_SID_STATUSES.VERIFIED;
  const sourceSystem = normalize(person.sourceSystem) || "unknown";

  if (forgePersonId) {
    const identity = await getPersonIdentity(forgePersonId, { follow: true });
    if (identity) {
      if (identity.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY) {
        return {
          identity: null,
          created: false,
          review: await enqueueDuplicateReview({
            reason: "resolved_merged_away_identity",
            candidateIds: [identity.personId, identity.mergedIntoPersonId].filter(Boolean),
            person,
          }),
        };
      }
      return autoLinkFields(identity, person);
    }
  }

  if (rmsPersonId) {
    const byRms = await firestore
      .collection(COLLECTIONS.identities)
      .where("rmsPersonId", "==", rmsPersonId)
      .limit(2)
      .get();
    const active = byRms.docs
      .map((d) => mapIdentity(d))
      .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);
    if (active.length === 1) {
      return autoLinkFields(active[0], person);
    }
    if (active.length > 1) {
      const review = await enqueueDuplicateReview({
        reason: "multiple_rms_person_matches",
        rmsPersonId,
        candidateIds: active.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
  }

  if (academyStudentId) {
    const byStudent = await firestore
      .collection(COLLECTIONS.identities)
      .where("academyStudentId", "==", academyStudentId)
      .limit(2)
      .get();
    const active = byStudent.docs
      .map((d) => mapIdentity(d))
      .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);
    if (active.length === 1) {
      return autoLinkFields(active[0], person);
    }
    if (active.length > 1) {
      const review = await enqueueDuplicateReview({
        reason: "multiple_academy_student_matches",
        academyStudentId,
        candidateIds: active.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
  }

  const femaInput = normalize(person.femaSid);
  let femaNormalized = "";
  let femaDisplay = "";
  if (femaInput) {
    const fema = normalizeFemaSid(femaInput);
    if (!fema.ok) {
      throw new Error(fema.error);
    }
    femaNormalized = fema.normalized;
    femaDisplay = fema.display;

    const byFema = await firestore
      .collection(COLLECTIONS.identities)
      .where("femaSidNormalized", "==", femaNormalized)
      .limit(10)
      .get();

    // Fallback for legacy docs that only stored femaSid
    let docs = byFema.docs;
    if (docs.length === 0) {
      const legacy = await firestore
        .collection(COLLECTIONS.identities)
        .where("femaSid", "==", femaNormalized)
        .limit(10)
        .get();
      docs = legacy.docs;
    }

    const active = docs
      .map((d) => mapIdentity(d))
      .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);

    const verified = active.filter((row) => row.femaSidStatus === FEMA_SID_STATUSES.VERIFIED);
    if (verified.length === 1) {
      await writeAudit({
        action: "identity.resolve_fema_verified_match",
        forgePersonId: verified[0].personId,
        details: { femaSidNormalized: femaNormalized, sourceSystem },
      });
      return autoLinkFields(verified[0], person);
    }
    if (verified.length > 1) {
      const review = await enqueueDuplicateReview({
        reason: "multiple_verified_fema_sid_matches",
        femaSid: femaNormalized,
        candidateIds: verified.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
    if (active.length >= 1) {
      const review = await enqueueDuplicateReview({
        reason: "fema_sid_match_requires_review",
        femaSid: femaNormalized,
        candidateIds: active.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
  }

  if (email) {
    const byEmail = await firestore
      .collection(COLLECTIONS.identities)
      .where("emails", "array-contains", email)
      .limit(5)
      .get();
    const active = byEmail.docs
      .map((d) => mapIdentity(d))
      .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);
    if (active.length === 1) {
      return autoLinkFields(active[0], person);
    }
    if (active.length > 1) {
      const review = await enqueueDuplicateReview({
        reason: "multiple_email_matches",
        email,
        candidateIds: active.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
  }

  const firstName = normalize(person.firstName);
  const lastName = normalize(person.lastName);
  const dateOfBirth = normalize(person.dateOfBirth);
  if (firstName && lastName && dateOfBirth && dateOfBirth !== "1900-01-01") {
    const byName = await firestore
      .collection(COLLECTIONS.identities)
      .where("lastName", "==", lastName)
      .where("firstName", "==", firstName)
      .where("dateOfBirth", "==", dateOfBirth)
      .limit(5)
      .get();
    const active = byName.docs
      .map((d) => mapIdentity(d))
      .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);
    if (active.length >= 1) {
      const review = await enqueueDuplicateReview({
        reason: "name_dob_match_requires_review",
        candidateIds: active.map((d) => d.personId),
        person,
      });
      return { identity: null, created: false, review };
    }
  }

  // Firestore auto-generated document ID is the permanent personId.
  const ref = firestore.collection(COLLECTIONS.identities).doc();
  const personId = ref.id;
  const femaStatus = femaNormalized
    ? markVerified
      ? FEMA_SID_STATUSES.VERIFIED
      : FEMA_SID_STATUSES.UNVERIFIED
    : FEMA_SID_STATUSES.CLEARED;

  const payload = {
    personId,
    forgePersonId: personId,
    rmsPersonId: rmsPersonId || null,
    academyStudentId: academyStudentId || null,
    forgeAcademyStudentId: academyStudentId || null,
    forgeDepartmentId: normalize(person.forgeDepartmentId) || null,
    emails: email ? [email] : [],
    femaSid: femaDisplay || null,
    femaSidNormalized: femaNormalized || null,
    femaSidStatus: femaStatus,
    firstName,
    lastName,
    dateOfBirth: dateOfBirth || null,
    status: person.active === false ? "inactive" : "active",
    employmentStatus: normalize(person.employmentStatus) || null,
    verificationStatus: markVerified ? VERIFICATION_STATUSES.VERIFIED : VERIFICATION_STATUSES.UNVERIFIED,
    mergedIntoPersonId: null,
    mergeHistory: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  await writeAudit({
    action: "identity.created",
    forgePersonId: personId,
    forgeDepartmentId: payload.forgeDepartmentId,
    details: { sourceSystem, femaSidStatus: femaStatus },
  });
  return { identity: { id: personId, ...payload }, created: true, review: null };
}

/** @param {string} forgePersonId @param {Record<string, unknown>} patch */
export async function patchPersonIdentity(forgePersonId, patch) {
  const ref = await getIdentityRef(forgePersonId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const next = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const key of [
    "rmsPersonId",
    "academyStudentId",
    "forgeAcademyStudentId",
    "forgeDepartmentId",
    "firstName",
    "lastName",
    "dateOfBirth",
    "status",
    "employmentStatus",
  ]) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }

  // personId / forgePersonId are immutable — never accept client/patch overrides.
  if (patch.femaSid !== undefined) {
    throw new Error("FEMA SID cannot be patched directly. Use the FEMA SID correction workflow.");
  }
  if (patch.personId !== undefined || patch.forgePersonId !== undefined) {
    throw new Error("personId is immutable and cannot be edited.");
  }

  if (patch.email) {
    const email = normalizeEmail(patch.email);
    const emails = new Set(snap.data()?.emails ?? []);
    emails.add(email);
    next.emails = [...emails];
  }
  await ref.set(next, { merge: true });
  const updated = await ref.get();
  return mapIdentity(updated);
}

async function enqueueDuplicateReview(input) {
  const ref = db().collection(COLLECTIONS.duplicateReviews).doc();
  const row = {
    ...input,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(row);
  await writeAudit({
    action: "identity.duplicate_review_queued",
    forgePersonId: input.candidateIds?.[0] || null,
    details: { reviewId: ref.id, reason: input.reason },
  });
  return { id: ref.id, ...row };
}

/** @param {string} forgeDepartmentId */
export async function listDepartmentPersonnel(forgeDepartmentId) {
  const snap = await db()
    .collection(COLLECTIONS.identities)
    .where("forgeDepartmentId", "==", forgeDepartmentId)
    .limit(500)
    .get();
  return snap.docs
    .map((doc) => mapIdentity(doc))
    .filter((row) => row && row.verificationStatus !== VERIFICATION_STATUSES.MERGED_AWAY);
}

/**
 * @param {string} personId
 * @param {{ actor?: string, evidence?: string, verifyFemaSid?: boolean }} options
 */
export async function verifyIdentity(personId, options = {}) {
  const identity = await getPersonIdentity(personId);
  if (!identity) return null;
  if (identity.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY) {
    throw new Error("Cannot verify a merged-away identity. Follow mergedIntoPersonId.");
  }

  const patch = {
    verificationStatus: VERIFICATION_STATUSES.VERIFIED,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (options.verifyFemaSid !== false && identity.femaSidNormalized) {
    // Ensure no other verified holder of this SID
    const clash = await db()
      .collection(COLLECTIONS.identities)
      .where("femaSidNormalized", "==", identity.femaSidNormalized)
      .where("femaSidStatus", "==", FEMA_SID_STATUSES.VERIFIED)
      .limit(5)
      .get();
    const others = clash.docs.filter((d) => d.id !== identity.personId);
    if (others.length) {
      throw new Error("Another identity already has this FEMA SID verified. Resolve duplicates first.");
    }
    patch.femaSidStatus = FEMA_SID_STATUSES.VERIFIED;
  }

  await (await getIdentityRef(identity.personId)).set(patch, { merge: true });
  await writeAudit({
    action: "identity.verified",
    forgePersonId: identity.personId,
    user: options.actor || "system",
    details: { evidence: options.evidence || null, verifyFemaSid: options.verifyFemaSid !== false },
  });
  return getPersonIdentity(identity.personId);
}

/**
 * @param {string} personId
 * @param {{ newFemaSid: string, reason: string, actor?: string }} input
 */
export async function requestFemaSidCorrection(personId, input) {
  const identity = await getPersonIdentity(personId);
  if (!identity) throw new Error("Identity not found.");
  if (identity.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY) {
    throw new Error("Cannot correct FEMA SID on a merged-away identity.");
  }

  const fema = normalizeFemaSid(input.newFemaSid);
  if (!fema.ok) throw new Error(fema.error);
  const reason = normalize(input.reason);
  if (!reason) throw new Error("reason is required.");

  const ref = db().collection(COLLECTIONS.femaSidCorrections).doc();
  const row = {
    personId: identity.personId,
    forgePersonId: identity.personId,
    previousFemaSid: identity.femaSid || null,
    previousFemaSidNormalized: identity.femaSidNormalized || null,
    newFemaSid: fema.display,
    newFemaSidNormalized: fema.normalized,
    reason,
    status: "pending",
    requestedBy: input.actor || "system",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(row);
  await writeAudit({
    action: "identity.fema_sid_correction_requested",
    forgePersonId: identity.personId,
    user: input.actor || "system",
    details: { correctionId: ref.id, newFemaSidNormalized: fema.normalized, reason },
  });
  return { id: ref.id, ...row };
}

/** @param {string} correctionId @param {{ actor?: string }} [options] */
export async function approveFemaSidCorrection(correctionId, options = {}) {
  const ref = db().doc(`${COLLECTIONS.femaSidCorrections}/${correctionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Correction not found.");
  const data = snap.data() || {};
  if (data.status !== "pending") throw new Error(`Correction is ${data.status}, not pending.`);

  const personId = normalize(data.personId || data.forgePersonId);
  const identity = await getPersonIdentity(personId);
  if (!identity) throw new Error("Identity not found.");

  const normalized = normalize(data.newFemaSidNormalized);
  const holders = await db()
    .collection(COLLECTIONS.identities)
    .where("femaSidNormalized", "==", normalized)
    .where("femaSidStatus", "==", FEMA_SID_STATUSES.VERIFIED)
    .limit(5)
    .get();
  const conflict = holders.docs.find((d) => d.id !== personId);
  if (conflict) {
    throw new Error(
      `Cannot approve: person ${conflict.id} already holds verified FEMA SID ${normalized}.`,
    );
  }

  await (await getIdentityRef(personId)).set(
    {
      femaSid: normalize(data.newFemaSid) || normalized,
      femaSidNormalized: normalized,
      femaSidStatus: FEMA_SID_STATUSES.VERIFIED,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ref.set(
    {
      status: "approved",
      approvedBy: options.actor || "system",
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit({
    action: "identity.fema_sid_correction_approved",
    forgePersonId: personId,
    user: options.actor || "system",
    details: {
      correctionId,
      previousFemaSidNormalized: data.previousFemaSidNormalized,
      newFemaSidNormalized: normalized,
    },
  });
  return { correction: { id: correctionId, ...(await ref.get()).data() }, identity: await getPersonIdentity(personId) };
}

/** @param {string} correctionId @param {{ actor?: string, reason?: string }} [options] */
export async function rejectFemaSidCorrection(correctionId, options = {}) {
  const ref = db().doc(`${COLLECTIONS.femaSidCorrections}/${correctionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Correction not found.");
  const data = snap.data() || {};
  if (data.status !== "pending") throw new Error(`Correction is ${data.status}, not pending.`);

  await ref.set(
    {
      status: "rejected",
      rejectedBy: options.actor || "system",
      rejectionReason: normalize(options.reason) || null,
      rejectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAudit({
    action: "identity.fema_sid_correction_rejected",
    forgePersonId: data.personId || data.forgePersonId || null,
    user: options.actor || "system",
    details: { correctionId, reason: options.reason || null },
  });
  return { id: correctionId, ...(await ref.get()).data() };
}

/**
 * @param {{
 *   survivorPersonId: string,
 *   loserPersonId: string,
 *   reviewId?: string|null,
 *   actor?: string,
 *   reason?: string,
 * }} input
 */
export async function mergeIdentities(input) {
  const survivorPersonId = normalize(input.survivorPersonId);
  const loserPersonId = normalize(input.loserPersonId);
  if (!survivorPersonId || !loserPersonId) throw new Error("survivorPersonId and loserPersonId are required.");
  if (survivorPersonId === loserPersonId) throw new Error("Cannot merge an identity into itself.");

  const survivor = await getPersonIdentity(survivorPersonId);
  const loser = await getPersonIdentity(loserPersonId);
  if (!survivor || !loser) throw new Error("Survivor and loser identities are required.");
  if (survivor.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY) {
    throw new Error("Survivor is already merged away.");
  }
  if (loser.verificationStatus === VERIFICATION_STATUSES.MERGED_AWAY) {
    throw new Error("Loser is already merged away.");
  }

  const emails = [...new Set([...(survivor.emails || []), ...(loser.emails || [])])];
  const survivorPatch = {
    emails,
    rmsPersonId: survivor.rmsPersonId || loser.rmsPersonId || null,
    academyStudentId: survivor.academyStudentId || loser.academyStudentId || null,
    forgeAcademyStudentId: survivor.forgeAcademyStudentId || loser.forgeAcademyStudentId || null,
    forgeDepartmentId: survivor.forgeDepartmentId || loser.forgeDepartmentId || null,
    firstName: survivor.firstName || loser.firstName || null,
    lastName: survivor.lastName || loser.lastName || null,
    dateOfBirth: survivor.dateOfBirth || loser.dateOfBirth || null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Prefer verified FEMA SID from either side without inventing a dual-verified conflict.
  if (survivor.femaSidNormalized) {
    // keep survivor
  } else if (loser.femaSidNormalized) {
    survivorPatch.femaSid = loser.femaSid;
    survivorPatch.femaSidNormalized = loser.femaSidNormalized;
    survivorPatch.femaSidStatus = loser.femaSidStatus || FEMA_SID_STATUSES.UNVERIFIED;
  }

  const mergeEntry = {
    at: new Date().toISOString(),
    survivorPersonId,
    loserPersonId,
    reviewId: input.reviewId || null,
    actor: input.actor || "system",
    reason: normalize(input.reason) || "manual_merge",
  };

  const mergeRef = db().collection(COLLECTIONS.identityMerges).doc();
  await mergeRef.set({
    ...mergeEntry,
    mergeId: mergeRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  const survivorHistory = [...(survivor.mergeHistory || []), mergeEntry];
  const loserHistory = [...(loser.mergeHistory || []), mergeEntry];

  await (await getIdentityRef(survivorPersonId)).set(
    {
      ...survivorPatch,
      mergeHistory: survivorHistory,
      verificationStatus:
        survivor.verificationStatus === VERIFICATION_STATUSES.VERIFIED ||
        loser.verificationStatus === VERIFICATION_STATUSES.VERIFIED
          ? VERIFICATION_STATUSES.VERIFIED
          : survivor.verificationStatus || VERIFICATION_STATUSES.UNVERIFIED,
    },
    { merge: true },
  );

  await (await getIdentityRef(loserPersonId)).set(
    {
      verificationStatus: VERIFICATION_STATUSES.MERGED_AWAY,
      mergedIntoPersonId: survivorPersonId,
      mergeHistory: loserHistory,
      status: "inactive",
      femaSidStatus:
        loser.femaSidStatus === FEMA_SID_STATUSES.VERIFIED
          ? FEMA_SID_STATUSES.CLEARED
          : loser.femaSidStatus || FEMA_SID_STATUSES.CLEARED,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (input.reviewId) {
    await db()
      .doc(`${COLLECTIONS.duplicateReviews}/${input.reviewId}`)
      .set(
        {
          status: "resolved",
          resolution: "merge",
          survivorPersonId,
          loserPersonId,
          resolvedBy: input.actor || "system",
          resolvedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  await writeAudit({
    action: "identity.merged",
    forgePersonId: survivorPersonId,
    user: input.actor || "system",
    details: { mergeId: mergeRef.id, loserPersonId, reviewId: input.reviewId || null },
  });

  return {
    mergeId: mergeRef.id,
    survivor: await getPersonIdentity(survivorPersonId),
    loser: await getPersonIdentity(loserPersonId),
  };
}

/**
 * @param {string} reviewId
 * @param {{
 *   decision: 'merge'|'keep_separate'|'link_existing',
 *   survivorPersonId?: string,
 *   loserPersonId?: string,
 *   linkPersonId?: string,
 *   actor?: string,
 *   reason?: string,
 * }} input
 */
export async function resolveDuplicateReview(reviewId, input) {
  const ref = db().doc(`${COLLECTIONS.duplicateReviews}/${reviewId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Duplicate review not found.");
  const review = snap.data() || {};
  if (review.status !== "pending") throw new Error(`Review is ${review.status}, not pending.`);

  const decision = normalize(input.decision);
  const actor = input.actor || "system";

  if (decision === "merge") {
    const candidates = review.candidateIds || [];
    const survivorPersonId = normalize(input.survivorPersonId) || candidates[0];
    const loserPersonId =
      normalize(input.loserPersonId) || candidates.find((id) => id !== survivorPersonId);
    if (!survivorPersonId || !loserPersonId) {
      throw new Error("merge requires survivorPersonId and loserPersonId.");
    }
    const result = await mergeIdentities({
      survivorPersonId,
      loserPersonId,
      reviewId,
      actor,
      reason: input.reason || review.reason,
    });
    return { decision, ...result };
  }

  if (decision === "keep_separate") {
    await ref.set(
      {
        status: "resolved",
        resolution: "keep_separate",
        resolvedBy: actor,
        resolvedAt: FieldValue.serverTimestamp(),
        resolutionReason: normalize(input.reason) || null,
      },
      { merge: true },
    );
    await writeAudit({
      action: "identity.duplicate_keep_separate",
      user: actor,
      details: { reviewId, reason: input.reason || null },
    });
    return { decision, reviewId };
  }

  if (decision === "link_existing") {
    const linkPersonId = normalize(input.linkPersonId || input.survivorPersonId);
    if (!linkPersonId) throw new Error("link_existing requires linkPersonId.");
    const identity = await getPersonIdentity(linkPersonId, { follow: true });
    if (!identity) throw new Error("linkPersonId not found.");
    const person = review.person || {};
    const linked = await autoLinkFields(identity, person);
    await ref.set(
      {
        status: "resolved",
        resolution: "link_existing",
        linkPersonId,
        resolvedBy: actor,
        resolvedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeAudit({
      action: "identity.duplicate_link_existing",
      forgePersonId: linkPersonId,
      user: actor,
      details: { reviewId },
    });
    return { decision, identity: linked.identity, reviewId };
  }

  throw new Error("decision must be merge, keep_separate, or link_existing.");
}

/** @param {{ status?: string, limit?: number }} [options] */
export async function listDuplicateReviews(options = {}) {
  const status = normalize(options.status) || "pending";
  const limit = Math.min(Number(options.limit) || 50, 200);
  const snap = await db()
    .collection(COLLECTIONS.duplicateReviews)
    .where("status", "==", status)
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** @param {{ status?: string, limit?: number }} [options] */
export async function listFemaSidCorrections(options = {}) {
  const status = normalize(options.status) || "pending";
  const limit = Math.min(Number(options.limit) || 50, 200);
  const snap = await db()
    .collection(COLLECTIONS.femaSidCorrections)
    .where("status", "==", status)
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
