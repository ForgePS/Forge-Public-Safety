/**
 * Cloud Scheduler entrypoint:
 *   node src/jobs/reconcile.js
 */
import { initStore } from "../store/firestore.js";
import { runReconcile } from "../services/reconcile.js";

initStore();
const report = await runReconcile();
console.log(JSON.stringify(report, null, 2));
