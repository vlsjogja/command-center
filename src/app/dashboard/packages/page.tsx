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
import { Card } from "@/components/ui/card";
import {
  CreditCard,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Package } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination";
import { getPackages, getClassPackages, addPackage, updatePackage, deletePackage } from "./actions";
import { Loader2 } from "lucide-react";
import type { ClassPackage } from "@/types";

type PackageForm = {
  nama: string;
  nominal: number;
  kelas: string;
  durasi: 1 | 2 | 3;
  type: "one_time" | "subscription";
  deskripsi: string;
  status: "active" | "inactive";
};

const emptyForm: PackageForm = {
  nama: "",
  nominal: 0,
  kelas: "",
  durasi: 1,
  type: "subscription",
  deskripsi: "",
  status: "active",
};

export default function PackagesPage() {
  const [packagesData, setPackagesData] = useState<Package[]>([]);
  const [classPackagesData, setClassPackagesData] = useState<ClassPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [isKelasSelectOpen, setIsKelasSelectOpen] = useState(false);
  const [kelasSearch, setKelasSearch] = useState("");
  const [kelasVisibleCount, setKelasVisibleCount] = useState(10);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  async function fetchData() {
    setIsLoading(true);
    const [pkgs, clPkgs] = await Promise.all([
      getPackages(),
      getClassPackages(),
    ]);

    if (pkgs.data) setPackagesData(pkgs.data as any);
    if (clPkgs.data) setClassPackagesData(clPkgs.data as any);
    
    if (pkgs.error) toast.error("Gagal mengambil data paket: " + pkgs.error);
    if (clPkgs.error) toast.error("Gagal mengambil data kelas: " + clPkgs.error);
    
    setIsLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = packagesData.filter((p) => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) || (p.deskripsi?.toLowerCase().includes(search.toLowerCase()) ?? false);
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
    return `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  async function handleAdd() {
    if (!form.nama || !form.kelas) {
      toast.error("Nama paket dan kelas wajib diisi.");
      return;
    }

    toast.promise(addPackage(form), {
      loading: "Menambahkan data paket...",
      success: ({ error }) => {
        if (error) throw new Error(error);
        fetchData();
        setIsAddOpen(false);
        setForm(emptyForm);
        setKelasSearch("");
        setKelasVisibleCount(10);
        return "Data paket berhasil ditambahkan.";
      },
      error: (err) => err.message
    });
  }

  async function handleEdit() {
    if (!editingId) return;

    toast.promise(updatePackage(editingId, form), {
      loading: "Memperbarui data paket...",
      success: ({ error }) => {
        if (error) throw new Error(error);
        fetchData();
        setIsEditOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setKelasSearch("");
        setKelasVisibleCount(10);
        return "Data paket berhasil diperbarui.";
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
      toast.promise(deletePackage(itemToDelete.id), {
        loading: "Menghapus data paket...",
        success: ({ error }) => {
          if (error) throw new Error(error);
          fetchData();
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
          return `Data paket ${itemToDelete.name} berhasil dihapus.`;
        },
        error: (err) => err.message
      });
    }
  }

  function openEdit(packageData: Package) {
    setEditingId(packageData.id);
    setForm({
      nama: packageData.nama,
      nominal: packageData.nominal,
      kelas: packageData.kelas,
      durasi: packageData.durasi,
      type: packageData.type,
      deskripsi: packageData.deskripsi ?? "",
      status: packageData.status,
    });
    setIsEditOpen(true);
    setKelasSearch("");
    setKelasVisibleCount(10);
  }

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Nama Paket *</Label>
        <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: TOEFL Intensive" />
      </div>
      <div className="grid gap-2">
        <Label>Nominal (Rp) *</Label>
        <Input 
          type="text" 
          value={form.nominal === 0 ? "" : formatNumber(form.nominal)} 
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setForm({ ...form, nominal: val ? Number(val) : 0 });
          }} 
          placeholder="Contoh: 2.500.000" 
          onFocus={(e) => e.target.select()}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Kelas *</Label>
          <Button 
            variant="outline" 
            className="w-full justify-start font-normal h-10 border-input shadow-none hover:bg-muted/50"
            onClick={() => setIsKelasSelectOpen(true)}
          >
            {form.kelas ? (
              <span className="truncate">{classPackagesData.find(c => c.id === form.kelas)?.name}</span>
            ) : (
              <span className="text-muted-foreground">Pilih kelas...</span>
            )}
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>Durasi Pembayaran (Bulan) *</Label>
          <Select value={form.durasi.toString()} onValueChange={(val) => { if (val) setForm({ ...form, durasi: Number(val) as 1 | 2 | 3 }); }}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih durasi...">
                {form.durasi} Bulan
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Bulan</SelectItem>
              <SelectItem value="2">2 Bulan</SelectItem>
              <SelectItem value="3">3 Bulan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Tipe Paket *</Label>
        <Select value={form.type} onValueChange={(val) => { if (val) setForm({ ...form, type: val as any }); }}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih tipe...">
              {form.type === "subscription" ? "Berlangganan (Subscribe)" : "Sekali Bayar (One-Time)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="subscription">Berlangganan (Subscribe)</SelectItem>
            <SelectItem value="one_time">Sekali Bayar (One-Time)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Deskripsi</Label>
        <Textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Deskripsi paket..." rows={3} />
      </div>
      <div className="grid gap-2">
        <Label>Status *</Label>
        <Select value={form.status} onValueChange={(val) => { if (val) setForm({ ...form, status: val as Package["status"] }); }}>
          <SelectTrigger><SelectValue placeholder="Pilih status...">{form.status === "active" ? "Aktif" : "Tidak Aktif"}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Tidak Aktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderTable = (title: string, icon: React.ReactNode, tableHeaders: React.ReactNode) => {
    return (
      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
        <Card className="shadow-sm overflow-hidden p-0 gap-0">
          <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-2">
            {icon}
            <h2 className="font-semibold text-slate-700 dark:text-slate-400">{title} ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {tableHeaders}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                        <p className="text-sm font-medium text-muted-foreground">Memuat data paket...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((pkg) => {
                    const classInfo = classPackagesData.find((c) => c.id === pkg.kelas);
                    return (
                      <TableRow key={pkg.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{pkg.nama}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(pkg.nominal)}</TableCell>
                        <TableCell className="text-muted-foreground">{classInfo?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span>{pkg.durasi} bulan</span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
                              {pkg.type === "subscription" ? "Subscription" : "One-Time"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pkg.status === "active" ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" /> Tidak Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{pkg.deskripsi ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(pkg)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => initiateDelete(pkg.id, pkg.nama)}>
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
      </div>
    );
  };

  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" /> Paket Pembayaran
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola paket pembayaran dan harga
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                <Plus className="h-4 w-4" /> Tambah Paket
              </Button>
            )} />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader><DialogTitle>Tambah Data Paket</DialogTitle><DialogDescription>Tambahkan paket pembayaran baru.</DialogDescription></DialogHeader>
              {formFields}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAdd}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama paket atau deskripsi..." className="pl-9 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="w-full sm:w-40 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm shadow-none">
              <SelectValue placeholder="Semua Status">
                {statusFilter === "all" ? "Semua Status" : statusFilter === "active" ? "Aktif" : "Tidak Aktif"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderTable("Semua Paket", <Clock className="h-5 w-5" />, <>
          <TableHead className="font-semibold">Nama</TableHead>
          <TableHead className="font-semibold">Nominal</TableHead>
          <TableHead className="font-semibold">Kelas</TableHead>
          <TableHead className="font-semibold">Durasi</TableHead>
          <TableHead className="font-semibold">Status</TableHead>
          <TableHead className="font-semibold hidden md:table-cell">Deskripsi</TableHead>
          <TableHead className="font-semibold text-right">Aksi</TableHead>
        </>)}

        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>Edit Paket</DialogTitle><DialogDescription>Perbarui data paket.</DialogDescription></DialogHeader>
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
          itemName={itemToDelete?.name || "data ini"}
        />

        {/* Kelas Selection Dialog */}
        <Dialog open={isKelasSelectOpen} onOpenChange={(open) => {
          setIsKelasSelectOpen(open);
          if (!open) {
            setKelasSearch("");
            setKelasVisibleCount(10);
          }
        }}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                Pilih Kelas
              </DialogTitle>
              <DialogDescription className="text-sm">
                Cari dan pilih kelas untuk paket pembayaran ini.
              </DialogDescription>
            </DialogHeader>
            
            <div className="px-6 py-4 border-b bg-muted/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama atau deskripsi kelas..." 
                  className="pl-9 h-10 border-none bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20" 
                  value={kelasSearch} 
                  autoFocus
                  onChange={(e) => {
                    setKelasSearch(e.target.value);
                    setKelasVisibleCount(10);
                  }} 
                />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {(() => {
                const filteredClasses = classPackagesData.filter(c => 
                  c.name.toLowerCase().includes(kelasSearch.toLowerCase()) || 
                  c.description?.toLowerCase().includes(kelasSearch.toLowerCase())
                );
                const visibleClasses = filteredClasses.slice(0, kelasVisibleCount);
                
                if (visibleClasses.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-muted p-3 rounded-full mb-3">
                        <Search className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Tidak ada kelas ditemukan</p>
                      <p className="text-xs text-muted-foreground/60">Coba gunakan kata kunci pencarian lain.</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid gap-1 px-2">
                      {visibleClasses.map((c) => {
                        const isSelected = form.kelas === c.id;
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setForm({ ...form, kelas: c.id });
                              setIsKelasSelectOpen(false);
                            }}
                            className={`
                              group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                              ${isSelected 
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                : "border-transparent hover:bg-muted hover:border-border"
                              }
                            `}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{c.name}</p>
                                {isSelected && (
                                  <Badge className="h-5 px-1.5 bg-primary hover:bg-primary text-[10px] rounded-md">Terpilih</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                                {c.description || "Tidak ada deskripsi"}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {c.learningDuration}
                                </span>
                              </div>
                            </div>
                            <div className={`
                              h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all
                              ${isSelected ? "border-primary bg-primary" : "border-muted group-hover:border-primary/40"}
                            `}>
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white animate-in zoom-in-50 duration-200" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {filteredClasses.length > kelasVisibleCount && (
                      <div className="p-2 pt-0 mt-2">
                        <Button 
                          variant="ghost" 
                          className="w-full text-xs text-muted-foreground h-10 hover:bg-muted/50 rounded-xl"
                          onClick={() => setKelasVisibleCount(prev => prev + 10)}
                        >
                          Tampilkan lebih banyak (+10 Kelas)
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
              <Button variant="ghost" className="rounded-xl h-9 text-xs" onClick={() => setIsKelasSelectOpen(false)}>
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
