import type {
  DutyRequest,
  Holiday,
  LeaveEntry,
  NodutyRequest,
  RosterDay,
  StaffMember,
} from "./types";

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function generateRoster(
  year: number,
  month: number,
  staff: StaffMember[],
  leaves: LeaveEntry[],
  noduty: NodutyRequest[],
  dutyrequests: DutyRequest[],
  holidays: Holiday[],
  overrides: { [dateSlot: string]: string | null },
): RosterDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build lookup sets
  const holidayDates = new Set(holidays.map((h) => h.date));

  const leaveMap = new Map<string, Set<string>>();
  for (const l of leaves) {
    if (!leaveMap.has(l.staffId)) leaveMap.set(l.staffId, new Set());
    for (const d of l.dates) leaveMap.get(l.staffId)!.add(d);
  }

  const nodutyMap = new Map<string, Set<string>>();
  for (const n of noduty) {
    if (!nodutyMap.has(n.staffId)) nodutyMap.set(n.staffId, new Set());
    for (const d of n.dates) nodutyMap.get(n.staffId)!.add(d);
  }

  const dutyReqMap = new Map<string, Set<string>>();
  for (const r of dutyrequests) {
    if (!dutyReqMap.has(r.staffId)) dutyReqMap.set(r.staffId, new Set());
    for (const d of r.dates) dutyReqMap.get(r.staffId)!.add(d);
  }

  const staffById = new Map(staff.map((s) => [s.id, s]));

  const isHolidayDate = (date: string): boolean => {
    const dow = new Date(`${date}T00:00:00`).getDay();
    return dow === 0 || holidayDates.has(date);
  };

  const isPreHolidayDate = (date: string): boolean => {
    const d = new Date(`${date}T00:00:00`);
    const dow = d.getDay();
    if (dow === 6) return true; // Saturday is always pre-holiday
    // Day before a holiday
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextISO = toISO(
      nextDay.getFullYear(),
      nextDay.getMonth() + 1,
      nextDay.getDate(),
    );
    return isHolidayDate(nextISO);
  };

  // Track state for algorithm
  const lastDutyDate = new Map<string, string | null>();
  const dutyCount = new Map<string, number>();
  const holidayDutyCount = new Map<string, number>();
  const fridayDutyCount = new Map<string, number>();
  const saturdayDutyCount = new Map<string, number>();
  // Track JC appearances in the second layer (Registrar/JC slot)
  const jcLayer2Count = new Map<string, number>();

  for (const s of staff) {
    lastDutyDate.set(s.id, null);
    dutyCount.set(s.id, 0);
    holidayDutyCount.set(s.id, 0);
    fridayDutyCount.set(s.id, 0);
    saturdayDutyCount.set(s.id, 0);
    if (s.role === "JC") jcLayer2Count.set(s.id, 0);
  }

  const daysBetween = (a: string, b: string): number => {
    const da = new Date(`${a}T00:00:00`);
    const db = new Date(`${b}T00:00:00`);
    return Math.abs(Math.round((db.getTime() - da.getTime()) / 86400000));
  };

  const isOnLeave = (s: StaffMember, date: string): boolean =>
    leaveMap.get(s.id)?.has(date) ?? false;

  const hasGap = (s: StaffMember, date: string): boolean => {
    const last = lastDutyDate.get(s.id);
    if (!last) return true;
    return daysBetween(last, date) >= 2;
  };

  const withinHolLimit = (s: StaffMember): boolean =>
    (holidayDutyCount.get(s.id) ?? 0) < 1;

  const withinFridayLimit = (s: StaffMember): boolean =>
    (fridayDutyCount.get(s.id) ?? 0) < 1;

  const withinSaturdayLimit = (s: StaffMember): boolean =>
    (saturdayDutyCount.get(s.id) ?? 0) < 1;

  const isEligible = (
    s: StaffMember,
    date: string,
    isHolOrPre: boolean,
    excludeIds?: string[],
    isFriday?: boolean,
    isSaturday?: boolean,
  ): boolean => {
    if (excludeIds?.includes(s.id)) return false;
    if (isOnLeave(s, date)) return false;
    if (!hasGap(s, date)) return false;
    if (isHolOrPre && !withinHolLimit(s)) return false;
    if (isFriday && !withinFridayLimit(s)) return false;
    if (isSaturday && !withinSaturdayLimit(s)) return false;
    return true;
  };

  // forLayer2: when true, JC candidates are sorted by jcLayer2Count first
  const sortByFairness = (
    candidates: StaffMember[],
    date: string,
    isFriday?: boolean,
    forLayer2?: boolean,
  ): StaffMember[] => {
    return candidates.slice().sort((a, b) => {
      // Duty requests get priority
      const reqA = dutyReqMap.get(a.id)?.has(date) ? -2 : 0;
      const reqB = dutyReqMap.get(b.id)?.has(date) ? -2 : 0;
      if (reqA !== reqB) return reqA - reqB;
      // No-duty requests deprioritized
      const ndA = nodutyMap.get(a.id)?.has(date) ? 1 : 0;
      const ndB = nodutyMap.get(b.id)?.has(date) ? 1 : 0;
      if (ndA !== ndB) return ndA - ndB;
      // For layer 2 slot: if both are JCs, sort by jcLayer2Count first
      if (forLayer2 && a.role === "JC" && b.role === "JC") {
        const l2A = jcLayer2Count.get(a.id) ?? 0;
        const l2B = jcLayer2Count.get(b.id) ?? 0;
        if (l2A !== l2B) return l2A - l2B;
      }
      // For Fridays: prefer those with fewer Friday duties (equal distribution)
      if (isFriday) {
        const fdA = fridayDutyCount.get(a.id) ?? 0;
        const fdB = fridayDutyCount.get(b.id) ?? 0;
        if (fdA !== fdB) return fdA - fdB;
      }
      // Fewest duties first
      return (dutyCount.get(a.id) ?? 0) - (dutyCount.get(b.id) ?? 0);
    });
  };

  // Fallback assignment: tries progressively relaxed constraints
  // excludeIds: array of staff IDs to exclude from pool
  const assignWithFallback = (
    pool: StaffMember[],
    date: string,
    isHolOrPre: boolean,
    excludeIds: string[],
    slotLabel: string,
    isFriday?: boolean,
    isSaturday?: boolean,
    forLayer2?: boolean,
  ): { id: string; name: string; extraFlags: string[] } | null => {
    const available = pool.filter(
      (s) => !excludeIds.includes(s.id) && !isOnLeave(s, date),
    );
    if (available.length === 0) return null;

    const extraFlags: string[] = [];

    // Try 1: fully eligible (includes Friday/Saturday limits)
    const fully = sortByFairness(
      available.filter(
        (s) =>
          hasGap(s, date) &&
          (!isHolOrPre || withinHolLimit(s)) &&
          (!isFriday || withinFridayLimit(s)) &&
          (!isSaturday || withinSaturdayLimit(s)),
      ),
      date,
      isFriday,
      forLayer2,
    );
    if (fully.length > 0) {
      return { id: fully[0].id, name: fully[0].name, extraFlags };
    }

    // Try 2: ignore Friday/Saturday limit (but keep other constraints)
    const ignoreFriSat = sortByFairness(
      available.filter(
        (s) => hasGap(s, date) && (!isHolOrPre || withinHolLimit(s)),
      ),
      date,
      isFriday,
      forLayer2,
    );
    if (ignoreFriSat.length > 0) {
      const chosen = ignoreFriSat[0];
      if (isFriday) extraFlags.push(`${chosen.name}: second Friday duty`);
      if (isSaturday) extraFlags.push(`${chosen.name}: second Saturday duty`);
      return { id: chosen.id, name: chosen.name, extraFlags };
    }

    // Try 3: ignore holiday duty count limit
    const ignoreHol = sortByFairness(
      available.filter((s) => hasGap(s, date)),
      date,
      isFriday,
      forLayer2,
    );
    if (ignoreHol.length > 0) {
      const chosen = ignoreHol[0];
      extraFlags.push(`${chosen.name}: holiday duty override`);
      return { id: chosen.id, name: chosen.name, extraFlags };
    }

    // Try 4: ignore gap constraint
    const ignoreGap = sortByFairness(
      available.filter((s) => !isHolOrPre || withinHolLimit(s)),
      date,
      isFriday,
      forLayer2,
    );
    if (ignoreGap.length > 0) {
      const chosen = ignoreGap[0];
      extraFlags.push(`${chosen.name}: gap override`);
      return { id: chosen.id, name: chosen.name, extraFlags };
    }

    // Try 5: ignore all constraints except leave
    const anyAvailable = sortByFairness(available, date, isFriday, forLayer2);
    const chosen = anyAvailable[0];
    extraFlags.push(`${slotLabel} forced assignment`);
    return { id: chosen.id, name: chosen.name, extraFlags };
  };

  const pgs = staff.filter((s) => s.role === "PG");
  const registrarsJCs = staff.filter(
    (s) => s.role === "Registrar" || s.role === "JC",
  );
  const scsJCs = staff.filter((s) => s.role === "SC" || s.role === "JC");

  const roster: RosterDay[] = [];

  // Track dates where a JC is covering the second layer (Registrar/JC slot)
  const jcInLayer2Dates = new Set<string>();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = toISO(year, month, d);
    const jsDate = new Date(`${date}T00:00:00`);
    const dow = jsDate.getDay();
    const dayOfWeek = DOW_NAMES[dow];
    const isHolOrPre = isHolidayDate(date) || isPreHolidayDate(date);
    const isFriday = dow === 5;
    const isSaturday = dow === 6;

    // Check overrides first
    const overridePg = overrides[`${date}_pg`];
    const overrideReg = overrides[`${date}_reg`];
    const overrideSc = overrides[`${date}_sc`];

    const dayFlags: string[] = [];

    // Assign PG
    let pgName: string | null = null;
    let pgId: string | null = null;
    if (overridePg !== undefined) {
      pgName = overridePg;
      pgId = staff.find((s) => s.name === overridePg)?.id ?? null;
    } else {
      const result = assignWithFallback(
        pgs,
        date,
        isHolOrPre,
        [],
        "PG",
        isFriday,
        isSaturday,
      );
      if (result) {
        pgId = result.id;
        pgName = result.name;
        dayFlags.push(...result.extraFlags);
      }
    }

    // Assign Registrar/JC (layer 2) — sort JCs by jcLayer2Count for equal distribution
    let regName: string | null = null;
    let regId: string | null = null;
    if (overrideReg !== undefined) {
      regName = overrideReg;
      regId = staff.find((s) => s.name === overrideReg)?.id ?? null;
    } else {
      const result = assignWithFallback(
        registrarsJCs,
        date,
        isHolOrPre,
        pgId ? [pgId] : [],
        "Registrar/JC",
        isFriday,
        isSaturday,
        true, // forLayer2: enable JC layer-2 fairness sorting
      );
      if (result) {
        regId = result.id;
        regName = result.name;
        dayFlags.push(...result.extraFlags);
      }
    }

    // Determine if a JC or Registrar is covering layer 2
    const regStaff = regId ? staffById.get(regId) : null;
    const jcCoversLayer2 = regStaff?.role === "JC";
    const registrarCoversLayer2 = regStaff?.role === "Registrar";
    if (jcCoversLayer2) jcInLayer2Dates.add(date);

    // Update jcLayer2Count for the assigned person if they are a JC and no override
    if (overrideReg === undefined && regId && jcCoversLayer2) {
      jcLayer2Count.set(regId, (jcLayer2Count.get(regId) ?? 0) + 1);
    }

    // Assign SC (layer 3)
    // HARD RULE: When a Registrar covers layer 2, SC/JC MUST be assigned.
    //            Use assignWithFallback to guarantee someone is always placed.
    //            Clearing SC (overrideSc === null) is only valid when a JC covers layer 2.
    let scName: string | null = null;
    let scId: string | null = null;

    if (overrideSc !== undefined && overrideSc !== null) {
      // Override to a specific person — always allowed
      scName = overrideSc;
      scId = staff.find((s) => s.name === overrideSc)?.id ?? null;
    } else if (overrideSc === null && !registrarCoversLayer2) {
      // Clearing SC is only valid if a JC is covering layer 2
      scName = null;
      scId = null;
    } else {
      // Auto-assign SC if:
      //   (a) no override at all, OR
      //   (b) override tried to clear SC but a Registrar is on duty (override silently dropped)
      if (!jcCoversLayer2) {
        // HARD CONSTRAINT: if Registrar on duty, use assignWithFallback to guarantee assignment
        const excludeIds = [pgId, regId].filter(Boolean) as string[];
        if (registrarCoversLayer2) {
          const result = assignWithFallback(
            scsJCs,
            date,
            isHolOrPre,
            excludeIds,
            "SC (required when Registrar on duty)",
            isFriday,
            isSaturday,
          );
          if (result) {
            scId = result.id;
            scName = result.name;
            dayFlags.push(...result.extraFlags);
          } else {
            // All SC/JC are on leave — flag as error
            dayFlags.push(
              "Missing SC (required when Registrar on duty — all SC/JC unavailable)",
            );
          }
        } else {
          // No Registrar on duty, no JC on layer 2 either (e.g. no one assigned yet)
          // Use best-effort assignment without forced fallback
          const eligible = sortByFairness(
            scsJCs.filter((s) =>
              isEligible(s, date, isHolOrPre, excludeIds, isFriday, isSaturday),
            ),
            date,
            isFriday,
          );
          if (eligible.length > 0) {
            scId = eligible[0].id;
            scName = eligible[0].name;
          }
        }
      }
    }

    // Update tracking
    if (overridePg === undefined && pgId) {
      lastDutyDate.set(pgId, date);
      dutyCount.set(pgId, (dutyCount.get(pgId) ?? 0) + 1);
      if (isHolOrPre)
        holidayDutyCount.set(pgId, (holidayDutyCount.get(pgId) ?? 0) + 1);
      if (isFriday)
        fridayDutyCount.set(pgId, (fridayDutyCount.get(pgId) ?? 0) + 1);
      if (isSaturday)
        saturdayDutyCount.set(pgId, (saturdayDutyCount.get(pgId) ?? 0) + 1);
    }
    if (overrideReg === undefined && regId) {
      lastDutyDate.set(regId, date);
      dutyCount.set(regId, (dutyCount.get(regId) ?? 0) + 1);
      if (isHolOrPre)
        holidayDutyCount.set(regId, (holidayDutyCount.get(regId) ?? 0) + 1);
      if (isFriday)
        fridayDutyCount.set(regId, (fridayDutyCount.get(regId) ?? 0) + 1);
      if (isSaturday)
        saturdayDutyCount.set(regId, (saturdayDutyCount.get(regId) ?? 0) + 1);
    }
    if (overrideSc === undefined && scId) {
      lastDutyDate.set(scId, date);
      dutyCount.set(scId, (dutyCount.get(scId) ?? 0) + 1);
      if (isHolOrPre)
        holidayDutyCount.set(scId, (holidayDutyCount.get(scId) ?? 0) + 1);
      if (isFriday)
        fridayDutyCount.set(scId, (fridayDutyCount.get(scId) ?? 0) + 1);
      if (isSaturday)
        saturdayDutyCount.set(scId, (saturdayDutyCount.get(scId) ?? 0) + 1);
    }

    roster.push({
      date,
      dayOfWeek,
      pg: pgName,
      registrarJC: regName,
      seniorConsultant: scName,
      flags: dayFlags,
    });
  }

  // Validation pass
  const finalDutyCount = new Map<string, number>();
  const finalHolCount = new Map<string, number>();
  const finalFridayCount = new Map<string, number>();
  const finalSaturdayCount = new Map<string, number>();
  const dutyDates = new Map<string, string[]>();

  for (const row of roster) {
    const dow = new Date(`${row.date}T00:00:00`).getDay();
    for (const name of [row.pg, row.registrarJC, row.seniorConsultant]) {
      if (!name) continue;
      finalDutyCount.set(name, (finalDutyCount.get(name) ?? 0) + 1);
      if (isHolidayDate(row.date))
        finalHolCount.set(name, (finalHolCount.get(name) ?? 0) + 1);
      if (dow === 5)
        finalFridayCount.set(name, (finalFridayCount.get(name) ?? 0) + 1);
      if (dow === 6)
        finalSaturdayCount.set(name, (finalSaturdayCount.get(name) ?? 0) + 1);
      if (!dutyDates.has(name)) dutyDates.set(name, []);
      dutyDates.get(name)!.push(row.date);
    }
  }

  for (const row of roster) {
    const flags: string[] = [...row.flags];
    const dow = new Date(`${row.date}T00:00:00`).getDay();

    if (!row.pg) flags.push("Missing PG");
    if (!row.registrarJC) flags.push("Missing Registrar/JC");
    const jcInLayer2 = jcInLayer2Dates.has(row.date);
    if (!row.seniorConsultant && !jcInLayer2) flags.push("Missing SC");

    // Extra safety: if SC is missing but a Registrar is on duty, flag it
    const layer2StaffMember = row.registrarJC
      ? staff.find((s) => s.name === row.registrarJC)
      : null;
    if (!row.seniorConsultant && layer2StaffMember?.role === "Registrar") {
      flags.push("Missing SC (required when Registrar on duty)");
    }

    const checkPerson = (name: string | null) => {
      if (!name) return;
      const count = finalDutyCount.get(name) ?? 0;
      if (count >= 7) flags.push(`${name}: duty count override`);

      // Gap violation
      const dates = dutyDates.get(name) ?? [];
      const idx = dates.indexOf(row.date);
      if (idx > 0) {
        const prev = dates[idx - 1];
        const gap = daysBetween(prev, row.date);
        if (gap < 2) flags.push(`${name}: gap violation`);
      }

      // Holiday overload
      if (isHolidayDate(row.date)) {
        const hCount = finalHolCount.get(name) ?? 0;
        if (hCount > 1) flags.push(`${name}: holiday duty overload`);
      }

      // Friday overload (flag if more than 1 Friday)
      if (dow === 5) {
        const fCount = finalFridayCount.get(name) ?? 0;
        if (fCount > 1) flags.push(`${name}: more than 1 Friday duty`);
      }

      // Saturday overload (flag if more than 1 Saturday)
      if (dow === 6) {
        const sCount = finalSaturdayCount.get(name) ?? 0;
        if (sCount > 1) flags.push(`${name}: more than 1 Saturday duty`);
      }
    };

    checkPerson(row.pg);
    checkPerson(row.registrarJC);
    checkPerson(row.seniorConsultant);

    row.flags = [...new Set(flags)];
  }

  return roster;
}
