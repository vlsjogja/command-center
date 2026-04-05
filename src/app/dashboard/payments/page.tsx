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
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment, PaymentStatus } from "@/types";
import { dummyPayments, dummyParticipants, dummyPackages } from "@/lib/dummy-data";
import { UserPlus } from "lucide-react";
import { formatCurrency, formatNumber, formatDate, formatDateWithDay, calculateEffectiveStatus } from "@/lib/format";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";

type PaymentForm = {
  participantId: string;
  classPackageId: string;
  amount: number;
  paymentTime: string;
  billingTime: string;
  paymentStatus: PaymentStatus;
  participantStatus: "active" | "inactive" | "graduated";
  notes: string;
  reason: string;
};

const emptyForm: PaymentForm = {
  participantId: "",
  classPackageId: "",
  amount: 0,
  paymentTime: "",
  billingTime: "",
  paymentStatus: "pending",
  participantStatus: "active",
  notes: "",
  reason: "",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(dummyPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState<string>(new Date().getMonth().toString());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [initialParticipantStatus, setInitialParticipantStatus] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantVisibleCount, setParticipantVisibleCount] = useState(5);
  const [isSiswaSelectOpen, setIsSiswaSelectOpen] = useState(false);
  const [isPackageSelectOpen, setIsPackageSelectOpen] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageVisibleCount, setPackageVisibleCount] = useState(5);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  const months = [
    { value: "", label: "Semua Bulan" },
    { value: "0", label: "Januari" },
    { value: "1", label: "Februari" },
    { value: "2", label: "Maret" },
    { value: "3", label: "April" },
    { value: "4", label: "Mei" },
    { value: "5", label: "Juni" },
    { value: "6", label: "Juli" },
    { value: "7", label: "Agustus" },
    { value: "8", label: "September" },
    { value: "9", label: "Oktober" },
    { value: "10", label: "November" },
    { value: "11", label: "Desember" },
  ];

  const enhancedPayments = payments.map((p) => {
    const pkg = dummyPackages.find((c) => c.id === p.classPackageId);
    const { effectiveStatus, nextBillingDate } = calculateEffectiveStatus(
      p.paymentStatus,
      p.billingTime,
      p.paymentTime,
      pkg?.durasi ?? 1
    );

    return { 
      ...p, 
      effectiveStatus, 
      nextBillingDate
    };
  });

  const filtered = enhancedPayments.filter((p) => {
    const billingDate = p.nextBillingDate ? new Date(p.nextBillingDate) : null;
    const matchSearch =
      (dummyParticipants.find((d) => d.id === p.participantId)?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (p.notes?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchYear = yearFilter ? billingDate?.getFullYear().toString() === yearFilter : true;
    const matchMonth = monthFilter ? billingDate?.getMonth().toString() === monthFilter : true;
    const matchStatus = statusFilter === "all" || p.effectiveStatus === statusFilter;
    return matchSearch && matchYear && matchMonth && matchStatus;
  });

  const statusGroups = {
    belumBayar: filtered.filter((p) => p.effectiveStatus === "pending"),
    jatuhTempo: filtered.filter((p) => p.effectiveStatus === "overdue"),
    lunas: filtered.filter((p) => p.effectiveStatus === "success"),
  };

  const [activeTab, setActiveTab] = useState<"belumBayar" | "jatuhTempo" | "lunas">("belumBayar");
  const itemsPerPage = 20;

  const {
    currentPage: pageBelumBayar,
    totalPages: totalPageBelumBayar,
    paginatedData: listBelumBayar,
    goToPage: setPageBelumBayar,
    totalItems: totalBelumBayar,
  } = usePagination({ data: statusGroups.belumBayar, itemsPerPage });

  const {
    currentPage: pageJatuhTempo,
    totalPages: totalPageJatuhTempo,
    paginatedData: listJatuhTempo,
    goToPage: setPageJatuhTempo,
    totalItems: totalJatuhTempo,
  } = usePagination({ data: statusGroups.jatuhTempo, itemsPerPage });

  const {
    currentPage: pageLunas,
    totalPages: totalPageLunas,
    paginatedData: listLunas,
    goToPage: setPageLunas,
    totalItems: totalLunas,
  } = usePagination({ data: statusGroups.lunas, itemsPerPage });

  const pagesConfig = {
    belumBayar: { page: pageBelumBayar, setPage: setPageBelumBayar, totalPages: totalPageBelumBayar, paginatedList: listBelumBayar, totalItems: totalBelumBayar },
    jatuhTempo: { page: pageJatuhTempo, setPage: setPageJatuhTempo, totalPages: totalPageJatuhTempo, paginatedList: listJatuhTempo, totalItems: totalJatuhTempo },
    lunas: { page: pageLunas, setPage: setPageLunas, totalPages: totalPageLunas, paginatedList: listLunas, totalItems: totalLunas },
  };

  const getPaginatedList = (list: any[], page: number) => {
    return list; // Not needed as we use paginatedList from hook
  };

  function generateId() {
    return `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  function handleAdd() {
    if (!form.participantId || !form.classPackageId) {
      toast.error("Siswa dan paket pembayaran wajib dipilih.");
      return;
    }
    const newPayment: Payment = {
      ...form,
      id: generateId(),
      paymentMethod: "manual_transfer",
      paymentTime: form.paymentTime || null,
      createdAt: new Date().toISOString(),
    };
    setPayments((prev) => [newPayment, ...prev]);
    setForm(emptyForm);
    setParticipantSearch("");
    setParticipantVisibleCount(5);
    setIsAddOpen(false);
    toast.success("Data pembayaran berhasil ditambahkan.");
  }

  function handleEdit() {
    if (!editingId) return;
    setPayments((prev) =>
      prev.map((p) =>
        p.id === editingId
          ? {
              ...p,
              ...form,
              paymentMethod: "manual_transfer" as const,
              paymentTime: form.paymentTime || null,
            }
          : p
      )
    );
    setIsEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setParticipantSearch("");
    setParticipantVisibleCount(5);
    toast.success("Data pembayaran berhasil diperbarui.");
  }

  function initiateDelete(id: string, participantName: string) {
    setItemToDelete({ id, name: `Pembayaran untuk ${participantName}` });
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (itemToDelete) {
      setPayments((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      toast.success("Data pembayaran berhasil dihapus.");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  }
  function openEdit(payment: Payment) {
    setEditingId(payment.id);
    setForm({
      participantId: payment.participantId,
      classPackageId: payment.classPackageId,
      amount: payment.amount,
      paymentTime: payment.paymentTime ?? "",
      billingTime: payment.billingTime,
      paymentStatus: payment.paymentStatus,
      participantStatus: payment.participantStatus,
      notes: payment.notes ?? "",
      reason: payment.reason ?? "",
    });
    setInitialParticipantStatus(payment.participantStatus);
    setParticipantSearch("");
    setParticipantVisibleCount(5);
    setIsEditOpen(true);
  }

  const statusConfig: Record<PaymentStatus, { label: string; icon: React.ReactNode; variant: "outline" | "destructive" | "secondary" | "default"; className?: string }> = {
    success: {
      label: "Sukses",
      icon: <CheckCircle2 className="h-4 w-4" />,
      variant: "outline",
      className: "border-success-border bg-success-muted text-success",
    },
    pending: {
      label: "Pending",
      icon: <Clock className="h-4 w-4" />,
      variant: "outline",
      className: "border-warning-border bg-warning-muted text-warning",
    },
    overdue: {
      label: "Jatuh Tempo",
      icon: <AlertTriangle className="h-4 w-4" />,
      variant: "destructive",
    },
    failed: {
      label: "Gagal",
      icon: <XCircle className="h-4 w-4" />,
      variant: "secondary",
    },
  };

  const participantStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="border-success-border bg-success-muted text-success text-xs">Aktif</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="text-xs">Tidak Aktif</Badge>;
      case "graduated":
        return <Badge variant="outline" className="border-info-border bg-info-muted text-info text-xs">Lulus</Badge>;
      default:
        return null;
    }
  };

  function toLocalDatetime(isoStr: string): string {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Siswa *</Label>
          <Button 
            variant="outline" 
            className="w-full justify-start font-normal h-10 border-input shadow-none hover:bg-muted/50"
            onClick={() => setIsSiswaSelectOpen(true)}
          >
            {form.participantId ? (
              <span className="truncate">{dummyParticipants.find(p => p.id === form.participantId)?.name}</span>
            ) : (
              <span className="text-muted-foreground">Pilih siswa...</span>
            )}
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>Paket Pembayaran *</Label>
          <Button 
            variant="outline" 
            className="w-full justify-start font-normal h-10 border-input shadow-none hover:bg-muted/50"
            onClick={() => setIsPackageSelectOpen(true)}
          >
            {form.classPackageId ? (
              <span className="truncate">{dummyPackages.find(p => p.id === form.classPackageId)?.nama}</span>
            ) : (
              <span className="text-muted-foreground">Pilih paket...</span>
            )}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Jumlah (Rp)</Label>
          <Input 
            type="text" 
            value={formatNumber(form.amount)} 
            readOnly 
            className="bg-muted/50 cursor-not-allowed" 
          />
        </div>
        <div className="grid gap-2">
          <Label>Status Pembayaran</Label>
          <Select value={form.paymentStatus} onValueChange={(val) => { if (val) setForm({ ...form, paymentStatus: val as PaymentStatus }); }}>
            <SelectTrigger><SelectValue>{form.paymentStatus === "pending" ? "Pending" : form.paymentStatus === "success" ? "Sukses" : form.paymentStatus === "failed" ? "Gagal" : "Jatuh Tempo"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="success">Sukses</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
              <SelectItem value="overdue">Jatuh Tempo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Waktu Penagihan</Label>
          <Input type="datetime-local" value={toLocalDatetime(form.billingTime)} onChange={(e) => setForm({ ...form, billingTime: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
        </div>
        <div className="grid gap-2">
          <Label>Waktu Pembayaran</Label>
          <Input type="datetime-local" value={toLocalDatetime(form.paymentTime)} onChange={(e) => setForm({ ...form, paymentTime: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
        </div>
      </div>
      {form.participantId && (
        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Label>Status Siswa</Label>
          <Select value={form.participantStatus} onValueChange={(val) => { if (val) setForm({ ...form, participantStatus: val as "active" | "inactive" | "graduated" }); }}>
            <SelectTrigger><SelectValue>{form.participantStatus === "active" ? "Aktif" : form.participantStatus === "inactive" ? "Tidak Aktif" : "Lulus"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
              <SelectItem value="graduated">Lulus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {form.participantStatus === "inactive" && initialParticipantStatus !== "inactive" && (
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
        <Label>Catatan</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Cth: Transfer BCA, No Ref: 123456" rows={2} />
      </div>
    </div>
  );

  const renderPaymentTable = (title: string, icon: React.ReactNode, tableHeaders: React.ReactNode) => {
    const config = pagesConfig[activeTab];
    const { paginatedList, page, setPage, totalPages, totalItems } = config;

    return (
      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
        <Card className="shadow-sm overflow-hidden rounded-xl p-0 gap-0">
          <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-2">
            {icon}
            <h2 className="font-semibold text-foreground">{title} ({statusGroups[activeTab].length})</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {tableHeaders}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data.</TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((payment) => {
                    const participant = dummyParticipants.find((p) => p.id === payment.participantId);
                    const pkg = dummyPackages.find((c) => c.id === payment.classPackageId);
                    return (
                      <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{participant?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px] truncate">{pkg?.nama ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {formatDate(payment.nextBillingDate ?? payment.billingTime)}
                          {activeTab === "belumBayar" && payment.nextBillingDate && (
                            <span className="ml-1 text-xs font-medium text-warning">
                              - ({(() => {
                                const target = new Date(payment.nextBillingDate as string);
                                const now = new Date();
                                const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
                                const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays > 0) return `${diffDays} hari lagi`;
                                if (diffDays === 0) return "Hari ini";
                                return `Terlambat ${Math.abs(diffDays)} hari`;
                              })()})
                            </span>
                          )}
                        </TableCell>
                        {activeTab === "lunas" && (
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                            {formatDate(payment.paymentTime)}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {activeTab === "belumBayar" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-success/10 hover:text-success"
                                onClick={() => {
                                  if (!participant?.phone) return toast.error("Nomor telepon peserta tidak tersedia");
                                  const targetDate = payment.nextBillingDate ?? payment.billingTime;
                                  const text = encodeURIComponent(`Halo *${participant.name}*,\n\nJangan lupa untuk melakukan pembayaran paket ${pkg?.nama || ''} sebesar *${formatCurrency(payment.amount)}* sebelum tanggal *${formatDateWithDay(targetDate as string)}*.`);
                                  window.open(`https://wa.me/${participant.phone}?text=${text}`, "_blank");
                                }}
                                title="Reminder Pembayaran"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {activeTab === "jatuhTempo" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-success/10 hover:text-success"
                                onClick={() => {
                                  if (!participant?.phone) return toast.error("Nomor telepon peserta tidak tersedia");
                                  const targetDate = payment.nextBillingDate ?? payment.billingTime;
                                  const text = encodeURIComponent(`Peringatan:\n\nPembayaran Anda sebesar *${formatCurrency(payment.amount)}* untuk paket ${pkg?.nama || ''} telah jatuh tempo sejak *${formatDateWithDay(targetDate as string)}*.`);
                                  window.open(`https://wa.me/${participant.phone}?text=${text}`, "_blank");
                                }}
                                title="Reminder Pembayaran Jatuh Tempo"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(payment)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {activeTab === "belumBayar" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => initiateDelete(payment.id, participant?.name || "Peserta")}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </Card>
      </div>
    );
  };

  const tabs = [
    { id: "belumBayar", label: "Belum Bayar", icon: <Clock className="h-4 w-4" /> },
    { id: "jatuhTempo", label: "Jatuh Tempo", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "lunas", label: "Lunas", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <RoleGuard allowedRoles={["super_admin", "staff_pembayaran"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" /> Pembayaran
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola status pembayaran peserta kursus
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
                <Plus className="h-4 w-4" /> Tambah Pembayaran
              </Button>
            )} />
            <DialogContent className="sm:max-w-xl rounded-2xl">
              <DialogHeader><DialogTitle>Tambah Data Pembayaran</DialogTitle><DialogDescription>Catat pembayaran manual baru.</DialogDescription></DialogHeader>
              {formFields}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAdd}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama peserta atau catatan..." className="pl-9 h-10 bg-muted/30 border-none rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-40 h-10 bg-muted/30 border-none rounded-lg focus-visible:ring-0 text-sm shadow-none">
              <SelectValue placeholder="Semua Status">
                {statusFilter === "all" ? "Semua Status" : 
                 statusFilter === "pending" ? "Pending" : 
                 statusFilter === "success" ? "Sukses" : 
                 statusFilter === "failed" ? "Gagal" : "Jatuh Tempo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="success">Sukses</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
              <SelectItem value="overdue">Jatuh Tempo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={(val) => { if (val) setYearFilter(val); }}>
            <SelectTrigger className="w-full sm:w-32 h-10 bg-muted/30 border-none rounded-lg focus-visible:ring-0 text-sm shadow-none"><SelectValue placeholder="Tahun" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={(val) => setMonthFilter(val || "")}>
            <SelectTrigger className="w-full sm:w-40 h-10 bg-muted/30 border-none rounded-lg focus-visible:ring-0 text-sm shadow-none">
              <SelectValue placeholder="Bulan">{months.find(m => m.value === monthFilter)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-border">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {tab.icon}
                {tab.label} <Badge variant="secondary" className="ml-1">{statusGroups[tab.id as keyof typeof statusGroups].length}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "belumBayar" && renderPaymentTable("Belum Bayar", <Clock className="h-5 w-5" />, <>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Peserta</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Paket Pembayaran</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Jumlah</TableHead>
          <TableHead className="font-semibold hidden md:table-cell">Jatuh Tempo</TableHead>
          <TableHead className="font-semibold text-right">Aksi</TableHead>
        </>)}

        {activeTab === "jatuhTempo" && renderPaymentTable("Jatuh Tempo", <AlertTriangle className="h-5 w-5" />, <>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Peserta</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Paket Pembayaran</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Jumlah</TableHead>
          <TableHead className="font-semibold hidden md:table-cell">Waktu Tagihan</TableHead>
          <TableHead className="font-semibold text-right">Aksi</TableHead>
        </>)}

        {activeTab === "lunas" && renderPaymentTable("Lunas", <CheckCircle2 className="h-5 w-5" />, <>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Peserta</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Paket Pembayaran</TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide">Jumlah</TableHead>
          <TableHead className="font-semibold hidden md:table-cell">Waktu Tagihan</TableHead>
          <TableHead className="font-semibold hidden lg:table-cell">Waktu Bayar</TableHead>
          <TableHead className="font-semibold text-right">Aksi</TableHead>
        </>)}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <DialogHeader><DialogTitle>Edit Pembayaran</DialogTitle><DialogDescription>Perbarui data pembayaran.</DialogDescription></DialogHeader>
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
          itemName={itemToDelete?.name || "Pembayaran ini"}
        />

        {/* Siswa Selection Dialog */}
        <Dialog open={isSiswaSelectOpen} onOpenChange={setIsSiswaSelectOpen}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Pilih Siswa</DialogTitle>
              <DialogDescription>Cari dan pilih siswa untuk pembayaran ini.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4 flex flex-col overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama atau email siswa..." 
                  className="pl-9" 
                  value={participantSearch} 
                  onChange={(e) => {
                    setParticipantSearch(e.target.value);
                    setParticipantVisibleCount(5);
                  }} 
                />
              </div>
              
              <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                {(() => {
                  const filteredParticipants = dummyParticipants.filter(p => 
                    p.name.toLowerCase().includes(participantSearch.toLowerCase()) || 
                    p.email.toLowerCase().includes(participantSearch.toLowerCase())
                  );
                  const visibleParticipants = filteredParticipants.slice(0, participantVisibleCount);
                  
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
                        const isSelected = form.participantId === p.id;
                        
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              setForm({ ...form, participantId: p.id, participantStatus: p.status as any });
                              setInitialParticipantStatus(p.status);
                              setIsSiswaSelectOpen(false);
                            }}
                            className={`
                              flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                              ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}
                            `}
                          >
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </div>
                            {isSelected && <Badge className="bg-primary hover:bg-primary text-[10px]">Terpilih</Badge>}
                          </div>
                        );
                      })}
                      
                      {filteredParticipants.length > participantVisibleCount && (
                        <button 
                          onClick={() => setParticipantVisibleCount(prev => prev + 10)}
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
          </DialogContent>
        </Dialog>

        {/* Paket Selection Dialog */}
        <Dialog open={isPackageSelectOpen} onOpenChange={setIsPackageSelectOpen}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Pilih Paket Pembayaran</DialogTitle>
              <DialogDescription>Cari dan pilih paket pembelajaran untuk pembayaran ini.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4 flex flex-col overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama paket..." 
                  className="pl-9" 
                  value={packageSearch} 
                  onChange={(e) => {
                    setPackageSearch(e.target.value);
                    setPackageVisibleCount(5);
                  }} 
                />
              </div>
              
              <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                {(() => {
                  const filteredPackages = dummyPackages.filter(p => 
                    p.nama.toLowerCase().includes(packageSearch.toLowerCase())
                  );
                  const visiblePackages = filteredPackages.slice(0, packageVisibleCount);
                  
                  if (visiblePackages.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Tidak ada paket ditemukan.
                      </div>
                    );
                  }

                  return (
                    <>
                      {visiblePackages.map((p) => {
                        const isSelected = form.classPackageId === p.id;
                        
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              setForm({ ...form, classPackageId: p.id, amount: p.nominal });
                              setIsPackageSelectOpen(false);
                            }}
                            className={`
                              flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                              ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}
                            `}
                          >
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">{p.nama}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(p.nominal)} • Durasi {p.durasi} Bulan</p>
                            </div>
                            {isSelected && <Badge className="bg-primary hover:bg-primary text-[10px]">Terpilih</Badge>}
                          </div>
                        );
                      })}
                      
                      {filteredPackages.length > packageVisibleCount && (
                        <button 
                          onClick={() => setPackageVisibleCount(prev => prev + 10)}
                          className="w-full py-3 text-xs text-primary font-medium hover:underline transition-all"
                        >
                          Load More (+10 Paket)
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
