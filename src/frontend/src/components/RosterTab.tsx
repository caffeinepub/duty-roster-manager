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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { generateRoster } from "@/rosterEngine";
import type {
  DutyRequest,
  Holiday,
  LeaveEntry,
  NodutyRequest,
  RosterDay,
  RosterOverride,
  StaffMember,
} from "@/types";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import {
  AlignLeft,
  ClipboardList,
  Lock,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isHolidayOrSunday(date: string, holidays: Holiday[]): boolean {
  const d = new Date(`${date}T00:00:00`);
  return d.getDay() === 0 || holidays.some((h) => h.date === date);
}

function isPreHoliday(date: string, holidays: Holiday[]): boolean {
  const d = new Date(`${date}T00:00:00`);
  const dow = d.getDay();
  if (dow === 6) return true;
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  const nextISO = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  const nextDow = next.getDay();
  return nextDow === 0 || holidays.some((h) => h.date === nextISO);
}

interface OverrideCellProps {
  value: string | null;
  candidates: StaffMember[];
  onSelect: (name: string | null) => void;
  highlightRole?: "pg" | "reg" | "sc";
  locked?: boolean;
}

function OverrideCell({
  value,
  candidates,
  onSelect,
  highlightRole,
  locked,
}: OverrideCellProps) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        className="cursor-pointer hover:underline hover:text-primary transition-colors text-left bg-transparent border-0 p-0 flex items-center gap-1"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setEditing(true);
        }}
        title={
          locked ? "SC required when Registrar is on duty" : "Click to override"
        }
      >
        {value ?? <span className="text-destructive/70 italic text-xs">—</span>}
        {locked && (
          <Lock
            className="h-3 w-3 text-amber-500 shrink-0"
            aria-label="SC required when Registrar is on duty"
          />
        )}
      </button>
    );
  }

  const roleFilter =
    highlightRole === "pg"
      ? ["PG"]
      : highlightRole === "reg"
        ? ["Registrar", "JC"]
        : ["SC", "JC"];

  const sorted = [
    ...candidates.filter((s) => roleFilter.includes(s.role)),
    ...candidates.filter((s) => !roleFilter.includes(s.role)),
  ];

  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => {
        onSelect(v === "__none__" ? null : v);
        setEditing(false);
      }}
      open
      onOpenChange={(open) => {
        if (!open) setEditing(false);
      }}
    >
      <SelectTrigger className="h-7 text-xs w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* Only show Unassigned option when SC is NOT required (i.e. JC in layer 2) */}
        {!locked && <SelectItem value="__none__">— Unassigned —</SelectItem>}
        {sorted.map((s) => (
          <SelectItem key={s.id} value={s.name}>
            {s.name} ({s.role})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

async function exportToWord(
  roster: RosterDay[],
  holidays: Holiday[],
  month: number,
  year: number,
  staff: StaffMember[],
) {
  const HEADER_COLOR = "1F4E79";
  const HOLIDAY_COLOR = "D6E4F0";
  const PREHOLIDAY_COLOR = "EAF4FB";
  const WHITE = "FFFFFF";

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  };

  const makeHeaderCell = (text: string, widthPercent: number) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: HEADER_COLOR },
      borders: cellBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: true,
              color: WHITE,
              size: 20,
            }),
          ],
        }),
      ],
    });

  const makeCell = (
    text: string,
    widthPercent: number,
    bgColor: string,
    bold = false,
  ) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: bgColor },
      borders: cellBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: text || "",
              bold,
              size: 18,
            }),
          ],
        }),
      ],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell("Day", 6),
      makeHeaderCell("DOW", 7),
      makeHeaderCell("PG", 17),
      makeHeaderCell("Registrar / JC", 22),
      makeHeaderCell("Senior Consultant", 22),
      makeHeaderCell("Flags", 26),
    ],
  });

  const dataRows = roster.map((row) => {
    const day = new Date(`${row.date}T00:00:00`).getDate();
    const isHol = isHolidayOrSunday(row.date, holidays);
    const isPre = !isHol && isPreHoliday(row.date, holidays);
    const bg = isHol ? HOLIDAY_COLOR : isPre ? PREHOLIDAY_COLOR : "F9F9F9";

    return new TableRow({
      children: [
        makeCell(String(day), 6, bg, true),
        makeCell(row.dayOfWeek, 7, bg, isPre || isHol),
        makeCell(row.pg ?? "", 17, bg),
        makeCell(row.registrarJC ?? "", 22, bg),
        makeCell(row.seniorConsultant ?? "", 22, bg),
        makeCell(
          row.flags.join("; "),
          26,
          row.flags.length > 0 ? "FFF3CD" : bg,
        ),
      ],
    });
  });

  // Summary section
  const summaryLines = staff
    .map((s) => {
      const count = roster.filter(
        (r) =>
          r.pg === s.name ||
          r.registrarJC === s.name ||
          r.seniorConsultant === s.name,
      ).length;
      const fridays = roster.filter(
        (r) =>
          new Date(`${r.date}T00:00:00`).getDay() === 5 &&
          (r.pg === s.name ||
            r.registrarJC === s.name ||
            r.seniorConsultant === s.name),
      ).length;
      const saturdays = roster.filter(
        (r) =>
          new Date(`${r.date}T00:00:00`).getDay() === 6 &&
          (r.pg === s.name ||
            r.registrarJC === s.name ||
            r.seniorConsultant === s.name),
      ).length;
      return `${s.name} (${s.role}): ${count} duties, ${fridays} Friday(s), ${saturdays} Saturday(s)`;
    })
    .join("\n");

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Duty Roster — ${MONTHS[month - 1]} ${year}`,
                bold: true,
                size: 28,
                color: "1F4E79",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Staff Summary",
                bold: true,
                size: 22,
              }),
            ],
          }),
          ...summaryLines.split("\n").map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 18,
                  }),
                ],
              }),
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `DutyRoster_${MONTHS[month - 1]}_${year}.docx`);
}

export function RosterTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [roster, setRoster] = useState<RosterDay[] | null>(null);
  const [generated, setGenerated] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [staff] = useLocalStorage<StaffMember[]>("duty_roster_staff", []);
  const [leaves] = useLocalStorage<LeaveEntry[]>("duty_roster_leaves", []);
  const [noduty] = useLocalStorage<NodutyRequest[]>("duty_roster_noduty", []);
  const [dutyrequests] = useLocalStorage<DutyRequest[]>(
    "duty_roster_dutyrequests",
    [],
  );
  const [holidays] = useLocalStorage<Holiday[]>("duty_roster_holidays", []);

  const overrideKey = `duty_roster_override_${year}-${pad(month)}`;
  const [overrides, setOverrides] = useLocalStorage<RosterOverride>(
    overrideKey,
    {},
  );

  const handleGenerate = () => {
    if (staff.length === 0) {
      toast.error("Add staff in the Personnel tab first");
      return;
    }
    const rows = generateRoster(
      year,
      month,
      staff,
      leaves,
      noduty,
      dutyrequests,
      holidays,
      overrides,
    );
    setRoster(rows);
    setGenerated(true);
    toast.success(`Roster generated for ${MONTHS[month - 1]} ${year}`);
  };

  const displayRoster = useMemo(() => {
    if (!generated || !roster) return roster;
    return generateRoster(
      year,
      month,
      staff,
      leaves,
      noduty,
      dutyrequests,
      holidays,
      overrides,
    );
  }, [
    generated,
    roster,
    overrides,
    year,
    month,
    staff,
    leaves,
    noduty,
    dutyrequests,
    holidays,
  ]);

  const handleOverride = (
    date: string,
    slot: "pg" | "reg" | "sc",
    name: string | null,
  ) => {
    const key = `${date}_${slot}`;
    setOverrides((prev) => {
      const next = { ...prev };
      if (name === null) delete next[key];
      else next[key] = name;
      return next;
    });
    toast.success("Override saved");
  };

  const handleExportWord = async () => {
    if (!displayRoster) return;
    setExporting(true);
    try {
      await exportToWord(displayRoster, holidays, month, year, staff);
      toast.success("Word document downloaded");
    } catch {
      toast.error("Failed to export Word document");
    } finally {
      setExporting(false);
    }
  };

  const hasFlags = displayRoster?.some((r) => r.flags.length > 0) ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Roster Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate monthly duty roster with rule enforcement
          </p>
        </div>
        {generated && displayRoster && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => window.print()}
              data-ocid="roster.secondary_button"
            >
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button
              variant="outline"
              onClick={handleExportWord}
              disabled={exporting}
              data-ocid="roster.export_button"
            >
              <AlignLeft className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export Word"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-end gap-3 flex-wrap p-4 border rounded-lg bg-card">
        <div className="space-y-1.5">
          <Label>Month</Label>
          <select
            data-ocid="roster.select"
            value={month}
            onChange={(e) => {
              setMonth(Number(e.target.value));
              setGenerated(false);
            }}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Year</Label>
          <input
            data-ocid="roster.input"
            type="number"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setGenerated(false);
            }}
            className="border rounded-md px-3 py-1.5 text-sm bg-background w-24"
          />
        </div>
        <Button
          onClick={handleGenerate}
          className="self-end"
          data-ocid="roster.primary_button"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Generate Roster
        </Button>
      </div>

      {!generated && (
        <div
          data-ocid="roster.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg"
        >
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">
            No roster generated yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Select a month and click Generate Roster.
          </p>
        </div>
      )}

      {generated && displayRoster && (
        <>
          {hasFlags && (
            <div
              data-ocid="roster.error_state"
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              This roster has rule violations — see the Flags column.
            </div>
          )}

          <div
            className="border rounded-lg overflow-auto"
            id="roster-print-area"
          >
            <table className="w-full text-sm border-collapse print:text-xs">
              <thead>
                <tr className="bg-muted/60 text-left">
                  <th className="px-3 py-2.5 font-semibold border-b w-10">
                    Day
                  </th>
                  <th className="px-3 py-2.5 font-semibold border-b w-12">
                    DOW
                  </th>
                  <th className="px-3 py-2.5 font-semibold border-b">PG</th>
                  <th className="px-3 py-2.5 font-semibold border-b">
                    Registrar / JC
                  </th>
                  <th className="px-3 py-2.5 font-semibold border-b">
                    Senior Consultant
                  </th>
                  <th className="px-3 py-2.5 font-semibold border-b">Flags</th>
                </tr>
              </thead>
              <tbody>
                {displayRoster.map((row, i) => {
                  const isSpecial = isHolidayOrSunday(row.date, holidays);
                  const isPre = !isSpecial && isPreHoliday(row.date, holidays);
                  const day = new Date(`${row.date}T00:00:00`).getDate();

                  // Determine if the layer-2 person is a Registrar
                  const layer2Staff = staff.find(
                    (s) => s.name === row.registrarJC,
                  );
                  const registrarInLayer2 = layer2Staff?.role === "Registrar";

                  return (
                    <tr
                      key={row.date}
                      data-ocid={`roster.item.${i + 1}`}
                      className={[
                        "border-b last:border-b-0 transition-colors",
                        isSpecial
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : isPre
                            ? "bg-sky-50/60 dark:bg-sky-950/20"
                            : "hover:bg-muted/20",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 font-mono font-medium">{day}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-medium ${
                            isSpecial
                              ? "text-primary"
                              : isPre
                                ? "text-sky-600"
                                : ""
                          }`}
                        >
                          {row.dayOfWeek}
                          {isPre && (
                            <span className="ml-1 text-xs text-sky-500 font-normal">
                              (pre)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <OverrideCell
                          value={row.pg}
                          candidates={staff}
                          highlightRole="pg"
                          onSelect={(name) =>
                            handleOverride(row.date, "pg", name)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <OverrideCell
                          value={row.registrarJC}
                          candidates={staff}
                          highlightRole="reg"
                          onSelect={(name) =>
                            handleOverride(row.date, "reg", name)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <OverrideCell
                          value={row.seniorConsultant}
                          candidates={staff}
                          highlightRole="sc"
                          locked={registrarInLayer2}
                          onSelect={(name) =>
                            handleOverride(row.date, "sc", name)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.flags.map((f) => (
                              <Badge key={f} className="flag-badge text-xs">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-muted/40 rounded-lg">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Summary
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              {staff.map((s) => {
                const myRows = (displayRoster ?? []).filter(
                  (r) =>
                    r.pg === s.name ||
                    r.registrarJC === s.name ||
                    r.seniorConsultant === s.name,
                );
                const count = myRows.length;
                const fridays = myRows.filter(
                  (r) => new Date(`${r.date}T00:00:00`).getDay() === 5,
                ).length;
                const saturdays = myRows.filter(
                  (r) => new Date(`${r.date}T00:00:00`).getDay() === 6,
                ).length;
                return (
                  <span key={s.id} className="flex items-center gap-1">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {count}d
                    </Badge>
                    {fridays > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-sky-600 border-sky-300"
                      >
                        {fridays}F
                      </Badge>
                    )}
                    {saturdays > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-300"
                      >
                        {saturdays}S
                      </Badge>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
