import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Keep stable variables from previous version to allow upgrade
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Data Types
  public type Staff = {
    id : Text;
    name : Text;
    role : Text;
    active : Bool;
  };

  public type LeaveRequest = {
    staffId : Text;
    year : Nat;
    month : Nat;
    leaveDates : [Nat];
    noDutyDates : [Nat];
    preferredDutyDates : [Nat];
  };

  public type StatutoryHoliday = {
    year : Nat;
    month : Nat;
    day : Nat;
  };

  public type RosterEntry = {
    day : Nat;
    pgId : Text;
    secondLayerId : Text;
    thirdLayerId : Text;
    flags : [Text];
    manualOverride : Bool;
  };

  public type Roster = {
    year : Nat;
    month : Nat;
    entries : [RosterEntry];
  };

  public type UserProfile = {
    name : Text;
    staffId : ?Text;
  };

  // Internal Storage
  let staffMap = Map.empty<Text, Staff>();
  let leaveRequests = Map.empty<Text, LeaveRequest>();
  let holidays = Map.empty<Nat, StatutoryHoliday>();
  let rosters = Map.empty<Text, Roster>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  func leaveRequestKey(staffId : Text, year : Nat, month : Nat) : Text {
    staffId # "_" # year.toText() # "_" # month.toText();
  };

  func rosterKey(year : Nat, month : Nat) : Text {
    year.toText() # "_" # month.toText();
  };

  // Staff Management - no auth required
  public shared func addStaff(staff : Staff) : async () {
    staffMap.add(staff.id, staff);
  };

  public shared func updateStaff(staff : Staff) : async () {
    staffMap.add(staff.id, staff);
  };

  public shared func deleteStaff(staffId : Text) : async () {
    staffMap.remove(staffId);
  };

  public query func listStaff() : async [Staff] {
    staffMap.values().toArray();
  };

  // Leave Requests - no auth required
  public shared func upsertLeaveRequest(leaveRequest : LeaveRequest) : async () {
    let key = leaveRequestKey(leaveRequest.staffId, leaveRequest.year, leaveRequest.month);
    leaveRequests.add(key, leaveRequest);
  };

  public query func getLeaveRequest(staffId : Text, year : Nat, month : Nat) : async ?LeaveRequest {
    leaveRequests.get(leaveRequestKey(staffId, year, month));
  };

  public query func listLeaveRequestsForMonth(year : Nat, month : Nat) : async [LeaveRequest] {
    leaveRequests.values().toArray().filter(
      func(lr) { lr.year == year and lr.month == month }
    );
  };

  // Holidays - no auth required
  public shared func addHoliday(holiday : StatutoryHoliday) : async () {
    holidays.add(holidays.size() + 1, holiday);
  };

  public shared func removeHoliday(holidayId : Nat) : async () {
    holidays.remove(holidayId);
  };

  public query func listHolidays(year : Nat, month : Nat) : async [StatutoryHoliday] {
    holidays.values().toArray().filter(
      func(h) { h.year == year and h.month == month }
    );
  };

  // Roster Management - no auth required
  public shared func saveRoster(year : Nat, month : Nat, entries : [RosterEntry]) : async () {
    let roster : Roster = { year; month; entries };
    rosters.add(rosterKey(year, month), roster);
  };

  public query func getRoster(year : Nat, month : Nat) : async ?Roster {
    rosters.get(rosterKey(year, month));
  };

  public query func getMonthStats(year : Nat, month : Nat) : async [(Text, Nat)] {
    switch (rosters.get(rosterKey(year, month))) {
      case (null) { [] };
      case (?roster) {
        let dutyCountMap = Map.empty<Text, Nat>();
        for (entry in roster.entries.vals()) {
          if (entry.pgId != "") {
            switch (dutyCountMap.get(entry.pgId)) {
              case (null) { dutyCountMap.add(entry.pgId, 1) };
              case (?count) { dutyCountMap.add(entry.pgId, count + 1) };
            };
          };
          if (entry.secondLayerId != "") {
            switch (dutyCountMap.get(entry.secondLayerId)) {
              case (null) { dutyCountMap.add(entry.secondLayerId, 1) };
              case (?count) { dutyCountMap.add(entry.secondLayerId, count + 1) };
            };
          };
          if (entry.thirdLayerId != "") {
            switch (dutyCountMap.get(entry.thirdLayerId)) {
              case (null) { dutyCountMap.add(entry.thirdLayerId, 1) };
              case (?count) { dutyCountMap.add(entry.thirdLayerId, count + 1) };
            };
          };
        };
        dutyCountMap.entries().toArray();
      };
    };
  };
};
