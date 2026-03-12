import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type {
  DutyRequest,
  LeaveEntry,
  NodutyRequest,
  StaffMember,
} from "@/types";
import { CalendarDays, CalendarOff, PlusCircle, Trash2, X } from "lucide-react";
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

interface EntryListProps {
  entries: Array<{ id: string; staffId: string; dates: string[] }>;
  staff: StaffMember[];
  onDelete: (id: string) => void;
  emptyText: string;
  ocidPrefix: string;
}

function EntryList({
  entries,
  staff,
  onDelete,
  emptyText,
  ocidPrefix,
}: EntryListProps) {
  const staffById = new Map(staff.map((s) => [s.id, s]));
  if (entries.length === 0) {
    return (
      <div
        data-ocid={`${ocidPrefix}.empty_state`}
        className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg"
      >
        {emptyText}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const member = staffById.get(e.staffId);
        return (
          <div
            key={e.id}
            data-ocid={`${ocidPrefix}.item.${i + 1}`}
            className="flex items-start justify-between p-3 border rounded-lg bg-card"
          >
            <div>
              <p className="font-medium text-sm">
                {member?.name ?? "Unknown"}
                <Badge variant="outline" className="ml-2 text-xs">
                  {member?.role}
                </Badge>
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {e.dates.map((d) => (
                  <Badge
                    key={d}
                    variant="secondary"
                    className="text-xs font-mono"
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => onDelete(e.id)}
              data-ocid={`${ocidPrefix}.delete_button.${i + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

interface AddFormProps {
  staff: StaffMember[];
  label: string;
  onSave: (staffId: string, dates: string[]) => void;
  ocidPrefix: string;
}

function AddForm({ staff, label, onSave, ocidPrefix }: AddFormProps) {
  const [staffId, setStaffId] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [calOpen, setCalOpen] = useState(false);

  const handleSave = () => {
    if (!staffId) {
      toast.error("Select a staff member");
      return;
    }
    if (selectedDates.length === 0) {
      toast.error("Select at least one date");
      return;
    }
    const dates = selectedDates.map(toISO).sort();
    onSave(staffId, dates);
    setStaffId("");
    setSelectedDates([]);
  };

  const removeDate = (d: Date) => {
    setSelectedDates((prev) => prev.filter((x) => toISO(x) !== toISO(d)));
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add {label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Staff Member</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger data-ocid={`${ocidPrefix}.select`}>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Dates</Label>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start font-normal"
                data-ocid={`${ocidPrefix}.input`}
              >
                <CalendarDays className="h-4 w-4 mr-2 opacity-60" />
                {selectedDates.length === 0
                  ? "Pick dates"
                  : `${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates ?? [])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedDates
                .slice()
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d) => (
                  <Badge
                    key={toISO(d)}
                    variant="secondary"
                    className="text-xs font-mono gap-1 pr-1"
                  >
                    {toISO(d)}
                    <button
                      type="button"
                      onClick={() => removeDate(d)}
                      className="hover:text-destructive ml-0.5"
                      aria-label={`Remove ${toISO(d)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}
        </div>
        <Button
          className="w-full"
          onClick={handleSave}
          data-ocid={`${ocidPrefix}.submit_button`}
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

export function LeavesTab() {
  const [staff] = useLocalStorage<StaffMember[]>("duty_roster_staff", []);
  const [leaves, setLeaves] = useLocalStorage<LeaveEntry[]>(
    "duty_roster_leaves",
    [],
  );
  const [noduty, setNoduty] = useLocalStorage<NodutyRequest[]>(
    "duty_roster_noduty",
    [],
  );
  const [dutyrequests, setDutyrequests] = useLocalStorage<DutyRequest[]>(
    "duty_roster_dutyrequests",
    [],
  );

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
        <CalendarOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">
          No staff in the system.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Add staff in the Personnel tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">
          Leaves & Requests
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage leaves, no-duty requests and duty preferences
        </p>
      </div>
      <Tabs defaultValue="leaves">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="leaves" data-ocid="leaves.tab">
            Leaves
          </TabsTrigger>
          <TabsTrigger value="noduty" data-ocid="leaves.tab">
            No-Duty
          </TabsTrigger>
          <TabsTrigger value="dutyrequests" data-ocid="leaves.tab">
            Duty Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="mt-4 space-y-4">
          <AddForm
            staff={staff}
            label="Leave"
            onSave={(staffId, dates) => {
              setLeaves((prev) => [...prev, { id: genId(), staffId, dates }]);
              toast.success("Leave entry saved");
            }}
            ocidPrefix="leaves"
          />
          <EntryList
            entries={leaves}
            staff={staff}
            onDelete={(id) => {
              setLeaves((prev) => prev.filter((e) => e.id !== id));
              toast.success("Leave removed");
            }}
            emptyText="No leave entries yet."
            ocidPrefix="leaves"
          />
        </TabsContent>

        <TabsContent value="noduty" className="mt-4 space-y-4">
          <AddForm
            staff={staff}
            label="No-Duty Request"
            onSave={(staffId, dates) => {
              setNoduty((prev) => [...prev, { id: genId(), staffId, dates }]);
              toast.success("No-duty request saved");
            }}
            ocidPrefix="noduty"
          />
          <EntryList
            entries={noduty}
            staff={staff}
            onDelete={(id) => {
              setNoduty((prev) => prev.filter((e) => e.id !== id));
              toast.success("No-duty request removed");
            }}
            emptyText="No no-duty requests yet."
            ocidPrefix="noduty"
          />
        </TabsContent>

        <TabsContent value="dutyrequests" className="mt-4 space-y-4">
          <AddForm
            staff={staff}
            label="Duty Request"
            onSave={(staffId, dates) => {
              setDutyrequests((prev) => [
                ...prev,
                { id: genId(), staffId, dates },
              ]);
              toast.success("Duty request saved");
            }}
            ocidPrefix="dutyreq"
          />
          <EntryList
            entries={dutyrequests}
            staff={staff}
            onDelete={(id) => {
              setDutyrequests((prev) => prev.filter((e) => e.id !== id));
              toast.success("Duty request removed");
            }}
            emptyText="No duty requests yet."
            ocidPrefix="dutyreq"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
