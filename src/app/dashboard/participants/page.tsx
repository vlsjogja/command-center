"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Plus,
  Search,
  Upload,
  Pencil,
  Trash2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  MessageCircle,
  History,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import type { Participant, Payment, Package, ActivityLog } from "@/types";
import { 
  dummyParticipants, 
  dummyPayments, 
  dummyPackages, 
  dummyActivityLogs, 
  dummyUsers 
} from "@/lib/dummy-data";
import { useAuth } from "@/lib/auth-context";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { calculateEffectiveStatus } from "@/lib/format";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";

type FormData = Omit<Participant, "id"> & { reason?: string };

const emptyForm: FormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
  createdAt: new Date().toISOString().split("T")[0],
  reason: "",
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(dummyParticipants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [initialStatus, setInitialStatus] = useState<Participant["status"] | null>(null);
  const [csvPreview, setCsvPreview] = useState<(Omit<Participant, "id">)[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const filtered = participants.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
  } = usePagination({ data: filtered, itemsPerPage: 20 });

  function generateId() {
    return `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  function handleAdd() {
    if (!form.name || !form.email) {
      toast.error("Nama dan email wajib diisi.");
      return;
    }
    const pCreatedBy = user?.name || "Admin";
    const newP: Participant = {
      ...form,
      id: generateId(),
      createdAt: new Date(form.createdAt).toISOString(),
      createdBy: pCreatedBy,
      statusHistory: [
        {
          status: "active",
          changedAt: new Date().toISOString(),
          changedBy: pCreatedBy,
          reason: "Pendaftaran awal",
        },
      ],
    };
    const { reason, ...cleanP } = newP as any;
    setParticipants((prev) => [cleanP, ...prev]);
    setForm(emptyForm);
    setIsAddOpen(false);
    toast.success("Siswa berhasil ditambahkan.");
  }

  function handleEdit() {
    if (!editingId || !form.name || !form.email) return;
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === editingId) {
          const hasStatusChanged = p.status !== form.status;
          const updatedHistory = [...(p.statusHistory || [])];
          
          if (hasStatusChanged) {
            updatedHistory.push({
              status: form.status,
              changedAt: new Date().toISOString(),
              changedBy: user?.name || "Admin",
              reason: form.status === "inactive" ? form.reason : "Perubahan status manual",
            });
          }

          const { reason, ...cleanForm } = form;
          return { 
            ...p, 
            ...cleanForm, 
            createdAt: new Date(form.createdAt).toISOString(),
            statusHistory: updatedHistory
          };
        }
        return p;
      })
    );
    setIsEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    toast.success("Data siswa berhasil diperbarui.");
  }

  function initiateDelete(id: string, name: string) {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (itemToDelete) {
      setParticipants((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      toast.success(`Siswa ${itemToDelete.name} berhasil dihapus.`);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  }

  function openEdit(p: Participant) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      status: p.status,
      createdAt: p.createdAt.split("T")[0],
      reason: "",
    });
    setInitialStatus(p.status);
    setIsEditOpen(true);
  }

  function openLogs(p: Participant) {
    setSelectedParticipant(p);
    setIsLogOpen(true);
  }

  const formatPhoneForWhatsapp = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    }
    return cleaned;
  };

  const getParticipantPayments = (id: string) => {
    return dummyPayments
      .filter((pay) => pay.participantId === id)
      .map((pay) => {
        const pkg = dummyPackages.find((p) => p.id === pay.classPackageId);
        const { effectiveStatus } = calculateEffectiveStatus(
          pay.paymentStatus,
          pay.billingTime,
          pay.paymentTime,
          pkg?.durasi ?? 1
        );
        return { ...pay, effectiveStatus };
      });
  };

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: FormData[] = [];
        for (const row of results.data as Record<string, string>[]) {
          parsed.push({
            name: row.name || row.nama || "",
            email: row.email || "",
            phone: row.phone || row.telepon || row.hp || "",
            address: row.address || row.alamat || "",
            status: ["active", "inactive", "graduated"].includes(row.status?.toLowerCase()) 
              ? (row.status.toLowerCase() as Participant["status"]) 
              : "active",
            createdAt: row.createdAt || row.tanggal_bergabung || row.join_date || new Date().toISOString().split("T")[0],
          });
        }
        setCsvPreview(parsed.filter((p) => p.name && p.email));
        toast.info(`${parsed.filter((p) => p.name && p.email).length} data ditemukan.`);
      },
      error: () => {
        toast.error("Gagal membaca file CSV.");
      },
    });
  }

  function handleCsvImport() {
    const pCreatedBy = user?.name || "Admin";
    const newParticipants = csvPreview.map((data) => ({
      ...data,
      id: generateId(),
      createdAt: new Date(data.createdAt).toISOString(),
      createdBy: pCreatedBy,
      statusHistory: [
        {
          status: data.status || "active",
          changedAt: new Date().toISOString(),
          changedBy: pCreatedBy,
          reason: "Import CSV",
        },
      ],
    }));
    setParticipants((prev) => [...newParticipants, ...prev]);
    setCsvPreview([]);
    setIsCsvOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(`${newParticipants.length} siswa berhasil diimport.`);
  }

  function downloadTemplate() {
    const csv = "name,email,phone,address,status,createdAt\nJohn Doe,john@example.com,081234567890,Jl. Contoh No.1,active,2026-04-01";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_siswa.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "active": return "Aktif";
      case "inactive": return "Tidak Aktif";
      case "graduated": return "Lulus";
      default: return status;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Aktif</Badge>;
      case "inactive":
        return <Badge variant="secondary">Tidak Aktif</Badge>;
      case "graduated":
        return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">Lulus</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const LogDialog = () => {
    if (!selectedParticipant) return null;
    const payments = getParticipantPayments(selectedParticipant.id);
    
    return (
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Log Aktivitas: {selectedParticipant.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Pendaftaran */}
            <div className="relative pl-6 border-l-2 border-emerald-200 pb-2">
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-700">Pendaftaran Siswa</p>
                <p className="text-xs text-muted-foreground">{new Date(selectedParticipant.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-sm">Dimasukkan oleh <span className="font-medium">{selectedParticipant.createdBy || "Admin"}</span></p>
              </div>
            </div>

            {/* Riwayat Kelas (Assignments/Moves) */}
            {dummyActivityLogs
              .filter(log => 
                log.targetId === selectedParticipant.id && 
                ["class_assign", "class_move", "class_unenroll", "enroll"].includes(log.action)
              )
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-indigo-200 pb-2">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-indigo-700">
                      {log.action === "class_assign" || log.action === "enroll" ? "Penempatan Kelas" : 
                       log.action === "class_move" ? "Perpindahan Kelas" : "Hapus dari Kelas"}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="bg-indigo-50/50 p-2 rounded text-sm border border-transparent hover:border-indigo-100 transition-colors">
                      <p>{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">Oleh <span className="font-medium">{dummyUsers.find(u => u.id === log.performedBy)?.name || log.performedBy}</span></p>
                    </div>
                  </div>
                </div>
              ))}

            {/* Riwayat Pembayaran */}
            {payments.length > 0 && payments.map((pay) => {
              const pkg = dummyPackages.find(p => p.id === pay.classPackageId);
              
              const statusConfig: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
                success: { label: "Pembayaran Berhasil", color: "text-blue-700", bgColor: "bg-blue-50/50", dotColor: "bg-blue-500" },
                pending: { label: "Menunggu Pembayaran", color: "text-amber-700", bgColor: "bg-amber-50/50", dotColor: "bg-amber-500" },
                overdue: { label: "Jatuh Tempo", color: "text-rose-700", bgColor: "bg-rose-50/50", dotColor: "bg-rose-500" },
                failed: { label: "Pembayaran Gagal", color: "text-slate-700", bgColor: "bg-slate-50/50", dotColor: "bg-slate-500" },
              };
              
              const config = statusConfig[pay.effectiveStatus as string] || statusConfig.pending;

              return (
                <div key={pay.id} className={`relative pl-6 border-l-2 pb-2 ${pay.effectiveStatus === 'overdue' ? 'border-rose-200' : 'border-blue-200'}`}>
                  <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full ${config.dotColor} border-2 border-white shadow-sm`} />
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(pay.paymentTime || pay.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className={`${config.bgColor} p-2 rounded text-sm space-y-1 border border-transparent hover:border-muted transition-colors`}>
                      <p>Paket: <span className="font-medium">{pkg?.nama || "Paket Kursus"}</span></p>
                      <p>Nominal: <span className="font-medium">Rp {pay.amount.toLocaleString('id-ID')}</span></p>
                      {pay.notes && <p className="text-xs text-muted-foreground mt-1">{pay.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Riwayat Status */}
            {selectedParticipant.statusHistory && selectedParticipant.statusHistory.map((log, idx) => (
              <div key={idx} className="relative pl-6 border-l-2 border-slate-200 pb-2">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-400 border-2 border-white shadow-sm" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Perubahan Status: {statusLabel(log.status)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.changedAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm">Oleh <span className="font-medium">{log.changedBy}</span></p>
                  {log.reason && (
                    <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                      "{log.reason}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nama Lengkap *</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama lengkap" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Telepon</Label>
        <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Masukkan alamat" rows={2} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Select value={form.status} onValueChange={(val) => { if (val) setForm({ ...form, status: val as Participant["status"] }); }}>
          <SelectTrigger><SelectValue>{form.status === "active" ? "Aktif" : form.status === "inactive" ? "Tidak Aktif" : "Lulus"}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Tidak Aktif</SelectItem>
            <SelectItem value="graduated">Lulus</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.status === "inactive" && initialStatus !== "inactive" && (
        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Label htmlFor="reason">Alasan Tidak Aktif *</Label>
          <Textarea 
            id="reason" 
            value={form.reason} 
            onChange={(e) => setForm({ ...form, reason: e.target.value })} 
            placeholder="Masukkan alasan siswa dinonaktifkan" 
            rows={2} 
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="joinDate">Tanggal Bergabung *</Label>
        <Input 
          id="joinDate" 
          type="date" 
          value={form.createdAt} 
          onChange={(e) => setForm({ ...form, createdAt: e.target.value })} 
        />
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["super_admin", "staff_pembayaran"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Siswa
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola data siswa kursus ({filtered.length} siswa)
            </p>
          </div>
          <div className="flex gap-2">
            {/* CSV Import */}
            <Dialog open={isCsvOpen} onOpenChange={setIsCsvOpen}>
              <DialogTrigger render={(props) => (
                <Button {...props} variant="outline" className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                  <Upload className="h-4 w-4" /> Import CSV
                </Button>
              )} />
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" /> Import Siswa dari CSV
                  </DialogTitle>
                  <DialogDescription>Upload file CSV dengan kolom: name, email, phone, address, status, createdAt</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[50vh] overflow-auto">
                  <div className="flex gap-2">
                    <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1 shrink-0">
                      <Download className="h-4 w-4" /> Template
                    </Button>
                  </div>
                  {csvPreview.length > 0 && (
                    <div className="border rounded-lg overflow-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telepon</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Bergabung</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="text-sm">{row.name}</TableCell>
                              <TableCell className="text-sm">{row.email}</TableCell>
                              <TableCell className="text-sm">{row.phone}</TableCell>
                              <TableCell>{statusBadge(row.status)}</TableCell>
                              <TableCell className="text-sm">{row.createdAt}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCsvOpen(false); setCsvPreview([]); }}>Batal</Button>
                  <Button onClick={handleCsvImport} disabled={csvPreview.length === 0} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Import {csvPreview.length} Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Participant */}
            <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setForm(emptyForm); }}>
              <DialogTrigger render={(props) => (
                <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                  <Plus className="h-4 w-4" /> Tambah Siswa
                </Button>
              )} />
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Tambah Siswa Baru</DialogTitle>
                  <DialogDescription>Isi data siswa baru di bawah ini.</DialogDescription>
                </DialogHeader>
                {formFields}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                  <Button onClick={handleAdd}>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama, email, atau telepon..." 
              className="pl-9 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm shadow-none">
              <SelectValue placeholder="Semua Status">
                {statusFilter === "all" ? "Semua Status" : statusFilter === "active" ? "Aktif" : statusFilter === "inactive" ? "Tidak Aktif" : "Lulus"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
              <SelectItem value="graduated">Lulus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden p-0 gap-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nama / Email</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Telepon</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Alamat</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Bergabung</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data siswa.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{p.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{p.address}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                            title="Chat WhatsApp"
                            onClick={() => window.open(`https://wa.me/${formatPhoneForWhatsapp(p.phone)}`, '_blank')}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                            title="Lihat Log"
                            onClick={() => openLogs(p)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => initiateDelete(p.id, p.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Siswa</DialogTitle>
              <DialogDescription>Perbarui data siswa.</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button onClick={handleEdit}>Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDelete}
          itemName={itemToDelete?.name || "Siswa ini"}
        />

        <LogDialog />
      </div>
    </RoleGuard>
  );
}
