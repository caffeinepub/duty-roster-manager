import type {
  LeaveRequest,
  RosterEntry,
  Staff,
  StatutoryHoliday,
} from "./backend.d";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  return new Date(year, month - 1, day).getDay();
}

export function generateRoster(
  year: number,
  month: number,
  staff: Staff[],
  leaveRequests: LeaveRequest[],
  statutoryHolidays: StatutoryHoliday[],
): RosterEntry[] {
  const numDays = getDaysInMonth(year, month);
  const statHolidayDays = new Set(statutoryHolidays.map((h) => Number(h.day)));

  const isHoliday = (day: number): boolean => {
    const dow = getDayOfWeek(year, month, day);
    return dow === 0 || statHolidayDays.has(day); // Sunday or statutory
  };

  const isPreHoliday = (day: number): boolean => {
    const dow = getDayOfWeek(year, month, day);
    if (dow === 6) return true; // Saturday
    // Day before a statutory holiday
    if (statHolidayDays.has(day + 1)) return true;
    return false;
  };

  const isHolidayOrPreHoliday = (day: number): boolean =>
    isHoliday(day) || isPreHoliday(day);

  // Build leave lookup: staffId -> sets of days
  const leaveMap = new Map<
    string,
    { leave: Set<number>; noDuty: Set<number>; preferred: Set<number> }
  >();
  for (const req of leaveRequests) {
    leaveMap.set(req.staffId, {
      leave: new Set(req.leaveDates.map(Number)),
      noDuty: new Set(req.noDutyDates.map(Number)),
      preferred: new Set(req.preferredDutyDates.map(Number)),
    });
  }

  // Separate staff by role
  const pgs = staff.filter((s) => s.active && s.role === "PG");
  const secondLayer = staff.filter(
    (s) => s.active && (s.role === "Registrar" || s.role === "JC"),
  );
  // Third layer: SC or JC — SCs are preferred to avoid JC double-duty
  const thirdLayerSCs = staff.filter((s) => s.active && s.role === "SC");
  const thirdLayerJCs = staff.filter((s) => s.active && s.role === "JC");

  // Track state per person
  const lastDutyDay = new Map<string, number>();
  const dutyCount = new Map<string, number>();
  const holidayDutyCount = new Map<string, number>();

  for (const s of staff) {
    lastDutyDay.set(s.id, -99);
    dutyCount.set(s.id, 0);
    holidayDutyCount.set(s.id, 0);
  }

  const entries: RosterEntry[] = [];

  for (let day = 1; day <= numDays; day++) {
    const dayIsHolidayOrPre = isHolidayOrPreHoliday(day);

    const getLeave = (id: string) =>
      leaveMap.get(id) ?? {
        leave: new Set<number>(),
        noDuty: new Set<number>(),
        preferred: new Set<number>(),
      };

    const isEligible = (s: Staff): boolean => {
      const l = getLeave(s.id);
      if (l.leave.has(day)) return false;
      const last = lastDutyDay.get(s.id) ?? -99;
      if (day - last <= 2) return false;
      if ((dutyCount.get(s.id) ?? 0) >= 6) return false;
      if (dayIsHolidayOrPre && (holidayDutyCount.get(s.id) ?? 0) >= 1)
        return false;
      return true;
    };

    const sortCandidates = (candidates: Staff[]): Staff[] => {
      return candidates.slice().sort((a, b) => {
        const dcA = dutyCount.get(a.id) ?? 0;
        const dcB = dutyCount.get(b.id) ?? 0;
        if (dcA !== dcB) return dcA - dcB;
        // Prefer requested duty days
        const prefA = getLeave(a.id).preferred.has(day) ? -1 : 0;
        const prefB = getLeave(b.id).preferred.has(day) ? -1 : 0;
        return prefA - prefB;
      });
    };

    // Assign PG
    const eligiblePGs = sortCandidates(pgs.filter(isEligible));
    const assignedPG = eligiblePGs[0] ?? null;

    // Assign Second Layer (Registrar or JC)
    const eligibleSecond = sortCandidates(secondLayer.filter(isEligible));
    const assignedSecond = eligibleSecond[0] ?? null;

    // Assign Third Layer (SC or JC) — MANDATORY every day.
    // Prefer SCs first to avoid JC double-duty.
    // Exclude anyone already assigned to second layer.
    const excludeId = assignedSecond?.id;
    const eligibleSCsForThird = sortCandidates(
      thirdLayerSCs.filter((s) => isEligible(s) && s.id !== excludeId),
    );
    let assignedThird: Staff | null = eligibleSCsForThird[0] ?? null;

    if (!assignedThird) {
      // No SC available — fall back to JC (different person from second layer)
      const eligibleJCsForThird = sortCandidates(
        thirdLayerJCs.filter((s) => isEligible(s) && s.id !== excludeId),
      );
      assignedThird = eligibleJCsForThird[0] ?? null;
    }

    // Update tracking
    const updateTracking = (s: Staff | null) => {
      if (!s) return;
      lastDutyDay.set(s.id, day);
      dutyCount.set(s.id, (dutyCount.get(s.id) ?? 0) + 1);
      if (dayIsHolidayOrPre)
        holidayDutyCount.set(s.id, (holidayDutyCount.get(s.id) ?? 0) + 1);
    };
    updateTracking(assignedPG);
    updateTracking(assignedSecond);
    updateTracking(assignedThird);

    entries.push({
      day: BigInt(day),
      pgId: assignedPG?.id ?? "",
      secondLayerId: assignedSecond?.id ?? "",
      thirdLayerId: assignedThird?.id ?? "",
      flags: [],
      manualOverride: false,
    });
  }

  // Validation pass
  const finalDutyCounts = new Map<string, number>();
  const finalHolidayCounts = new Map<string, number>();
  const allAssigned: Array<{ day: number; staffId: string }> = [];

  for (const entry of entries) {
    const day = Number(entry.day);
    const dayIsHOP = isHolidayOrPreHoliday(day);
    for (const id of [entry.pgId, entry.secondLayerId, entry.thirdLayerId]) {
      if (!id) continue;
      finalDutyCounts.set(id, (finalDutyCounts.get(id) ?? 0) + 1);
      if (dayIsHOP)
        finalHolidayCounts.set(id, (finalHolidayCounts.get(id) ?? 0) + 1);
      allAssigned.push({ day, staffId: id });
    }
  }

  const staffById = new Map(staff.map((s) => [s.id, s]));

  for (const entry of entries) {
    const day = Number(entry.day);
    const flags: string[] = [];

    // Hard coverage rules — all three layers are mandatory
    if (!entry.pgId) flags.push("No PG assigned");
    if (!entry.secondLayerId)
      flags.push("No Second Layer (Registrar/JC) assigned");
    if (!entry.thirdLayerId)
      flags.push("No Third Layer (Senior Consultant) assigned");

    // JC double duty
    if (
      entry.secondLayerId &&
      entry.thirdLayerId &&
      entry.secondLayerId === entry.thirdLayerId
    ) {
      const name =
        staffById.get(entry.secondLayerId)?.name ?? entry.secondLayerId;
      flags.push(`JC double duty: ${name} is on both Second and Third Layer`);
    }

    const checkFlags = (id: string) => {
      if (!id) return;
      const s = staffById.get(id);
      const name = s?.name ?? id;
      const l = leaveMap.get(id) ?? {
        leave: new Set<number>(),
        noDuty: new Set<number>(),
        preferred: new Set<number>(),
      };

      if (l.leave.has(day))
        flags.push(`Assigned despite leave: ${name} is on leave`);
      if (l.noDuty.has(day))
        flags.push(
          `Assigned despite no-duty request: ${name} requested no duty`,
        );

      const duties = allAssigned.filter((a) => a.staffId === id);
      const prevDuties = duties.filter((a) => a.day < day);
      for (const prev of prevDuties) {
        const gap = day - prev.day;
        if (gap > 0 && gap <= 2) {
          flags.push(
            `Gap violation: ${name} had duty ${gap} day${gap > 1 ? "s" : ""} ago`,
          );
          break;
        }
      }

      const total = finalDutyCounts.get(id) ?? 0;
      if (total > 6)
        flags.push(
          `Max duties exceeded: ${name} has ${total} duties this month`,
        );

      const hCount = finalHolidayCounts.get(id) ?? 0;
      if (hCount > 1 && isHolidayOrPreHoliday(day)) {
        flags.push(
          `Holiday duty limit: ${name} already has a holiday/pre-holiday duty`,
        );
      }
    };

    checkFlags(entry.pgId);
    checkFlags(entry.secondLayerId);
    checkFlags(entry.thirdLayerId);

    entry.flags = flags;
  }

  return entries;
}
