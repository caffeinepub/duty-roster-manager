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
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddHoliday,
  useListHolidays,
  useRemoveHoliday,
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

export function HolidaysTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [addDay, setAddDay] = useState("");

  const { data: holidays = [], isLoading } = useListHolidays(year, month);
  const addHoliday = useAddHoliday();
  const removeHoliday = useRemoveHoliday();

  const years = [
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1,
  ];
  const daysInMonth = new Date(year, month, 0).getDate();

  const sundaysInMonth: number[] = [];
  const saturdaysInMonth: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0) sundaysInMonth.push(d);
    if (dow === 6) saturdaysInMonth.push(d);
  }

  const handleAdd = async () => {
    const dayNum = Number.parseInt(addDay);
    if (!dayNum || dayNum < 1 || dayNum > daysInMonth) {
      toast.error(`Please select a valid day (1-${daysInMonth})`);
      return;
    }
    if (holidays.some((h) => Number(h.day) === dayNum)) {
      toast.error("This day is already a statutory holiday");
      return;
    }
    try {
      await addHoliday.mutateAsync({
        day: BigInt(dayNum),
        month: BigInt(month),
        year: BigInt(year),
      });
      toast.success(`Day ${dayNum} added as statutory holiday`);
      setAddDay("");
    } catch {
      toast.error("Failed to add holiday");
    }
  };

  const handleRemove = async (index: number) => {
    try {
      await removeHoliday.mutateAsync({ index, year, month });
      toast.success("Holiday removed");
    } catch {
      toast.error("Failed to remove holiday");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-semibold tracking-tight">
          Statutory Holidays
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define public holidays per month. Sundays are always holidays;
          Saturdays are pre-holidays.
        </p>
      </div>

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
            data-ocid="holidays.month.select"
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
        <div className="space-y-1.5">
          <Label>Add Statutory Holiday</Label>
          <Select value={addDay} onValueChange={setAddDay}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Day..." />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Day {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          data-ocid="holidays.add_button"
          onClick={handleAdd}
          disabled={!addDay || addHoliday.isPending}
        >
          {addHoliday.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Holiday
        </Button>
      </div>

      <div className="p-5 bg-card rounded-lg border shadow-card space-y-4">
        <h3 className="font-display font-semibold">
          Statutory Holidays — {MONTHS[month - 1]} {year}
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No statutory holidays defined for this month.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {holidays.map((h, i) => (
                  <Badge
                    key={Number(h.day)}
                    variant="outline"
                    className="flag-badge border-orange-200 pl-3 pr-1.5 py-1 text-sm gap-2 flex items-center"
                  >
                    <span>Day {Number(h.day)}</span>
                    <button
                      type="button"
                      data-ocid={`holidays.remove_button.${i + 1}`}
                      onClick={() => handleRemove(i)}
                      className="rounded-sm hover:bg-black/10 p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
            Sundays (Auto Holidays)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {sundaysInMonth.map((d) => (
              <Badge
                key={d}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-xs"
              >
                Day {d}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
            Saturdays (Pre-Holidays)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {saturdaysInMonth.map((d) => (
              <Badge
                key={d}
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
              >
                Day {d}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
