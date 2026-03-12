import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LeaveRequest,
  RosterEntry,
  Staff,
  StatutoryHoliday,
} from "../backend.d";
import { useActor } from "./useActor";

export function useListStaff() {
  const { actor, isFetching } = useActor();
  return useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listStaff();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListHolidays(year: number, month: number) {
  const { actor, isFetching } = useActor();
  return useQuery<StatutoryHoliday[]>({
    queryKey: ["holidays", year, month],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listHolidays(BigInt(year), BigInt(month));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListLeaveRequests(year: number, month: number) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveRequest[]>({
    queryKey: ["leaveRequests", year, month],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listLeaveRequestsForMonth(BigInt(year), BigInt(month));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLeaveRequest(
  staffId: string,
  year: number,
  month: number,
) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveRequest | null>({
    queryKey: ["leaveRequest", staffId, year, month],
    queryFn: async () => {
      if (!actor || !staffId) return null;
      return actor.getLeaveRequest(staffId, BigInt(year), BigInt(month));
    },
    enabled: !!actor && !isFetching && !!staffId,
  });
}

export function useGetRoster(year: number, month: number) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["roster", year, month],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRoster(BigInt(year), BigInt(month));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMonthStats(year: number, month: number) {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, bigint]>>({
    queryKey: ["monthStats", year, month],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMonthStats(BigInt(year), BigInt(month));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddStaff() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staff: Staff) => {
      if (!actor) throw new Error("No actor");
      return actor.addStaff(staff);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staff: Staff) => {
      if (!actor) throw new Error("No actor");
      return actor.updateStaff(staff);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteStaff(staffId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpsertLeaveRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: LeaveRequest) => {
      if (!actor) throw new Error("No actor");
      return actor.upsertLeaveRequest(req);
    },
    onSuccess: (_, req) => {
      qc.invalidateQueries({
        queryKey: ["leaveRequests", Number(req.year), Number(req.month)],
      });
      qc.invalidateQueries({
        queryKey: [
          "leaveRequest",
          req.staffId,
          Number(req.year),
          Number(req.month),
        ],
      });
    },
  });
}

export function useAddHoliday() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holiday: StatutoryHoliday) => {
      if (!actor) throw new Error("No actor");
      return actor.addHoliday(holiday);
    },
    onSuccess: (_, h) =>
      qc.invalidateQueries({
        queryKey: ["holidays", Number(h.year), Number(h.month)],
      }),
  });
}

export function useRemoveHoliday() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      index: number;
      year: number;
      month: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.removeHoliday(BigInt(params.index));
    },
    onSuccess: (_, params) =>
      qc.invalidateQueries({
        queryKey: ["holidays", params.year, params.month],
      }),
  });
}

export function useSaveRoster() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      year: number;
      month: number;
      entries: RosterEntry[];
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.saveRoster(
        BigInt(params.year),
        BigInt(params.month),
        params.entries,
      );
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["roster", params.year, params.month] });
      qc.invalidateQueries({
        queryKey: ["monthStats", params.year, params.month],
      });
    },
  });
}
