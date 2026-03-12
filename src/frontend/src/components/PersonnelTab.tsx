import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Staff } from "../backend.d";
import {
  useAddStaff,
  useDeleteStaff,
  useListStaff,
  useUpdateStaff,
} from "../hooks/useQueries";

const ROLE_LABELS: Record<string, string> = {
  PG: "PG (First Layer)",
  Registrar: "Registrar (Second Layer)",
  JC: "JC (Second + Third Layer)",
  SC: "SC (Third Layer)",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  PG: "pg-badge",
  Registrar: "second-badge",
  JC: "third-badge",
  SC: "bg-purple-100 text-purple-800",
};

function StaffDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Staff;
}) {
  const addStaff = useAddStaff();
  const updateStaff = useUpdateStaff();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "PG");
  const [active, setActive] = useState(initial?.active ?? true);

  const isPending = addStaff.isPending || updateStaff.isPending;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const staff: Staff = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      role,
      active,
    };
    try {
      if (isEdit) {
        await updateStaff.mutateAsync(staff);
        toast.success("Staff member updated");
      } else {
        await addStaff.mutateAsync(staff);
        toast.success("Staff member added");
      }
      onClose();
    } catch {
      toast.error("Failed to save staff member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="personnel.dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Full Name</Label>
            <Input
              id="staff-name"
              data-ocid="personnel.name.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Smith"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-ocid="personnel.role.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PG">PG — First Layer</SelectItem>
                <SelectItem value="Registrar">
                  Registrar — Second Layer
                </SelectItem>
                <SelectItem value="JC">
                  Junior Consultant — Second + Third Layer
                </SelectItem>
                <SelectItem value="SC">
                  Senior Consultant — Third Layer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="staff-active"
              data-ocid="personnel.active.switch"
              checked={active}
              onCheckedChange={setActive}
            />
            <Label htmlFor="staff-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            data-ocid="personnel.cancel_button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-ocid="personnel.save_button"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Add Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PersonnelTab() {
  const { data: staffList = [], isLoading } = useListStaff();
  const deleteStaff = useDeleteStaff();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | undefined>();

  const openAdd = () => {
    setEditTarget(undefined);
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditTarget(s);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStaff.mutateAsync(id);
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight">
            Personnel
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage staff members and their duty layer assignments
          </p>
        </div>
        <Button data-ocid="personnel.add_button" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <Table data-ocid="personnel.table">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Layer</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-24 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && staffList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div data-ocid="personnel.empty_state" className="space-y-1">
                    <p className="font-medium text-muted-foreground">
                      No staff members yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Add your first staff member to get started
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {staffList.map((s, i) => (
              <TableRow key={s.id} data-ocid={`personnel.item.${i + 1}`}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>
                  <Badge
                    className={`${ROLE_BADGE_CLASS[s.role] ?? ""} border-0 text-xs font-medium`}
                    variant="outline"
                  >
                    {s.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ROLE_LABELS[s.role] ?? s.role}
                </TableCell>
                <TableCell>
                  {s.active ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <UserCheck className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <UserX className="h-3.5 w-3.5" />
                      Inactive
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      data-ocid={`personnel.edit_button.${i + 1}`}
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-ocid={`personnel.delete_button.${i + 1}`}
                      onClick={() => handleDelete(s.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <StaffDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editTarget}
      />
    </div>
  );
}
