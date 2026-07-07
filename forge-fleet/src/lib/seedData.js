/**
 * Demo seed data for local storage mode.
 * Call seedDemoData() on first load to populate sample records.
 */

const SEED_FLAG = "forge-fleet:seeded";

export function isDemoSeeded() {
  return localStorage.getItem(SEED_FLAG) === "true";
}

export function markDemoSeeded() {
  localStorage.setItem(SEED_FLAG, "true");
}

export function resetDemoData() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("forge-fleet:"));
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

/** @returns {Record<string, Record<string, unknown>>} */
export function getDemoSeedData() {
  const dept1 = "dept-demo-1";
  const station1 = "station-demo-1";
  const station2 = "station-demo-2";
  const apparatus1 = "apparatus-demo-1";
  const apparatus2 = "apparatus-demo-2";
  const apparatus3 = "apparatus-demo-3";
  const module1 = "module-demo-1";
  const module2 = "module-demo-2";
  const schedule1 = "schedule-demo-1";
  const schedule2 = "schedule-demo-2";
  const wo1 = "wo-demo-1";
  const record1 = "record-demo-1";

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const overdue = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    departments: {
      [dept1]: {
        name: "Springfield Fire Department",
        fdid: "47001",
        rmsDepartmentId: "rms-dept-springfield",
        status: "active",
        address: "100 Main St, Springfield, AR",
        phone: "(501) 555-0100",
        notes: "",
        createdAt: now,
        updatedAt: now,
      },
    },
    stations: {
      [station1]: {
        name: "Station 1 — Central",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        rmsStationId: "rms-station-central",
        address: "100 Main St",
        status: "active",
        notes: "",
        createdAt: now,
        updatedAt: now,
      },
      [station2]: {
        name: "Station 2 — North",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        rmsStationId: "rms-station-north",
        address: "450 Oak Ave",
        status: "active",
        notes: "",
        createdAt: now,
        updatedAt: now,
      },
    },
    apparatus: {
      [apparatus1]: {
        unitNumber: "E-1",
        name: "Engine 1",
        type: "engine",
        status: "in_service",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        stationId: station1,
        stationName: "Station 1 — Central",
        rmsApparatusId: "rms-apparatus-e1",
        vin: "1FDXF6PM5KEA12345",
        year: "2019",
        make: "Pierce",
        model: "Enforcer",
        mileage: 45230,
        pumpHours: 1250,
        licensePlate: "FD-E1",
        notes: "Primary response engine",
        createdAt: now,
        updatedAt: now,
      },
      [apparatus2]: {
        unitNumber: "L-2",
        name: "Ladder 2",
        type: "ladder",
        status: "maintenance",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        stationId: station1,
        stationName: "Station 1 — Central",
        rmsApparatusId: "rms-apparatus-l2",
        vin: "1FDXF6PM5KEA67890",
        year: "2017",
        make: "Pierce",
        model: "Arrow XT",
        mileage: 62100,
        pumpHours: 890,
        licensePlate: "FD-L2",
        notes: "Pump seal replacement in progress",
        createdAt: now,
        updatedAt: now,
      },
      [apparatus3]: {
        unitNumber: "R-3",
        name: "Rescue 3",
        type: "rescue",
        status: "out_of_service",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        stationId: station2,
        stationName: "Station 2 — North",
        rmsApparatusId: "rms-apparatus-r3",
        vin: "1FDXF6PM5KEA11111",
        year: "2020",
        make: "Freightliner",
        model: "M2 106",
        mileage: 28400,
        pumpHours: 0,
        licensePlate: "FD-R3",
        notes: "Hydraulic system failure",
        createdAt: now,
        updatedAt: now,
      },
    },
    equipment: {
      "equip-demo-1": {
        name: "SCBA Pack — Scott Air-Pak",
        sku: "SCBA-001",
        serialNumber: "SCBA-2024-001",
        category: "scba",
        status: "active",
        departmentId: dept1,
        departmentName: "Springfield Fire Department",
        stationId: station1,
        stationName: "Station 1 — Central",
        apparatusId: apparatus1,
        apparatusName: "Engine 1",
        manufacturer: "Scott Safety",
        model: "Air-Pak X3 Pro",
        purchaseDate: "2024-01-15",
        warrantyExpiry: "2029-01-15",
        quantity: 4,
        parLevel: 4,
        location: "Engine 1 — Rear Compartment",
        barcode: "SCBA001",
        notes: "",
        createdAt: now,
        updatedAt: now,
      },
    },
    maintenanceModules: {
      [module1]: {
        product: "rms",
        name: "Daily Apparatus Checkoff",
        description: "Pre-shift daily apparatus inspection checklist",
        kind: "checkoff",
        status: "published",
        scope: { roles: ["admin", "maintenance", "driver"], departmentIds: [dept1], stationIds: [], apparatusIds: [] },
        subject: { type: "apparatus", label: "Apparatus", allowMultiple: false },
        sections: [
          {
            id: "section-1",
            title: "General",
            items: [
              { key: "driver", label: "Driver/Operator", type: "text", required: true },
              { key: "date", label: "Date", type: "date", required: true },
              { key: "mileage", label: "Odometer Reading", type: "number", required: true },
            ],
          },
          {
            id: "section-2",
            title: "Engine & Pump",
            items: [
              { key: "oil_level", label: "Oil Level OK", type: "pass_fail", required: true },
              { key: "coolant_level", label: "Coolant Level OK", type: "pass_fail", required: true },
              { key: "pump_primed", label: "Pump Primed & Tested", type: "pass_fail", required: true },
            ],
          },
        ],
        rules: {},
        views: { listColumns: ["date", "driver"], defaultSort: "date", filters: [] },
        createdAt: now,
        updatedAt: now,
      },
      [module2]: {
        product: "rms",
        name: "Annual Pump Test Inspection",
        description: "NFPA 1911 annual pump service test",
        kind: "inspection",
        status: "published",
        scope: { roles: ["admin", "maintenance"], departmentIds: [dept1], stationIds: [], apparatusIds: [] },
        subject: { type: "apparatus", label: "Apparatus", allowMultiple: false },
        sections: [
          {
            id: "section-1",
            title: "Test Information",
            items: [
              { key: "inspector", label: "Certified Inspector", type: "text", required: true },
              { key: "test_date", label: "Test Date", type: "date", required: true },
              { key: "vacuum_test", label: "Vacuum Test Passed", type: "pass_fail", required: true },
            ],
          },
        ],
        rules: {},
        views: { listColumns: ["test_date", "inspector"], defaultSort: "test_date", filters: [] },
        createdAt: now,
        updatedAt: now,
      },
    },
    maintenanceSchedules: {
      [schedule1]: {
        name: "Daily Checkoff — Engine 1",
        moduleId: module1,
        moduleName: "Daily Apparatus Checkoff",
        apparatusId: apparatus1,
        apparatusName: "Engine 1",
        equipmentId: "",
        equipmentName: "",
        frequency: "daily",
        intervalDays: 1,
        intervalMileage: 0,
        intervalHours: 0,
        lastCompletedDate: lastWeek,
        nextDueDate: today,
        lastCompletedMileage: 45100,
        nextDueMileage: 0,
        lastCompletedHours: 0,
        nextDueHours: 0,
        status: "active",
        notes: "",
        createdAt: now,
        updatedAt: now,
      },
      [schedule2]: {
        name: "Annual Pump Test — Ladder 2",
        moduleId: module2,
        moduleName: "Annual Pump Test Inspection",
        apparatusId: apparatus2,
        apparatusName: "Ladder 2",
        equipmentId: "",
        equipmentName: "",
        frequency: "annual",
        intervalDays: 365,
        intervalMileage: 0,
        intervalHours: 0,
        lastCompletedDate: lastMonth,
        nextDueDate: overdue,
        lastCompletedMileage: 61000,
        nextDueMileage: 0,
        lastCompletedHours: 0,
        nextDueHours: 0,
        status: "active",
        notes: "OVERDUE",
        createdAt: now,
        updatedAt: now,
      },
    },
    workOrders: {
      [wo1]: {
        workOrderNumber: "WO-2026-1001",
        title: "Pump seal replacement — Ladder 2",
        description: "Replace main pump seal and inspect packing.",
        type: "corrective",
        priority: "high",
        status: "in_progress",
        apparatusId: apparatus2,
        apparatusName: "Ladder 2",
        equipmentId: "",
        equipmentName: "",
        scheduleId: "",
        moduleId: "",
        assignedTo: "tech-001",
        assignedToName: "Mike Thompson",
        reportedBy: "admin-001",
        reportedByName: "Chief Anderson",
        rmsPersonId: "rms-person-thompson",
        openedDate: lastWeek,
        dueDate: nextWeek,
        completedDate: "",
        estimatedCost: 2500,
        actualCost: 0,
        vendor: "Pierce Service Center",
        notes: "Parts ordered",
        createdAt: now,
        updatedAt: now,
      },
    },
    maintenanceRecords: {
      [record1]: {
        moduleId: module1,
        moduleName: "Daily Apparatus Checkoff",
        moduleKind: "checkoff",
        apparatusId: apparatus1,
        apparatusName: "Engine 1",
        equipmentId: "",
        equipmentName: "",
        workOrderId: "",
        scheduleId: schedule1,
        status: "approved",
        performedBy: "driver-001",
        performedByName: "John Smith",
        rmsPersonId: "rms-person-smith",
        performedDate: lastWeek,
        mileageAtService: 45100,
        hoursAtService: 0,
        values: {
          driver: "John Smith",
          date: lastWeek,
          mileage: 45100,
          oil_level: true,
          coolant_level: true,
          pump_primed: true,
        },
        notes: "All systems nominal",
        passed: true,
        createdAt: now,
        updatedAt: now,
      },
    },
    maintenanceAuditLog: {
      "audit-demo-1": {
        action: "created",
        entityType: "workOrder",
        entityId: wo1,
        entityLabel: "WO-2026-1001",
        actorName: "Chief Anderson",
        actorUid: "admin-001",
        details: "Work order opened for Ladder 2",
        timestamp: lastWeek,
        createdAt: now,
        updatedAt: now,
      },
    },
  };
}

export async function seedDemoData() {
  if (isDemoSeeded()) return false;

  const seedData = getDemoSeedData();
  for (const [collection, records] of Object.entries(seedData)) {
    localStorage.setItem(`forge-fleet:${collection}`, JSON.stringify(records));
  }
  markDemoSeeded();
  return true;
}
