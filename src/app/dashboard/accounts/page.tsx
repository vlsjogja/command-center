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
import { Card, CardContent } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Search,
  Pencil,
  ShieldCheck,
  UserPlus,
  Mail,
  User as UserIcon,
  Shield,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User, Role } from "@/types";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { PaginationControls } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { getUsers, addUser, updateUser, deleteUser } from "./actions";
import { Loader2 } from "lucide-react";

type FormData = Omit<User, "id"> & { password?: string };

const emptyForm: FormData = {
  name: "",
  email: "",
  role: "staff_pembayaran",
  avatar: "",
  password: "password123",
};

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  async function fetchUsers() {
    setIsLoading(true);
    const { data, error } = await getUsers();
    if (data) {
      // Cast role to Role type safely
      setUsers(data as User[]);
    }
    if (error) toast.error("Gagal mengambil data akun: " + error);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" || u.role === activeTab;

    return matchesSearch && matchesTab;
  });

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
  } = usePagination({ data: filtered, itemsPerPage: 20 });

  useEffect(() => {
    goToPage(1);
  }, [search, activeTab]);

  const getCount = (role: string) => {
    if (role === "all") return users.length;
    return users.filter(u => u.role === role).length;
  };

  function generateId() {
    return `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password) {
      toast.error("Nama, Email dan Kata Sandi wajib diisi.");
      return;
    }
    
    toast.promise(addUser(form), {
      loading: "Menambahkan akun...",
      success: ({ data, error }) => {
        if (error) throw new Error(error);
        fetchUsers();
        setIsAddOpen(false);
        setForm(emptyForm);
        return "Akun berhasil ditambahkan.";
      },
      error: (err) => err.message
    });
  }

  async function handleEdit() {
    if (!editingId || !form.name || !form.email) return;

    toast.promise(updateUser(editingId, form), {
      loading: "Memperbarui akun...",
      success: ({ error }) => {
        if (error) throw new Error(error);
        fetchUsers();
        setIsEditOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        return "Data akun berhasil diperbarui.";
      },
      error: (err) => err.message
    });
  }

  function initiateDelete(id: string, name: string) {
    if (id === "usr-1") {
      toast.error("Tidak dapat menghapus Admin Utama.");
      return;
    }
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (itemToDelete) {
      toast.promise(deleteUser(itemToDelete.id), {
        loading: "Menghapus akun...",
        success: ({ success, error }) => {
          if (error) throw new Error(error);
          fetchUsers();
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
          return `${itemToDelete.name} berhasil dihapus.`;
        },
        error: (err) => err.message
      });
    }
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar || "",
      password: "password123", // Dummy password for editing
    });
    setIsEditOpen(true);
  }

  const roleConfig: Record<Role, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "bg-primary/10 text-primary border-primary/20" },
    staff_pembayaran: { label: "Staff Pembayaran", color: "bg-info-muted text-info border-info-border" },
    teacher: { label: "Pengajar", color: "bg-success-muted text-success border-success-border" },
  };

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" /> Nama Lengkap *
        </Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Masukkan nama lengkap"
          className="rounded-lg h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" /> Email *
        </Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@kursus.id"
          className="rounded-lg h-10"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password" className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" /> Kata Sandi
        </Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
          className="rounded-lg h-10"
        />
        <p className="text-[11px] text-muted-foreground">
          Bawaan: password123. Biarkan jika tidak ingin diubah.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role" className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" /> Peran (Role) *
        </Label>
        <Select
          value={form.role}
          onValueChange={(v: Role | null) => {
            if (v) setForm({ ...form, role: v });
          }}
        >
          <SelectTrigger className="rounded-lg h-10">
            <SelectValue placeholder="Pilih peran">
              {form.role === "super_admin" ? "Super Admin" : form.role === "staff_pembayaran" ? "Staff Pembayaran" : "Pengajar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="staff_pembayaran">Staff Pembayaran</SelectItem>
            <SelectItem value="teacher">Pengajar (Teacher)</SelectItem>
          </SelectContent>
        </Select>
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
              <ShieldCheck className="h-6 w-6 text-primary" /> Manajemen Akun
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola akses sistem dan peran pengguna
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger render={(props) => (
            <Button {...props} className="h-10 px-4 rounded-xl shadow-sm hover:shadow-md transition-all gap-2">
              <UserPlus className="h-4 w-4" /> Tambah Akun
            </Button>
          )} />
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                  <UserPlus className="h-6 w-6" /> Tambah Akun Baru
                </DialogTitle>
                <DialogDescription>
                  Buat akun baru untuk staf atau pengajar.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh]">
                {formFields}
              </ScrollArea>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={handleAdd}>Simpan Akun</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-lg h-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger value="all" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Semua <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-[11px] h-4 px-1.5">{getCount("all")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="super_admin" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Super Admin <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-[11px] h-4 px-1.5">{getCount("super_admin")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="staff_pembayaran" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Staff <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-[11px] h-4 px-1.5">{getCount("staff_pembayaran")}</Badge>
              </TabsTrigger>
              <TabsTrigger value="teacher" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Pengajar <Badge variant="secondary" className="ml-2 bg-muted-foreground/10 text-[11px] h-4 px-1.5">{getCount("teacher")}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                className="pl-11 h-10 bg-card border border-border/60 rounded-lg focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 shadow-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value={activeTab}>
            <Card className="shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm border-muted/50 rounded-xl p-0 gap-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-none">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide px-6 py-3">Pengguna</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide px-6 py-3">Peran</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide px-6 py-3">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                            <p className="text-sm font-medium text-muted-foreground">Memuat data...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20">
                          <div className="flex flex-col items-center gap-2 opacity-20">
                            <Search className="h-10 w-10" />
                            <p className="text-sm font-medium">Tidak ada akun ditemukan</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((u) => (
                        <TableRow key={u.id} className="hover:bg-primary/[0.02] transition-colors border-b border-muted/50 group">
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10 font-semibold text-sm shrink-0 uppercase">
                                {u.name.substring(0, 2)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground leading-tight">{u.name}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${roleConfig[u.role]?.color || ""}`}>
                              {roleConfig[u.role]?.label || u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6 py-5">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                                onClick={() => initiateDelete(u.id, u.name)}
                                disabled={u.role === "super_admin" && users.filter(u => u.role === "super_admin").length <= 1}
                              >
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
          </TabsContent>
        </Tabs>

        {/* Edit Account Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Pencil className="h-6 w-6" /> Edit Akun
              </DialogTitle>
              <DialogDescription>
                Perbarui profil dan peran akses pengguna.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              {formFields}
            </ScrollArea>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button onClick={handleEdit}>Perbarui Akun</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDelete}
          itemName={itemToDelete?.name || "Akun ini"}
        />
      </div>
    </RoleGuard>
  );
}
