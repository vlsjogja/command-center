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
import { useAuth } from "@/lib/auth-context";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { calculateEffectiveStatus } from "@/lib/format";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { getParticipants, addParticipant, updateParticipant, deleteParticipant, bulkAddParticipants } from "./actions";
import { Loader2 } from "lucide-react";

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

interface LogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
  search: string;
  onSearchChange: (search: string) => void;
}

const LogDialog = ({ isOpen, onOpenChange, participant, search, onSearchChange }: LogDialogProps) => {
  if (!participant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { onOpenChange(v); if (!v) onSearchChange(""); }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Log Aktivitas: {participant.name}
          </DialogTitle>
        </DialogHeader>
        <div className="pt-4 px-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari aktivitas..." 
              className="pl-9 h-9" 
              value={search} 
              onChange={(e) => onSearchChange(e.target.value)} 
            />
          </div>
        </div>
        <div className="space-y-6 py-4 px-2 mt-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
          {/* Unified Logs (Chronological) */}
          {(() => {
            const allLogs = [
              // 1. Initial Creation
              {
                id: 'creation',
                type: 'creation',
                timestamp: new Date(participant.createdAt),
                title: 'Pendaftaran Siswa',
                details: `Dimasukkan oleh ${participant.createdBy || "Admin"}`,
                performedBy: participant.createdBy || "Admin",
                colorClass: "bg-emerald-500",
                borderClass: "border-emerald-200",
                titleClass: "text-emerald-700",
                bgClass: "bg-emerald-50/30"
              },
              // 2. Activity Logs
              ...(participant.activityLogs || []).map(log => {
                const isPayment = log.action === 'payment_success';
                const isEnrollment = ['class_assign', 'enroll', 'class_move'].includes(log.action);
                
                let label: string = log.action;
                let colorClass = "bg-slate-500";
                let borderClass = "border-slate-200";
                let titleClass = "text-slate-700";
                let bgClass = "bg-slate-50/50";

                if (isPayment) {
                  colorClass = "bg-blue-500";
                  borderClass = "border-blue-200";
                  titleClass = "text-blue-700";
                  bgClass = "bg-blue-50/50";
                  label = "Pembayaran Berhasil";
                } else if (isEnrollment) {
                  colorClass = "bg-indigo-500";
                  borderClass = "border-indigo-200";
                  titleClass = "text-indigo-700";
                  bgClass = "bg-indigo-50/50";
                  label = log.action === 'class_move' ? "Perpindahan Kelas" : "Penempatan Kelas";
                }

                return {
                  id: log.id,
                  type: 'activity',
                  timestamp: new Date(log.timestamp),
                  title: label,
                  details: log.details,
                  performedBy: log.performedBy,
                  colorClass,
                  borderClass,
                  titleClass,
                  bgClass
                };
              }),
              // 3. Status History
              ...(participant.statusHistory || []).map((log, idx) => ({
                id: `status-${idx}`,
                type: 'status',
                timestamp: new Date(log.changedAt),
                title: `Perubahan Status: ${statusLabel(log.status)}`,
                details: log.reason || "Perubahan status manual",
                performedBy: log.changedBy,
                colorClass: "bg-slate-400",
                borderClass: "border-slate-200",
                titleClass: "text-slate-700",
                bgClass: "bg-slate-50/50"
              }))
            ];

            const filteredLogs = allLogs
              .filter(log => 
                log.title.toLowerCase().includes(search.toLowerCase()) || 
                log.details.toLowerCase().includes(search.toLowerCase())
              )
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            if (filteredLogs.length === 0) {
              return (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">Aktivitas tidak ditemukan.</p>
                </div>
              );
            }

            return filteredLogs.map((log) => (
              <div key={log.id} className={`relative pl-6 border-l-2 ${log.borderClass} pb-2`}>
                <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full ${log.colorClass} border-2 border-white shadow-sm`} />
                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${log.titleClass}`}>{log.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <div className={`${log.bgClass} p-2 rounded text-sm border border-transparent hover:border-muted transition-colors`}>
                    <p>{log.details}</p>
                    {log.type !== 'creation' && (
                      <p className="text-xs text-muted-foreground mt-1 text-right italic">
                        Oleh {log.performedBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ParticipantFormProps {
  form: FormData;
  setForm: (form: FormData) => void;
  initialStatus: Participant["status"] | null;
}

const ParticipantForm = ({ form, setForm, initialStatus }: ParticipantFormProps) => {
  return (
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
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [logSearch, setLogSearch] = useState("");
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  async function fetchParticipants() {
    setIsLoading(true);
    const { data, error } = await getParticipants();
    if (data) setParticipants(data as unknown as Participant[]);
    if (error) toast.error("Gagal mengambil data siswa: " + error);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchParticipants();
  }, []);

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

  async function handleAdd() {
    if (!form.name || !form.email) {
      toast.error("Nama dan email wajib diisi.");
      return;
    }

    const payload = {
      ...form,
      createdBy: user?.name || "Admin",
      createdAt: new Date(form.createdAt).toISOString(),
    };

    toast.promise(addParticipant(payload), {
      loading: "Menambahkan siswa...",
      success: ({ error }) => {
        if (error) throw new Error(error);
        fetchParticipants();
        setIsAddOpen(false);
        setForm(emptyForm);
        return "Siswa berhasil ditambahkan.";
      },
      error: (err) => err.message
    });
  }

  async function handleEdit() {
    if (!editingId || !form.name || !form.email) return;

    const payload = {
      ...form,
      performedBy: user?.name || "Admin",
    };

    toast.promise(updateParticipant(editingId, payload), {
      loading: "Memperbarui data siswa...",
      success: ({ error }) => {
        if (error) throw new Error(error);
        fetchParticipants();
        setIsEditOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        return "Data siswa berhasil diperbarui.";
      },
      error: (err) => err.message
    });
  }

  function initiateDelete(id: string, name: string) {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (itemToDelete) {
      toast.promise(deleteParticipant(itemToDelete.id), {
        loading: "Menghapus data siswa...",
        success: ({ success, error }) => {
          if (error) throw new Error(error);
          fetchParticipants();
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
          return `Siswa ${itemToDelete.name} berhasil dihapus.`;
        },
        error: (err) => err.message
      });
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
      createdAt: new Date(p.createdAt).toISOString().split("T")[0],
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

  async function handleCsvImport() {
    const pCreatedBy = user?.name || "Admin";
    const newParticipants = csvPreview.map((data) => ({
      ...data,
      createdBy: pCreatedBy,
      createdAt: new Date(data.createdAt).toISOString(),
    }));

    toast.promise(bulkAddParticipants(newParticipants), {
      loading: "Mengimport data siswa...",
      success: ({ success, error }) => {
        if (error) throw new Error(error);
        fetchParticipants();
        setCsvPreview([]);
        setIsCsvOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return `${newParticipants.length} siswa berhasil diimport.`;
      },
      error: (err) => err.message
    });
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
                  <ParticipantForm form={form} setForm={setForm} initialStatus={null} />
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                        <p className="text-sm font-medium">Memuat data siswa...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data siswa.</TableCell>
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
            <ParticipantForm form={form} setForm={setForm} initialStatus={initialStatus} />
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

        <LogDialog 
          isOpen={isLogOpen} 
          onOpenChange={setIsLogOpen} 
          participant={selectedParticipant} 
          search={logSearch} 
          onSearchChange={setLogSearch} 
        />
      </div>
    </RoleGuard>
  );
}
