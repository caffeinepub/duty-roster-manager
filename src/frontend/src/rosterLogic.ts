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
  const thirdLayer = staff.filter(
    (s) => s.active && (s.role === "SC" || s.role === "JC"),
  );

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

    // Assign Second Layer
    const eligibleSecond = sortCandidates(secondLayer.filter(isEligible));
    const assignedSecond = eligibleSecond[0] ?? null;

    // Assign Third Layer
    let assignedThird: Staff | null = null;
    if (assignedSecond && assignedSecond.role === "JC") {
      // JC on second layer — avoid third layer
      assignedThird = null;
    } else {
      const eligibleThird = sortCandidates(
        thirdLayer.filter((s) => isEligible(s) && s.id !== assignedSecond?.id),
      );
      assignedThird = eligibleThird[0] ?? null;
    }

    // Update tracking
    if (assignedPG) {
      lastDutyDay.set(assignedPG.id, day);
      dutyCount.set(assignedPG.id, (dutyCount.get(assignedPG.id) ?? 0) + 1);
      if (dayIsHolidayOrPre)
        holidayDutyCount.set(
          assignedPG.id,
          (holidayDutyCount.get(assignedPG.id) ?? 0) + 1,
        );
    }
    if (assignedSecond) {
      lastDutyDay.set(assignedSecond.id, day);
      dutyCount.set(
        assignedSecond.id,
        (dutyCount.get(assignedSecond.id) ?? 0) + 1,
      );
      if (dayIsHolidayOrPre)
        holidayDutyCount.set(
          assignedSecond.id,
          (holidayDutyCount.get(assignedSecond.id) ?? 0) + 1,
        );
    }
    if (assignedThird) {
      lastDutyDay.set(assignedThird.id, day);
      dutyCount.set(
        assignedThird.id,
        (dutyCount.get(assignedThird.id) ?? 0) + 1,
      );
      if (dayIsHolidayOrPre)
        holidayDutyCount.set(
          assignedThird.id,
          (holidayDutyCount.get(assignedThird.id) ?? 0) + 1,
        );
    }

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
  // Rebuild counts for validation
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

    if (!entry.pgId) flags.push("No PG assigned");
    if (!entry.secondLayerId) flags.push("No Second Layer assigned");

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

    const checkFlags = (id: string, _role?: string) => {
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

    checkFlags(entry.pgId, "PG");
    checkFlags(entry.secondLayerId, "Second Layer");
    checkFlags(entry.thirdLayerId, "Third Layer");

    entry.flags = flags;
  }

  return entries;
}
