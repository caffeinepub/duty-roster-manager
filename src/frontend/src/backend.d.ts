import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RosterEntry {
    day: bigint;
    flags: Array<string>;
    pgId: string;
    thirdLayerId: string;
    manualOverride: boolean;
    secondLayerId: string;
}
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
    staffId?: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addHoliday(holiday: StatutoryHoliday): Promise<void>;
    addStaff(staff: Staff): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteStaff(staffId: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLeaveRequest(staffId: string, year: bigint, month: bigint): Promise<LeaveRequest | null>;
    getMonthStats(year: bigint, month: bigint): Promise<Array<[string, bigint]>>;
    getRoster(year: bigint, month: bigint): Promise<Roster | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listHolidays(year: bigint, month: bigint): Promise<Array<StatutoryHoliday>>;
    listLeaveRequestsForMonth(year: bigint, month: bigint): Promise<Array<LeaveRequest>>;
    listStaff(): Promise<Array<Staff>>;
    removeHoliday(holidayId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveRoster(year: bigint, month: bigint, entries: Array<RosterEntry>): Promise<void>;
    updateStaff(staff: Staff): Promise<void>;
    upsertLeaveRequest(leaveRequest: LeaveRequest): Promise<void>;
}
