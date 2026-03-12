import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Holiday } from "@/types";
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [holidays, setHolidays] = useLocalStorage<Holiday[]>(
    "duty_roster_holidays",
    [],
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calOpen, setCalOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const filtered = holidays.filter((h) => {
    const d = new Date(`${h.date}T00:00:00`);
    return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth;
  });

  const handleAdd = () => {
    if (!selectedDate) {
      toast.error("Select a date");
      return;
    }
    if (!newName.trim()) {
      toast.error("Enter a holiday name");
      return;
    }
    const dateStr = toISO(selectedDate);
    if (holidays.find((h) => h.date === dateStr)) {
      toast.error("Holiday already exists for this date");
      return;
    }
    setHolidays((prev) => [
      ...prev,
      { id: genId(), date: dateStr, name: newName.trim() },
    ]);
    toast.success("Holiday added");
    setSelectedDate(undefined);
    setNewName("");
  };

  const handleDelete = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    toast.success("Holiday removed");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Holidays</h2>
        <p className="text-sm text-muted-foreground">
          Statutory holidays. Sundays are automatically treated as holidays.
        </p>
      </div>

      {/* Month/Year selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="hol-month">Month</Label>
          <select
            id="hol-month"
            data-ocid="holidays.select"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="hol-year">Year</Label>
          <Input
            id="hol-year"
            data-ocid="holidays.input"
            type="number"
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Add Holiday for {MONTHS[viewMonth - 1]} {viewYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-36">
              <Label>Date</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                    data-ocid="holidays.input"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2 opacity-60" />
                    {selectedDate ? toISO(selectedDate) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      setCalOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5 flex-1 min-w-48">
              <Label>Holiday Name</Label>
              <Input
                data-ocid="holidays.input"
                placeholder="e.g. National Day"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} data-ocid="holidays.primary_button">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Holiday
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div
          data-ocid="holidays.empty_state"
          className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg"
        >
          <CalendarIcon className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            No statutory holidays for {MONTHS[viewMonth - 1]} {viewYear}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sundays are automatically holidays.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table data-ocid="holidays.table">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h, i) => {
                  const d = new Date(`${h.date}T00:00:00`);
                  const dow = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ][d.getDay()];
                  return (
                    <TableRow key={h.id} data-ocid={`holidays.item.${i + 1}`}>
                      <TableCell className="font-mono text-sm">
                        {h.date}
                      </TableCell>
                      <TableCell className="text-sm">{dow}</TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(h.id)}
                          data-ocid={`holidays.delete_button.${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
