// Stub declarations — app uses localStorage only, backend canister is not used
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

export interface LeaveRequest {
  month: bigint;
  staffId: string;
  preferredDutyDates: Array<bigint>;
  year: bigint;
  noDutyDates: Array<bigint>;
  leaveDates: Array<bigint>;
}
export interface Roster {
  month: bigint;
  year: bigint;
  entries: Array<RosterEntry>;
}
export interface RosterEntry {
  day: bigint;
  flags: Array<string>;
  pgId: string;
  thirdLayerId: string;
  manualOverride: boolean;
  secondLayerId: string;
}
export interface Staff {
  id: string;
  active: boolean;
  name: string;
  role: string;
}
export interface StatutoryHoliday {
  day: bigint;
  month: bigint;
  year: bigint;
}
export interface UserProfile {
  staffId: [] | [string];
  name: string;
}
export type UserRole = { admin: null } | { user: null } | { guest: null };

export interface _SERVICE {
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  addHoliday: ActorMethod<[StatutoryHoliday], undefined>;
  addStaff: ActorMethod<[Staff], undefined>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], undefined>;
  deleteStaff: ActorMethod<[string], undefined>;
  getCallerUserProfile: ActorMethod<[], [] | [UserProfile]>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  getLeaveRequest: ActorMethod<[string, bigint, bigint], [] | [LeaveRequest]>;
  getMonthStats: ActorMethod<[bigint, bigint], Array<[string, bigint]>>;
  getRoster: ActorMethod<[bigint, bigint], [] | [Roster]>;
  getUserProfile: ActorMethod<[Principal], [] | [UserProfile]>;
  isCallerAdmin: ActorMethod<[], boolean>;
  listHolidays: ActorMethod<[bigint, bigint], Array<StatutoryHoliday>>;
  listLeaveRequestsForMonth: ActorMethod<[bigint, bigint], Array<LeaveRequest>>;
  listStaff: ActorMethod<[], Array<Staff>>;
  removeHoliday: ActorMethod<[bigint], undefined>;
  saveCallerUserProfile: ActorMethod<[UserProfile], undefined>;
  saveRoster: ActorMethod<[bigint, bigint, Array<RosterEntry>], undefined>;
  updateStaff: ActorMethod<[Staff], undefined>;
  upsertLeaveRequest: ActorMethod<[LeaveRequest], undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idlFactory: any = () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const init: any = () => {};
