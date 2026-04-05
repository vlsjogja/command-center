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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightLeft,
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ClassPackage, ParticipantClass } from "@/types";
import { formatCurrency } from "@/lib/format";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { 
  getClassPackages, 
  getParticipants, 
  addClassPackage, 
  updateClassPackage, 
  deleteClassPackage, 
  assignParticipant, 
  removeAssignment, 
  moveAssignment 
} from "./actions";
import { Loader2 } from "lucide-react";
import type { Participant } from "@/types";

type PackageForm = Omit<ClassPackage, "id" | "createdAt"> & {
  durationValue: string;
  durationUnit: string;
};

const emptyForm: PackageForm = {
  name: "",
  description: "",
  learningDuration: "",
  durationValue: "1",
  durationUnit: "Bulan",
};

export default function ClassesPage() {
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigningPkgId, setAssigningPkgId] = useState<string | null>(null);
  const [viewingPkgId, setViewingPkgId] = useState<string | null>(null);
  const [viewSearch, setViewSearch] = useState("");
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [movingAssignmentId, setMovingAssignmentId] = useState<string | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignVisibleCount, setAssignVisibleCount] = useState(5);

  async function fetchClasses() {
    setIsLoading(true);
    const { data, error } = await getClassPackages();
    if (data) setPackages(data as any);
    if (error) toast.error("Gagal mengambil data kelas: " + error);
    setIsLoading(false);
  }

  async function fetchParticipants() {
    const { data, error } = await getParticipants();
    if (data) setParticipantsList(data as any);
  }

  useEffect(() => {
    fetchClasses();
    fetchParticipants();
  }, []);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: "class" | "assignment" } | null>(null);

  const filtered = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
  } = usePagination({ data: filtered, itemsPerPage: 10 });

  useEffect(() => {
    goToPage(1);
  }, [search]);

  function generateId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  async function handleAdd() {
    if (!form.name) { toast.error("Nama paket wajib diisi."); return; }
    
    const { error } = await addClassPackage({
      name: form.name,
      description: form.description,
      learningDuration: `${form.durationValue} ${form.durationUnit}`,
    });

    if (!error) {
      fetchClasses();
      setForm(emptyForm);
      setIsAddOpen(false);
      toast.success("Kelas berhasil ditambahkan.");
    } else {
      toast.error("Gagal menambah kelas: " + error);
    }
  }

  async function handleEdit() {
    if (!editingId || !form.name) return;
    
    const { error } = await updateClassPackage(editingId, {
      name: form.name,
      description: form.description,
      learningDuration: `${form.durationValue} ${form.durationUnit}`,
    });

    if (!error) {
      fetchClasses();
      setIsEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Kelas berhasil diperbarui.");
    } else {
      toast.error("Gagal memperbarui kelas: " + error);
    }
  }

  function initiateDelete(id: string, name: string) {
    const pkg = packages.find((p) => p.id === id);
    const assignedCount = (pkg as any)?.enrollments?.length ?? 0;
    
    if (assignedCount > 0) {
      toast.error("Hapus semua peserta terlebih dahulu sebelum menghapus kelas.");
      return;
    }
    setItemToDelete({ id, name, type: "class" });
    setDeleteConfirmOpen(true);
  }

  function initiateRemoveAssignment(id: string, participantName: string) {
    setItemToDelete({ id, name: participantName, type: "assignment" });
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;

    if (itemToDelete.type === "class") {
      const { error } = await deleteClassPackage(itemToDelete.id);
      if (!error) {
        fetchClasses();
        toast.success(`Kelas ${itemToDelete.name} berhasil dihapus.`);
      } else {
        toast.error("Gagal menghapus kelas: " + error);
      }
    } else {
      const { error } = await removeAssignment(itemToDelete.id);
      if (!error) {
        fetchClasses();
        toast.success(`Siswa ${itemToDelete.name} berhasil dihapus dari kelas.`);
      } else {
        toast.error("Gagal menghapus siswa dari kelas: " + error);
      }
    }

    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  }

  function openEdit(pkg: ClassPackage) {
    setEditingId(pkg.id);
    const durationParts = pkg.learningDuration.split(" ");
    const value = durationParts[0] || "1";
    const unit = durationParts[1] || "Bulan";
    setForm({ 
      name: pkg.name, 
      description: pkg.description || "", 
      learningDuration: pkg.learningDuration,
      durationValue: value,
      durationUnit: unit
    });
    setIsEditOpen(true);
  }

  function openAssign(pkgId: string) {
    setAssigningPkgId(pkgId);
    setSelectedParticipant("");
    setAssignSearch("");
    setAssignVisibleCount(5);
    setIsAssignOpen(true);
  }

  function openView(pkgId: string) {
    setViewingPkgId(pkgId);
    setIsViewOpen(true);
  }

  async function handleAssign() {
    if (!assigningPkgId || !selectedParticipant) { toast.error("Pilih siswa terlebih dahulu."); return; }
    
    const { error } = await assignParticipant(assigningPkgId, selectedParticipant);
    if (!error) {
      fetchClasses();
      setIsAssignOpen(false);
      toast.success("Siswa berhasil didaftarkan ke kelas.");
    } else {
      toast.error("Gagal mendaftarkan siswa: " + error);
    }
  }

  // Logic moved to confirmDelete
  function handleRemoveAssignment(id: string) {
    // This is now handled in confirmDelete
  }

  function openMove(assignmentId: string) {
    setMovingAssignmentId(assignmentId);
    setTargetClassId("");
    setIsMoveOpen(true);
  }

  async function handleMoveClass() {
    if (!movingAssignmentId || !targetClassId) { toast.error("Pilih kelas tujuan terlebih dahulu."); return; }
    
    const { error } = await moveAssignment(movingAssignmentId, targetClassId);
    if (!error) {
      await fetchClasses();
      setIsMoveOpen(false);
      setMovingAssignmentId(null);
      setTargetClassId("");
      toast.success("Siswa berhasil dipindahkan kelas.");
    } else {
      toast.error("Gagal memindahkan siswa: " + error);
    }
  }

  const getAssignedParticipants = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    return ((pkg as any)?.enrollments as any[]) || [];
  };

  const viewingPkg = packages.find((p) => p.id === viewingPkgId);
  const viewingParticipants = (viewingPkgId ? getAssignedParticipants(viewingPkgId) : []).filter(
    (a: any) => a.participant?.name.toLowerCase().includes(viewSearch.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Daftar Kelas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola kelas dan siswa</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                <Plus className="h-4 w-4" /> Tambah Kelas
              </Button>
            )} />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Tambah Kelas Baru</DialogTitle>
                <DialogDescription>Tambahkan data kelas kursus baru ke dalam sistem.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pkg-name">Nama Kelas *</Label>
                  <Input id="pkg-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: TOEFL Intensif" />
                </div>
                <div className="grid gap-2">
                  <Label>Durasi Pembelajaran *</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      min="1"
                      value={form.durationValue} 
                      onChange={(e) => setForm({ ...form, durationValue: e.target.value })} 
                      placeholder="Cth: 2" 
                      className="w-24"
                    />
                    <Select value={form.durationUnit} onValueChange={(val) => { if (val) setForm({ ...form, durationUnit: val }); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hari">Hari</SelectItem>
                        <SelectItem value="Bulan">Bulan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pkg-desc">Deskripsi</Label>
                  <Textarea id="pkg-desc" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi fitur atau materi kelas..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAdd}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari kelas..." className="pl-11 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Class Cards */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Memuat daftar kelas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedData.map((pkg) => {
              const assignedCount = (pkg as any)?.enrollments?.length ?? 0;
              return (
                <Card key={pkg.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-primary">{pkg.name}</CardTitle>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <BookOpen className="h-3.5 w-3.5" />
                        {pkg.learningDuration}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Users className="h-3.5 w-3.5" />
                        {assignedCount} Siswa Terdaftar
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 -mt-1 -mr-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(pkg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => initiateDelete(pkg.id, pkg.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-grow flex flex-col justify-between space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                    {pkg.description || "Tidak ada deskripsi untuk kelas ini."}
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-9 gap-2" onClick={() => openView(pkg.id)}>
                      <Users className="h-4 w-4" /> Lihat Kelas
                    </Button>
                    <Button className="flex-1 h-9 gap-2" onClick={() => openAssign(pkg.id)}>
                      <UserPlus className="h-4 w-4" /> Assign Siswa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}

        {!isLoading && totalItems > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={totalItems}
            itemsPerPage={10}
          />
        )}

        {/* Edit Package Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Kelas</DialogTitle>
              <DialogDescription>Perbarui informasi data kelas kursus.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pkg-name-edit">Nama Kelas *</Label>
                <Input id="pkg-name-edit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: TOEFL Intensif" />
              </div>
              <div className="grid gap-2">
                <Label>Durasi Pembelajaran *</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    min="1"
                    value={form.durationValue} 
                    onChange={(e) => setForm({ ...form, durationValue: e.target.value })} 
                    placeholder="Cth: 2" 
                    className="w-24"
                  />
                  <Select value={form.durationUnit} onValueChange={(val) => { if (val) setForm({ ...form, durationUnit: val }); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hari">Hari</SelectItem>
                      <SelectItem value="Bulan">Bulan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pkg-desc-edit">Deskripsi</Label>
                <Textarea id="pkg-desc-edit" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi fitur atau materi kelas..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button onClick={handleEdit}>Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Participant Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Tambah Siswa</DialogTitle>
              <DialogDescription>Cari dan tambah siswa ke dalam kelas ini secara langsung.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4 flex flex-col overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama atau email siswa..." 
                  className="pl-9" 
                  value={assignSearch} 
                  onChange={(e) => {
                    setAssignSearch(e.target.value);
                    setAssignVisibleCount(5); // Reset visible count on search
                  }} 
                />
              </div>
              
              <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                {(() => {
                  const filteredParticipants = participantsList.filter(p => 
                    p.name.toLowerCase().includes(assignSearch.toLowerCase()) || 
                    p.email.toLowerCase().includes(assignSearch.toLowerCase())
                  );
                  const visibleParticipants = filteredParticipants.slice(0, assignVisibleCount);
                  
                  if (visibleParticipants.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Tidak ada siswa ditemukan.
                      </div>
                    );
                  }

                  return (
                    <>
                      {visibleParticipants.map((p) => {
                        const isSelected = selectedParticipant === p.id;
                        const currentPkg = packages.find(pkg => pkg.id === assigningPkgId);
                        const isAlreadyInClass = (currentPkg as any)?.enrollments?.some((a: any) => a.participantId === p.id);
                        
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => !isAlreadyInClass && setSelectedParticipant(p.id)}
                            className={`
                              flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                              ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}
                              ${isAlreadyInClass ? "opacity-50 cursor-not-allowed grayscale" : ""}
                            `}
                          >
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                            {isAlreadyInClass ? (
                              <Badge variant="secondary" className="text-[10px]">Terdaftar</Badge>
                            ) : isSelected ? (
                              <Badge className="bg-primary hover:bg-primary text-[10px]">Terpilih</Badge>
                            ) : null}
                          </div>
                        );
                      })}
                      
                      {filteredParticipants.length > assignVisibleCount && (
                        <button 
                          onClick={() => setAssignVisibleCount(prev => prev + 10)}
                          className="w-full py-3 text-xs text-primary font-medium hover:underline transition-all"
                        >
                          Load More (+10 Siswa)
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Batal</Button>
              <Button onClick={handleAssign} disabled={!selectedParticipant} className="gap-2">
                <UserPlus className="h-4 w-4" /> Tambah ke Kelas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Participants Dialog */}
        <Dialog open={isViewOpen} onOpenChange={(v) => { setIsViewOpen(v); if (!v) setViewSearch(""); }}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Siswa {viewingPkg?.name}
              </DialogTitle>
              <DialogDescription>
                Daftar siswa yang terdaftar di kelas ini.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama siswa..." 
                  className="pl-9" 
                  value={viewSearch} 
                  onChange={(e) => setViewSearch(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto py-2">
              {viewingParticipants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>{viewSearch ? "Tidak ada siswa yang cocok dengan pencarian." : "Belum ada siswa di kelas ini."}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-bold">Nama Siswa</TableHead>
                        <TableHead className="font-bold">Tanggal Daftar</TableHead>
                        <TableHead className="text-right font-bold">Aksi Siswa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingParticipants.map((a: any) => (
                        <TableRow key={a.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{a.participant?.name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{a.participant?.email ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs gap-1 hover:text-blue-600 hover:bg-blue-50" 
                                onClick={() => openMove(a.id)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" /> Pindah
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                onClick={() => initiateRemoveAssignment(a.id, a.participant?.name || "Siswa")}
                              >
                                <X className="h-3.5 w-3.5" /> Hapus
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>
              <Button onClick={() => { setIsViewOpen(false); if (viewingPkgId) openAssign(viewingPkgId); }}>
                <UserPlus className="h-4 w-4 mr-2" /> Tambah Siswa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move Participant Dialog */}
        <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" /> Pindahkan Kelas
              </DialogTitle>
              <DialogDescription>
                Pindahkan <strong>{(viewingParticipants.find((a: any) => a.id === movingAssignmentId) as any)?.participant?.name || "Siswa"}</strong> ke kelas lain.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Pilih Kelas Tujuan</Label>
              <Select value={targetClassId} onValueChange={(val) => { if (val) setTargetClassId(val); }}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Pilih kelas tujuan..." />
                </SelectTrigger>
                <SelectContent>
                  {packages
                    .filter(p => p.id !== (viewingParticipants.find((a: any) => a.id === movingAssignmentId) as any)?.classPackageId)
                    .map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Batal</Button>
              <Button onClick={handleMoveClass} className="gap-2">
                <ArrowRightLeft className="h-4 w-4" /> Konfirmasi Pindah
              </Button>
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
