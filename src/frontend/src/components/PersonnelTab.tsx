import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Role, StaffMember } from "@/types";
import { Pencil, PlusCircle, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_LABELS: Record<Role, string> = {
  PG: "PG (Postgraduate)",
  Registrar: "Registrar",
  JC: "JC (Junior Consultant)",
  SC: "SC (Senior Consultant)",
};

const ROLE_COLORS: Record<Role, string> = {
  PG: "pg-badge",
  Registrar: "second-badge",
  JC: "third-badge",
  SC: "third-badge",
};

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function PersonnelTab() {
  const [staff, setStaff] = useLocalStorage<StaffMember[]>(
    "duty_roster_staff",
    [],
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("PG");

  const resetForm = () => {
    setName("");
    setRole("PG");
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    const member: StaffMember = { id: genId(), name: name.trim(), role };
    setStaff((prev) => [...prev, member]);
    toast.success(`${member.name} added`);
    setAddOpen(false);
    resetForm();
  };

  const openEdit = (m: StaffMember) => {
    setEditTarget(m);
    setName(m.name);
    setRole(m.role);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!name.trim() || !editTarget) {
      toast.error("Please enter a name");
      return;
    }
    setStaff((prev) =>
      prev.map((s) =>
        s.id === editTarget.id ? { ...s, name: name.trim(), role } : s,
      ),
    );
    toast.success("Staff member updated");
    setEditOpen(false);
    setEditTarget(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    toast.success("Staff member removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Personnel</h2>
          <p className="text-sm text-muted-foreground">
            {staff.length} staff member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-ocid="personnel.primary_button">
              <PlusCircle className="h-4 w-4 mr-2" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent data-ocid="personnel.dialog">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Full Name</Label>
                <Input
                  id="add-name"
                  data-ocid="personnel.input"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger data-ocid="personnel.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                data-ocid="personnel.cancel_button"
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} data-ocid="personnel.submit_button">
                Add Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {staff.length === 0 ? (
        <div
          data-ocid="personnel.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg"
        >
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">
            No staff added yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first staff member above.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table data-ocid="personnel.table">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((m, i) => (
                <TableRow key={m.id} data-ocid={`personnel.item.${i + 1}`}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[m.role]}>{m.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(m)}
                        data-ocid={`personnel.edit_button.${i + 1}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            data-ocid={`personnel.delete_button.${i + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-ocid="personnel.dialog">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {m.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the staff member and may affect
                              existing roster data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-ocid="personnel.cancel_button">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(m.id)}
                              data-ocid="personnel.confirm_button"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent data-ocid="personnel.dialog">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                data-ocid="personnel.input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger data-ocid="personnel.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              data-ocid="personnel.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} data-ocid="personnel.save_button">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
