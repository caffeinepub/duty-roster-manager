import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AlertTriangle, Loader2, Printer, Save, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { RosterEntry } from "../backend.d";
import {
  useGetMonthStats,
  useGetRoster,
  useListHolidays,
  useListLeaveRequests,
  useListStaff,
  useSaveRoster,
} from "../hooks/useQueries";
import { generateRoster } from "../rosterLogic";

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

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function OverrideDialog({
  open,
  day,
  entry,
  staffList,
  onSave,
  onClose,
}: {
  open: boolean;
  day: number;
  entry: RosterEntry | null;
  staffList: Array<{ id: string; name: string; role: string }>;
  onSave: (updated: RosterEntry) => void;
  onClose: () => void;
}) {
  const [pgId, setPgId] = useState(entry?.pgId ?? "");
  const [secondId, setSecondId] = useState(entry?.secondLayerId ?? "");
  const [thirdId, setThirdId] = useState(entry?.thirdLayerId ?? "");

  const pgs = staffList.filter((s) => s.role === "PG");
  const second = staffList.filter(
    (s) => s.role === "Registrar" || s.role === "JC",
  );
  const third = staffList.filter((s) => s.role === "SC" || s.role === "JC");

  const handleSave = () => {
    if (!entry) return;
    onSave({
      ...entry,
      pgId,
      secondLayerId: secondId,
      thirdLayerId: thirdId,
      manualOverride: true,
      flags: [],
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="roster.override.dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Override Day {day}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>PG (First Layer)</Label>
            <Select value={pgId} onValueChange={setPgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select PG..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {pgs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Second Layer (Registrar / JC)</Label>
            <Select value={secondId} onValueChange={setSecondId}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {second.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Third Layer (SC / JC)</Label>
            <Select value={thirdId} onValueChange={setThirdId}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {third.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button data-ocid="roster.override.save_button" onClick={handleSave}>
            Apply Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RosterTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [localEntries, setLocalEntries] = useState<RosterEntry[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [overrideDay, setOverrideDay] = useState<number | null>(null);

  const { data: staffList = [] } = useListStaff();
  const { data: leaveRequests = [] } = useListLeaveRequests(year, month);
  const { data: holidays = [] } = useListHolidays(year, month);
  const { data: savedRoster } = useGetRoster(year, month);
  const { data: stats = [] } = useGetMonthStats(year, month);
  const saveRoster = useSaveRoster();

  const entries = localEntries ?? savedRoster?.entries ?? [];
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  const activeStaff = staffList.filter((s) => s.active);

  const years = [
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1,
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const generated = generateRoster(
        year,
        month,
        staffList,
        leaveRequests,
        holidays,
      );
      setLocalEntries(generated);
      toast.success(`Roster generated for ${MONTHS[month - 1]} ${year}`);
    } catch (e) {
      toast.error(`Generation failed: ${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!entries.length) {
      toast.error("Generate a roster first");
      return;
    }
    try {
      await saveRoster.mutateAsync({ year, month, entries });
      setLocalEntries(null);
      toast.success("Roster saved successfully");
    } catch {
      toast.error("Failed to save roster");
    }
  };

  const handleOverrideSave = (updated: RosterEntry) => {
    setLocalEntries((prev) => {
      const base = prev ?? savedRoster?.entries ?? [];
      return base.map((e) => (e.day === updated.day ? updated : e));
    });
  };

  const handlePrint = () => window.print();

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const calendarCells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const weeks: Array<Array<{ day: number | null; cellKey: string }>> = [];
  for (let ci = 0; ci < calendarCells.length; ci += 7) {
    weeks.push(
      calendarCells.slice(ci, ci + 7).map((d, slot) => ({
        day: d,
        cellKey: d !== null ? `day-${d}` : `pad-${ci + slot}`,
      })),
    );
  }

  const overrideEntry = overrideDay
    ? (entries.find((e) => Number(e.day) === overrideDay) ?? null)
    : null;

  const totalFlags = entries.reduce((acc, e) => acc + e.flags.length, 0);

  const isHoliday = (day: number) => {
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || holidays.some((h) => Number(h.day) === day);
  };
  const isPreHoliday = (day: number) => {
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 6;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight">
            Duty Roster
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate, review, and save the monthly duty roster
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            data-ocid="roster.export_button"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saveRoster.isPending || !entries.length}
          >
            {saveRoster.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Save className="mr-2 h-4 w-4" />
            Save Roster
          </Button>
          <Button
            data-ocid="roster.generate_button"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Roster
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end p-4 bg-card rounded-lg border shadow-card">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setYear(Number(v));
              setLocalEntries(null);
            }}
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
            data-ocid="roster.month.select"
            value={String(month)}
            onValueChange={(v) => {
              setMonth(Number(v));
              setLocalEntries(null);
            }}
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
        {totalFlags > 0 && (
          <div className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              {totalFlags} violation{totalFlags !== 1 ? "s" : ""} detected
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm pg-badge inline-block" />
          PG (First Layer)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm second-badge inline-block" />
          Second Layer
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm third-badge inline-block" />
          Third Layer
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
          Flagged
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" />
          Holiday/Pre-Holiday
        </span>
      </div>

      {entries.length > 0 ? (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden print:shadow-none">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DOW_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold py-2 text-muted-foreground uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week) => {
            const weekKey = `week-${week.find((c) => c.day !== null)?.day ?? "pad"}`;
            return (
              <div
                key={weekKey}
                className="grid grid-cols-7 border-b last:border-b-0"
              >
                {week.map(({ day, cellKey }) => {
                  if (!day) {
                    return (
                      <div
                        key={cellKey}
                        className="min-h-[100px] bg-muted/10 border-r last:border-r-0"
                      />
                    );
                  }
                  const entry = entries.find((e) => Number(e.day) === day);
                  const hasFlags = (entry?.flags.length ?? 0) > 0;
                  const holiday = isHoliday(day);
                  const preHoliday = isPreHoliday(day);
                  const pg = entry?.pgId ? staffById.get(entry.pgId) : null;
                  const second = entry?.secondLayerId
                    ? staffById.get(entry.secondLayerId)
                    : null;
                  const third = entry?.thirdLayerId
                    ? staffById.get(entry.thirdLayerId)
                    : null;

                  return (
                    <motion.div
                      key={cellKey}
                      data-ocid={`roster.day.item.${day}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: day * 0.008 }}
                      className={`min-h-[100px] border-r last:border-r-0 p-1.5 cursor-pointer hover:bg-muted/20 transition-colors relative ${
                        hasFlags
                          ? "bg-red-50/60"
                          : holiday
                            ? "bg-amber-50/40"
                            : preHoliday
                              ? "bg-amber-50/20"
                              : ""
                      }`}
                      onClick={() => setOverrideDay(day)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            holiday
                              ? "text-red-600"
                              : preHoliday
                                ? "text-amber-600"
                                : "text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        {entry?.manualOverride && (
                          <span className="text-[10px] text-muted-foreground">
                            M
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {pg && (
                          <div className="pg-badge text-[10px] font-medium px-1 py-0.5 rounded truncate">
                            {pg.name}
                          </div>
                        )}
                        {second && (
                          <div className="second-badge text-[10px] font-medium px-1 py-0.5 rounded truncate">
                            {second.name}
                          </div>
                        )}
                        {third && (
                          <div className="third-badge text-[10px] font-medium px-1 py-0.5 rounded truncate">
                            {third.name}
                          </div>
                        )}
                      </div>
                      {hasFlags && (
                        <div className="absolute top-1 right-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          data-ocid="roster.empty_state"
          className="flex flex-col items-center justify-center py-20 bg-card rounded-lg border shadow-card text-center space-y-3"
        >
          <Wand2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-display font-semibold text-lg text-muted-foreground">
            No roster generated yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Click &quot;Generate Roster&quot; to auto-assign duties for{" "}
            {MONTHS[month - 1]} {year}. You can also manually override any day
            after generation.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-2"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Roster
          </Button>
        </div>
      )}

      <AnimatePresence>
        {totalFlags > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-red-200">
              <h3 className="font-display font-semibold text-red-800 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rule Violations ({totalFlags})
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {entries.flatMap((e) =>
                e.flags.map((flag, fi) => (
                  <div
                    key={`flag-${e.day}-${fi}`}
                    className="flex items-start gap-2 text-sm text-red-700"
                  >
                    <span className="font-semibold shrink-0">
                      Day {Number(e.day)}:
                    </span>
                    <span>{flag}</span>
                  </div>
                )),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(stats.length > 0 || entries.length > 0) && (
        <div className="rounded-lg border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="font-display font-semibold text-sm">
              Duty Count — {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="font-semibold">Staff Member</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="text-center font-semibold">
                  Duties
                </TableHead>
                <TableHead className="text-center font-semibold">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStaff.map((s) => {
                const statEntry = stats.find(([id]) => id === s.id);
                const localCount =
                  entries.length > 0
                    ? entries.filter(
                        (e) =>
                          e.pgId === s.id ||
                          e.secondLayerId === s.id ||
                          e.thirdLayerId === s.id,
                      ).length
                    : null;
                const count =
                  localCount ?? (statEntry ? Number(statEntry[1]) : 0);
                const over = count > 6;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.role}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          over
                            ? "bg-red-50 text-red-700 border-red-200"
                            : count >= 5
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count} / 6
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {over ? (
                        <span className="text-xs text-red-600 font-medium">
                          Over limit
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">
                          OK
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <OverrideDialog
        open={overrideDay !== null}
        day={overrideDay ?? 0}
        entry={overrideEntry}
        staffList={activeStaff}
        onSave={handleOverrideSave}
        onClose={() => setOverrideDay(null)}
      />
    </div>
  );
}
