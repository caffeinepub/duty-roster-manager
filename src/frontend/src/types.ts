export type Role = "PG" | "Registrar" | "JC" | "SC";

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
}

export interface LeaveEntry {
  id: string;
  staffId: string;
  dates: string[];
}

export interface NodutyRequest {
  id: string;
  staffId: string;
  dates: string[];
}

export interface DutyRequest {
  id: string;
  staffId: string;
  dates: string[];
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface RosterDay {
  date: string;
  dayOfWeek: string;
  pg: string | null;
  registrarJC: string | null;
  seniorConsultant: string | null;
  flags: string[];
}

export interface RosterOverride {
  [dateSlot: string]: string | null; // key = "YYYY-MM-DD_pg" | "YYYY-MM-DD_reg" | "YYYY-MM-DD_sc"
}
