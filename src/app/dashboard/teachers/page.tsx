"use client";

import { useState, useEffect } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Clock,
  BookOpen,
  ChevronRight,
  Plus,
  Search,
  Pencil,
  GraduationCap,
  Layers,
  UserCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Teacher, ClassPackage } from "@/types";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "./actions";
import { getPackages } from "../packages/actions";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

type TimeSlot = { startTime: string; endTime: string };

type ScheduleEntry = {
  day: string;
  times: TimeSlot[];
  enabled: boolean;
};

type Assignment = {
  className: string;
  schedule: ScheduleEntry[];
};

const defaultSchedule: ScheduleEntry[] = DAYS.map((day) => ({
  day,
  times: [{ startTime: "07:00", endTime: "09:00" }],
  enabled: false,
}));

type FormData = Omit<Teacher, "id" | "createdAt">;

const emptyForm: FormData = {
  name: "",
  phone: "",
  assignedClasses: "",
  schedule: "",
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // Modal States
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentAssignmentIdx, setCurrentAssignmentIdx] = useState<number | null>(null);
  const [tempSchedule, setTempSchedule] = useState<ScheduleEntry[]>([]);

  const fetchHistory = async () => {
    const { data: tRes } = await getTeachers();
    if (tRes) setTeachers(tRes as any);
  };

  async function loadData() {
    setIsLoading(true);
    const [tRes, pRes] = await Promise.all([getTeachers(), getPackages()]);
    if (tRes.data) setTeachers(tRes.data as any);
    if (pRes.data) setPackages(pRes.data as any);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync assignments to form.assignedClasses and form.schedule
  const syncAssignmentsToForm = (current: Assignment[]) => {
    const classNames = current.map((a) => a.className).filter(Boolean).join(", ");
    const schedules = current
      .map((a) => {
        const activeDays = a.schedule
          .filter((s) => s.enabled && s.times.length > 0)
          .map((s) => {
            const timeStr = s.times
              .map((t) => `${t.startTime}-${t.endTime}`)
              .join(", ");
            return `${s.day} (${timeStr})`;
          })
          .join(", ");
        return activeDays ? `${a.className}: ${activeDays}` : null;
      })
      .filter(Boolean)
      .join("; ");

    setForm((prev) => ({
      ...prev,
      assignedClasses: classNames,
      schedule: schedules,
    }));
  };

  const parseExistingData = (classStr: string, scheduleStr: string, currentPackages: ClassPackage[]): Assignment[] => {
    if (!classStr) return [];
    
    const classNames = classStr.split(", ");
    const scheduleMap: Record<string, string> = {};
    if (scheduleStr) {
      const segments = scheduleStr.includes(";") ? scheduleStr.split("; ") : [scheduleStr];
      segments.forEach(seg => {
        if (seg.includes(": ")) {
          const [label, days] = seg.split(": ");
          scheduleMap[label] = days;
        } else {
          scheduleMap["Jadwal"] = seg;
        }
      });
    }

    return classNames
      .filter((name) => currentPackages.some(pkg => pkg.name === name))
      .map((name) => {
        const entries = defaultSchedule.map((d) => ({ ...d, enabled: false, times: [] as TimeSlot[] }));
      const dayStr = scheduleMap[name] || scheduleMap["Jadwal"] || "";
      
      if (dayStr) {
        const daySegments = dayStr.split(/, (?=[A-Z])/);
        daySegments.forEach((ds) => {
          const match = ds.match(/(.*) \((.*)\)/);
          if (match) {
            const [, day, timesContent] = match;
            const timePairs = timesContent.split(", ");
            const index = entries.findIndex((e) => e.day === day);
            if (index !== -1) {
              entries[index].enabled = true;
              entries[index].times = timePairs.map(tp => {
                const [start, end] = tp.split("-");
                return { startTime: start || "07:00", endTime: end || "09:00" };
              });
            }
          }
        });
      }
      return { className: name, schedule: entries };
    });
  };

  const addAssignment = (className: string) => {
    const next = [...assignments, { 
      className, 
      schedule: defaultSchedule.map(d => ({ ...d, enabled: false })) 
    }];
    setAssignments(next);
    syncAssignmentsToForm(next);
    setIsAddClassModalOpen(false);
    setSearchQuery("");
  };

  const removeAssignment = (index: number) => {
    const next = assignments.filter((_, i) => i !== index);
    setAssignments(next);
    syncAssignmentsToForm(next);
    toast.info("Tugas kelas dihapus.");
  };

  const openScheduleModal = (index: number) => {
    setCurrentAssignmentIdx(index);
    setTempSchedule(JSON.parse(JSON.stringify(assignments[index].schedule)));
    setIsScheduleModalOpen(true);
  };

  const saveSchedule = () => {
    if (currentAssignmentIdx === null) return;
    const next = [...assignments];
    next[currentAssignmentIdx].schedule = tempSchedule;
    setAssignments(next);
    syncAssignmentsToForm(next);
    setIsScheduleModalOpen(false);
    toast.success("Jadwal disimpan.");
  };

  const updateTempSchedule = (sIndex: number, updates: Partial<ScheduleEntry>) => {
    const next = [...tempSchedule];
    next[sIndex] = { ...next[sIndex], ...updates };
    if (next[sIndex].enabled && next[sIndex].times.length === 0) {
      next[sIndex].times = [{ startTime: "07:00", endTime: "09:00" }];
    }
    setTempSchedule(next);
  };

  const addTimeSlot = (sIndex: number) => {
    const next = [...tempSchedule];
    next[sIndex].times.push({ startTime: "07:00", endTime: "09:00" });
    setTempSchedule(next);
  };

  const removeTimeSlot = (sIndex: number, tIndex: number) => {
    const next = [...tempSchedule];
    next[sIndex].times.splice(tIndex, 1);
    if (next[sIndex].times.length === 0) {
      next[sIndex].enabled = false;
    }
    setTempSchedule(next);
  };

  const updateTimeSlot = (sIndex: number, tIndex: number, updates: Partial<TimeSlot>) => {
    const next = [...tempSchedule];
    next[sIndex].times[tIndex] = { ...next[sIndex].times[tIndex], ...updates };
    setTempSchedule(next);
  };

  const filteredClassPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    !assignments.some(a => a.className === pkg.name)
  );

  const filtered = (teachers as any[]).filter((t: any) => {
    return (
      (t.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (t.assignedClasses?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (t.phone || "").includes(search)
    );
  });
  
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
  } = usePagination({ data: filtered, itemsPerPage: 20 });

  async function handleAdd() {
    if (!form.name || !form.phone) {
      toast.error("Nama dan No HP wajib diisi.");
      return;
    }
    const { error } = await createTeacher(form);
    if (error) {
      toast.error("Gagal menambahkan pengajar: " + error);
      return;
    }
    loadData();
    setForm(emptyForm);
    setAssignments([]);
    setIsAddOpen(false);
    toast.success("Pengajar berhasil ditambahkan.");
  }

  async function handleEdit() {
    if (!editingId || !form.name || !form.phone) return;
    const { error } = await updateTeacher(editingId, form);
    if (error) {
      toast.error("Gagal memperbarui pengajar: " + error);
      return;
    }
    loadData();
    setIsEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setAssignments([]);
    toast.success("Data pengajar berhasil diperbarui.");
  }

  function initiateDelete(id: string, name: string) {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (itemToDelete) {
      const { success, error } = await deleteTeacher(itemToDelete.id);
      if (success) {
        loadData();
        toast.success(`Pengajar ${itemToDelete.name} berhasil dihapus.`);
      } else {
        toast.error("Gagal menghapus: " + error);
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  }

  function openEdit(t: Teacher) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      phone: t.phone,
      assignedClasses: t.assignedClasses,
      schedule: t.schedule,
    });
    setAssignments(parseExistingData(t.assignedClasses, t.schedule, packages));
    setIsEditOpen(true);
  }

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nama Pengajar *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Masukkan nama pengajar"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">No HP *</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="081234567890"
        />
      </div>
      <div className="grid gap-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-bold text-base">
            <BookOpen className="h-5 w-5 text-primary" /> Kelas yang Diampu
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddClassModalOpen(true)}
            className="h-8 gap-1.5 font-semibold text-primary border-primary/20 hover:bg-primary/5 shadow-none"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Jadwal
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          {assignments.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground leading-relaxed">Admin harus mencari kelas kemudian menambahkannya untuk melakukan penugasan.</p>
              <Button 
                variant="link" 
                className="mt-1 h-auto p-0 font-bold"
                onClick={() => setIsAddClassModalOpen(true)}
              >
                Cari Kelas Sekarang
              </Button>
            </div>
          ) : (
            assignments.map((assignment, aIndex) => (
              <div 
                key={aIndex} 
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/5 group hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {aIndex + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate leading-none">{assignment.className}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignment.schedule.filter(s => s.enabled).length > 0 ? (
                        assignment.schedule.filter(s => s.enabled).map((s, si) => (
                          <Badge key={si} variant="secondary" className="px-1 py-0 text-[11px] h-3.5 bg-muted text-muted-foreground leading-none whitespace-nowrap">
                            {s.day}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-destructive/80 font-medium">Jadwal belum diatur</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-lg px-2"
                    onClick={() => openScheduleModal(aIndex)}
                  >
                    <Clock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Set Jadwal</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => removeAssignment(aIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" /> Pengajar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola data instruktur dan jadwal mengajar ({filtered.length} pengajar)
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) { setForm(emptyForm); setAssignments([]); } }}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                <Plus className="h-4 w-4" /> Tambah Pengajar
              </Button>
            )} />
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
              <DialogHeader className="p-6 pb-2 bg-muted/30">
                <DialogTitle className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                  <UserCheck className="h-6 w-6" /> Tambah Pengajar Baru
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Isi data profil dan pilih kelas yang akan diampu.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 px-6">
                {formFields}
              </ScrollArea>
              <DialogFooter className="px-6 pb-6 pt-2 bg-muted/30 mt-auto">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAdd}>Simpan Pengajar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, no hp, atau kelas..."
            className="pl-11 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden p-0 gap-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-none">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide px-4 py-3 w-px whitespace-nowrap">Pengajar</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide px-4 py-3">Penugasan (Kelas & Jadwal)</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide px-6 py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat data pengajar...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <Search className="h-10 w-10" />
                        <p className="text-sm font-medium">Tidak ada data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((t) => {
                    const teacherAssignments = parseExistingData(t.assignedClasses || "", t.schedule || "", packages);
                    return (
                      <TableRow key={t.id} className="hover:bg-primary/[0.02] transition-colors border-b border-muted/50 group align-top">
                        <TableCell className="px-4 py-6 align-top w-px whitespace-nowrap">
                          <div className="flex flex-col gap-1 pt-1 max-w-[180px]">
                            <span className="font-bold text-foreground truncate leading-tight">{t.name}</span>
                            <span className="text-xs text-muted-foreground font-medium">{t.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-6 align-top font-bold text-foreground">
                          <div className="flex flex-col gap-6">
                            {teacherAssignments.length > 0 ? (
                              teacherAssignments.map((a, idx) => (
                                <div key={idx} className="grid grid-cols-[200px_1fr] gap-x-8 gap-y-4">
                                  <span className="text-sm font-bold pt-1 leading-tight break-words pr-4">
                                    {a.className}
                                  </span>
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 max-w-[400px]">
                                    {a.schedule.filter(s => s.enabled).length > 0 ? (
                                      a.schedule.filter(s => s.enabled).map((s, si) => (
                                        <div key={si} className="flex flex-col items-start gap-1">
                                          <span className="text-[11px] font-bold text-foreground/80">{s.day}</span>
                                          <div className="flex flex-col gap-1">
                                            {s.times.map((ti_entry, ti_idx) => (
                                              <Badge key={ti_idx} variant="secondary" className="bg-muted/50 text-muted-foreground text-[11px] h-5 px-1.5 font-medium border-none shadow-none whitespace-nowrap">
                                                {ti_entry.startTime} - {ti_entry.endTime}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-destructive/50 text-[11px] font-medium flex items-center">Jadwal belum diatur</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-6 align-top">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                              onClick={() => initiateDelete(t.id, t.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {totalItems > 0 && (
            <div className="p-4 border-t bg-muted/50">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={totalItems}
                itemsPerPage={20}
              />
            </div>
          )}
        </Card>

        {/* Edit Teacher Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); setAssignments([]); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
            <DialogHeader className="p-6 pb-2 bg-muted/30">
              <DialogTitle className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                <UserCheck className="h-6 w-6" /> Edit Pengajar
              </DialogTitle>
              <DialogDescription>
                Perbarui data profil dan jadwal mengajar pengajar ini.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6">
              {formFields}
            </ScrollArea>
            <DialogFooter className="p-6 pt-2 bg-muted/30 mt-auto">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button onClick={handleEdit}>Perbarui Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Class Search Dialog */}
        <Dialog open={isAddClassModalOpen} onOpenChange={setIsAddClassModalOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="p-5 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" /> Cari Kelas
              </DialogTitle>
              <DialogDescription>
                Cari kelas yang ingin ditugaskan.
              </DialogDescription>
            </DialogHeader>
            <div className="p-5 pt-0 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Masukkan nama kelas..."
                  className="pl-10 h-11 bg-card border border-border/60 rounded-xl focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-1.5">
                  {filteredClassPackages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      {searchQuery ? "Tidak ada kelas yang ditemukan." : "Mulai mengetik untuk mencari..."}
                    </div>
                  ) : (
                    filteredClassPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        className="w-full text-left p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-between group"
                        onClick={() => addAssignment(pkg.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold block truncate">{pkg.name}</span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{pkg.description || "Pilih kelas ini"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge variant="outline" className="text-[11px] font-medium h-5 px-1.5 border-primary/20 text-primary bg-primary/5">Pilih</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
          <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Atur Jadwal
              </DialogTitle>
              <DialogDescription className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4">
                {currentAssignmentIdx !== null && assignments[currentAssignmentIdx]?.className}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {tempSchedule.map((entry, sIndex) => (
                <div key={entry.day} className="flex flex-col gap-3 py-4 border-b border-muted/30 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`modal-day-${entry.day}`}
                        checked={entry.enabled}
                        onCheckedChange={(checked) =>
                          updateTempSchedule(sIndex, { enabled: !!checked })
                        }
                      />
                      <Label 
                        htmlFor={`modal-day-${entry.day}`}
                        className="text-sm font-bold cursor-pointer"
                      >
                        {entry.day}
                      </Label>
                    </div>
                    {entry.enabled && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addTimeSlot(sIndex)}
                        className="h-7 text-[11px] uppercase tracking-wide font-bold text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Tambah Jam
                      </Button>
                    )}
                  </div>
                  
                  {entry.enabled && (
                    <div className="space-y-3 ml-7">
                      {entry.times.map((time, tIndex) => (
                        <div key={tIndex} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                          <Select
                            value={time.startTime}
                            onValueChange={(v) => updateTimeSlot(sIndex, tIndex, { startTime: v ?? "" })}
                          >
                            <SelectTrigger className="h-9 bg-muted/20 border-none rounded-xl shadow-none grow text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground font-bold text-xs">—</span>
                          <Select
                            value={time.endTime}
                            onValueChange={(v) => updateTimeSlot(sIndex, tIndex, { endTime: v ?? "" })}
                          >
                            <SelectTrigger className="h-9 bg-muted/20 border-none rounded-xl shadow-none grow text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            onClick={() => removeTimeSlot(sIndex, tIndex)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="p-6 bg-muted/5 mt-auto">
              <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>Batal</Button>
              <Button onClick={saveSchedule}>Selesai & Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDelete}
          itemName={itemToDelete?.name || "data ini"}
        />
      </div>
    </RoleGuard>
  );
}
