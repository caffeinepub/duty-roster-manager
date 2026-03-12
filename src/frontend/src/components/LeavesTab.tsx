import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { LeaveRequest } from "../backend.d";
import {
  useGetLeaveRequest,
  useListLeaveRequests,
  useListStaff,
  useUpsertLeaveRequest,
} from "../hooks/useQueries";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function DayPicker({
  label,
  year,
  month,
  selected,
  onChange,
  color,
}: {
  label: string;
  year: number;
  month: number;
  selected: number[];
  onChange: (days: number[]) => void;
  color: "blue" | "amber" | "emerald";
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const colorClasses = {
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    amber: "bg-amber-100 text-amber-800 border-amber-300",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };

  const toggle = (d: number) => {
    if (selected.includes(d)) onChange(selected.filter((x) => x !== d));
    else onChange([...selected, d].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={`w-8 h-8 text-xs font-medium rounded border transition-colors ${
              selected.includes(d)
                ? colorClasses[color]
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: {selected.join(", ")}
        </p>
      )}
    </div>
  );
}

export function LeavesTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const [leaveDays, setLeaveDays] = useState<number[]>([]);
  const [noDutyDays, setNoDutyDays] = useState<number[]>([]);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);

  const { data: staffList = [] } = useListStaff();
  const activeStaff = staffList.filter((s) => s.active);
  const { data: leaveReq } = useGetLeaveRequest(selectedStaffId, year, month);
  const { data: allLeaves = [] } = useListLeaveRequests(year, month);
  const upsert = useUpsertLeaveRequest();

  useEffect(() => {
    if (leaveReq) {
      setLeaveDays(leaveReq.leaveDates.map(Number));
      setNoDutyDays(leaveReq.noDutyDates.map(Number));
      setPreferredDays(leaveReq.preferredDutyDates.map(Number));
    } else {
      setLeaveDays([]);
      setNoDutyDays([]);
      setPreferredDays([]);
    }
  }, [leaveReq]);

  const handleSave = async () => {
    if (!selectedStaffId) {
      toast.error("Please select a staff member");
      return;
    }
    const req: LeaveRequest = {
      staffId: selectedStaffId,
      year: BigInt(year),
      month: BigInt(month),
      leaveDates: leaveDays.map(BigInt),
      noDutyDates: noDutyDays.map(BigInt),
      preferredDutyDates: preferredDays.map(BigInt),
    };
    try {
      await upsert.mutateAsync(req);
      toast.success("Leave request saved");
    } catch {
      toast.error("Failed to save leave request");
    }
  };

  const staffById = new Map(staffList.map((s) => [s.id, s]));

  const years = [
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1,
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-semibold tracking-tight">
          Leaves &amp; Requests
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage leave, no-duty, and preferred duty requests per staff
        </p>
      </div>

      {/* Month/Year/Staff selectors */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-card rounded-lg border shadow-card">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Month</Label>
          <Select
            data-ocid="leaves.month.select"
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={String(MONTHS.indexOf(m) + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-48">
          <Label>Staff Member</Label>
          <Select
            data-ocid="leaves.staff.select"
            value={selectedStaffId}
            onValueChange={setSelectedStaffId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select staff member..." />
            </SelectTrigger>
            <SelectContent>
              {activeStaff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {s.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day pickers */}
      {selectedStaffId && (
        <div className="p-5 bg-card rounded-lg border shadow-card space-y-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">
              {staffById.get(selectedStaffId)?.name} — {MONTHS[month - 1]}{" "}
              {year}
            </h3>
          </div>
          <DayPicker
            label="Leave Days (will not be assigned)"
            year={year}
            month={month}
            selected={leaveDays}
            onChange={setLeaveDays}
            color="amber"
          />
          <DayPicker
            label="No-Duty Requested Days"
            year={year}
            month={month}
            selected={noDutyDays}
            onChange={setNoDutyDays}
            color="blue"
          />
          <DayPicker
            label="Preferred Duty Days"
            year={year}
            month={month}
            selected={preferredDays}
            onChange={setPreferredDays}
            color="emerald"
          />
          <div className="flex justify-end pt-2">
            <Button
              data-ocid="leaves.save_button"
              onClick={handleSave}
              disabled={upsert.isPending}
            >
              {upsert.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Save Requests
            </Button>
          </div>
        </div>
      )}

      {/* Summary table */}
      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-display font-semibold text-sm">
            Summary — {MONTHS[month - 1]} {year}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead className="font-semibold">Staff</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="text-center font-semibold">
                Leave Days
              </TableHead>
              <TableHead className="text-center font-semibold">
                No-Duty Requests
              </TableHead>
              <TableHead className="text-center font-semibold">
                Preferred Days
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeStaff.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No active staff members
                </TableCell>
              </TableRow>
            )}
            {activeStaff.map((s) => {
              const req = allLeaves.find((l) => l.staffId === s.id);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.role}
                  </TableCell>
                  <TableCell className="text-center">
                    {req?.leaveDates.length ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                      >
                        {req.leaveDates.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {req?.noDutyDates.length ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                      >
                        {req.noDutyDates.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {req?.preferredDutyDates.length ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                      >
                        {req.preferredDutyDates.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
