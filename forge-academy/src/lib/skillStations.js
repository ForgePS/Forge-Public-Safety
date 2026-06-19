import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} SkillStationRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} templateId
 * @property {string} name
 * @property {string} sessionDate
 * @property {string} location
 */

const stationsRef = collection(db, "skillStations");

function mapStation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    classId: data.classId ?? "",
    templateId: data.templateId ?? "",
    name: data.name ?? "",
    sessionDate: data.sessionDate ?? "",
    location: data.location ?? "",
  };
}

/** @param {string} classId */
export async function listSkillStationsByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(stationsRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapStation(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {Omit<SkillStationRecord, 'id'>} input */
export async function createSkillStation(input) {
  if (!input.classId) throw new Error("Class is required.");
  if (!input.name?.trim()) throw new Error("Station name is required.");

  const docRef = await addDoc(stationsRef, {
    classId: input.classId,
    templateId: input.templateId ?? "",
    name: input.name.trim(),
    sessionDate: input.sessionDate ?? "",
    location: input.location?.trim() ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} stationId */
export async function getSkillStation(stationId) {
  const snap = await getDoc(doc(db, "skillStations", stationId));
  if (!snap.exists()) return null;
  return mapStation(snap.id, snap.data());
}
