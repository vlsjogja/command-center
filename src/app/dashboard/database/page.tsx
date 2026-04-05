"use client";

import { useState, useMemo, useEffect } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Database,
  Download,
  ArrowRight,
  Layers,
  HardDrive,
  FileSpreadsheet,
  CalendarDays,
  Filter,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { 
  getDatabaseStats, 
  getBackupData, 
  getTablePreview 
} from "./actions";
import { 
  type User, 
  type Participant, 
  type ClassPackage, 
  type ParticipantClass, 
  type Payment, 
  type Package, 
  type Teacher, 
  type AttendanceRecord, 
  type ActivityLog 
} from "@/types";

// ─── Schema definitions for the ER diagram ───
type ColumnDef = {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string; // e.g. "participants.id"
};

type TableDef = {
  name: string;
  displayName: string;
  columns: ColumnDef[];
  rowCount: number;
  color: string;
};

// ─── Table metadata ───
const dbTablesMeta: Omit<TableDef, 'rowCount'>[] = [
  {
    name: "users",
    displayName: "Users",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "name", type: "text" },
      { name: "email", type: "varchar(255)" },
      { name: "passwordHash", type: "text" },
      { name: "role", type: "enum" },
      { name: "teacherId", type: "uuid?", fk: "teachers.id" },
      { name: "avatar", type: "text?" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "violet",
  },
  {
    name: "participants",
    displayName: "Peserta Didik",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "name", type: "text" },
      { name: "email", type: "varchar(255)" },
      { name: "phone", type: "varchar(20)" },
      { name: "address", type: "text" },
      { name: "status", type: "enum" },
      { name: "createdAt", type: "timestamp" },
      { name: "createdBy", type: "text?" },
    ],
    color: "emerald",
  },
  {
    name: "status_history",
    displayName: "Riwayat Status",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "participantId", type: "uuid", fk: "participants.id" },
      { name: "status", type: "enum" },
      { name: "changedAt", type: "timestamp" },
      { name: "changedBy", type: "text" },
      { name: "reason", type: "text?" },
    ],
    color: "slate",
  },
  {
    name: "class_packages",
    displayName: "Kelas",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "name", type: "text" },
      { name: "description", type: "text?" },
      { name: "learningDuration", type: "text" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "blue",
  },
  {
    name: "participant_classes",
    displayName: "Enrollments",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "participantId", type: "uuid", fk: "participants.id" },
      { name: "classPackageId", type: "uuid", fk: "class_packages.id" },
      { name: "enrolledAt", type: "timestamp" },
    ],
    color: "cyan",
  },
  {
    name: "payments",
    displayName: "Pembayaran",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "participantId", type: "uuid", fk: "participants.id" },
      { name: "classPackageId", type: "uuid", fk: "packages.id" },
      { name: "amount", type: "integer" },
      { name: "paymentMethod", type: "enum" },
      { name: "paymentTime", type: "timestamp?" },
      { name: "billingTime", type: "timestamp" },
      { name: "paymentStatus", type: "enum" },
      { name: "participantStatus", type: "enum" },
      { name: "notes", type: "text?" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "amber",
  },
  {
    name: "packages",
    displayName: "Paket Pembayaran",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "nama", type: "text" },
      { name: "nominal", type: "integer" },
      { name: "kelas", type: "uuid", fk: "class_packages.id" },
      { name: "durasi", type: "integer" },
      { name: "deskripsi", type: "text?" },
      { name: "status", type: "enum" },
      { name: "type", type: "enum" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "rose",
  },
  {
    name: "teachers",
    displayName: "Pengajar",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "userId", type: "uuid?", fk: "users.id" },
      { name: "name", type: "text" },
      { name: "phone", type: "varchar(20)" },
      { name: "assignedClasses", type: "text" },
      { name: "schedule", type: "text" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "orange",
  },
  {
    name: "attendance_records",
    displayName: "Presensi (Master)",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "date", type: "timestamp" },
      { name: "className", type: "text" },
      { name: "teacherName", type: "text" },
      { name: "totalParticipants", type: "integer" },
      { name: "presentCount", type: "integer" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "teal",
  },
  {
    name: "student_attendance",
    displayName: "Presensi Peserta",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "attendanceRecordId", type: "uuid", fk: "attendance_records.id" },
      { name: "studentId", type: "uuid", fk: "participants.id" },
      { name: "studentName", type: "text" },
      { name: "status", type: "enum" },
    ],
    color: "emerald",
  },
  {
    name: "activity_logs",
    displayName: "Audit Log / Aktivitas",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "action", type: "text" },
      { name: "targetType", type: "text" },
      { name: "targetId", type: "uuid" },
      { name: "targetName", type: "text" },
      { name: "performedBy", type: "text" },
      { name: "details", type: "text" },
      { name: "timestamp", type: "timestamp" },
    ],
    color: "rose",
  },
  {
    name: "message_templates",
    displayName: "Template Pesan",
    columns: [
      { name: "id", type: "uuid", pk: true },
      { name: "key", type: "varchar(100)" },
      { name: "content", type: "text" },
      { name: "updatedAt", type: "timestamp" },
      { name: "createdAt", type: "timestamp" },
    ],
    color: "indigo",
  },
];

// ─── Relationships ───
type Relation = {
  from: string;
  fromCol: string;
  to: string;
  toCol: string;
  label: string;
};

const relations: Relation[] = [
  { from: "payments", fromCol: "participantId", to: "participants", toCol: "id", label: "belongs to" },
  { from: "payments", fromCol: "classPackageId", to: "packages", toCol: "id", label: "for package" },
  { from: "participant_classes", fromCol: "participantId", to: "participants", toCol: "id", label: "enrolled by" },
  { from: "participant_classes", fromCol: "classPackageId", to: "class_packages", toCol: "id", label: "enrolled in" },
  { from: "packages", fromCol: "kelas", to: "class_packages", toCol: "id", label: "linked to" },
  { from: "users", fromCol: "teacherId", to: "teachers", toCol: "id", label: "profile of" },
  { from: "teachers", fromCol: "userId", to: "users", toCol: "id", label: "account for" },
  { from: "activity_logs", fromCol: "targetId", to: "participants", toCol: "id", label: "related to" },
  { from: "status_history", fromCol: "participantId", to: "participants", toCol: "id", label: "history for" },
  { from: "student_attendance", fromCol: "attendanceRecordId", to: "attendance_records", toCol: "id", label: "part of" },
  { from: "student_attendance", fromCol: "studentId", to: "participants", toCol: "id", label: "attendance for" },
];

// ─── Backup sources ───
type BackupSource = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  dateField: string;
};

const backupSources: BackupSource[] = [
  {
    id: "payments",
    label: "Pembayaran",
    description: "Data tagihan dan pembayaran peserta",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    dateField: "createdAt",
  },
  {
    id: "attendance_records",
    label: "Presensi",
    description: "Catatan kehadiran kelas (master)",
    icon: <CalendarDays className="h-5 w-5" />,
    dateField: "date",
  },
  {
    id: "activity_logs",
    label: "Log Aktivitas",
    description: "Catatan riwayat perubahan sistem",
    icon: <Database className="h-5 w-5" />,
    dateField: "timestamp",
  },
];

// ─── Color helper ───
function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
    teal: { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  };
  return map[color] || map.blue;
}

// ─── Component ───
export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<"schema" | "backup">("schema");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Backup state
  const [backupSource, setBackupSource] = useState("payments");
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterRange, setFilterRange] = useState({ start: "", end: "" });
  
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [backupData, setBackupData] = useState<any[]>([]);
  const [tablePreviewData, setTablePreviewData] = useState<Record<string, unknown>[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // Fetch Stats and Default Backup on mount
  useEffect(() => {
    async function initData() {
      setIsStatsLoading(true);
      const { data, error } = await getDatabaseStats();
      if (data) setDbStats(data);
      if (error) toast.error("Gagal mengambil statistik DB");
      setIsStatsLoading(false);
    }
    initData();
  }, []);

  // Fetch Backup Data when source or filters change
  useEffect(() => {
    async function fetchBackup() {
      setIsBackupLoading(true);
      const { data, error } = await getBackupData(backupSource);
      if (data) setBackupData(data);
      if (error) toast.error(`Gagal mengambil data backup: ${backupSource}`);
      setIsBackupLoading(false);
    }
    fetchBackup();
  }, [backupSource]);

  // Fetch Table Preview when selected table changes
  useEffect(() => {
    async function fetchPreview() {
      if (!selectedTable) {
        setTablePreviewData([]);
        return;
      };
      const { data, error } = await getTablePreview(selectedTable);
      if (data) setTablePreviewData(data);
      if (error) toast.error(`Gagal mengambil preview tabel: ${selectedTable}`);
    }
    fetchPreview();
  }, [selectedTable]);

  // Computed dbTables with row counts
  const dbTables = useMemo(() => {
    return dbTablesMeta.map(table => ({
      ...table,
      rowCount: dbStats[table.name] ?? 0
    }));
  }, [dbStats]);

  // Filtered data for backup
  const filteredBackupData = useMemo(() => {
    function getDateStr(item: any): string {
      if ("createdAt" in item && backupSource === "payments") return item.createdAt;
      if ("date" in item && backupSource === "attendance_records") return item.date;
      if ("timestamp" in item && backupSource === "activity_logs") return item.timestamp;
      return "";
    }

    return backupData.filter((item) => {
      const dateStr = getDateStr(item);
      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      
      if (filterMode === "month") {
        return (
          itemDate.getFullYear().toString() === filterMonth.split("-")[0] &&
          (itemDate.getMonth() + 1).toString().padStart(2, "0") === filterMonth.split("-")[1]
        );
      } else {
        const start = filterRange.start ? new Date(filterRange.start) : null;
        const end = filterRange.end ? new Date(filterRange.end + "T23:59:59") : null;
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      }
    });
  }, [backupData, backupSource, filterMode, filterMonth, filterRange]);

  function handleExportCsv() {
    if (filteredBackupData.length === 0) {
      toast.error("Tidak ada data untuk diekspor dengan filter ini.");
      return;
    }

    let exportData: Record<string, unknown>[];
    if (backupSource === "attendance_records") {
      exportData = [];
      const records = filteredBackupData as unknown as (AttendanceRecord & { studentAttendance: any[] })[];
      for (const record of records) {
        if (record.studentAttendance && record.studentAttendance.length > 0) {
          for (const sa of record.studentAttendance) {
            exportData.push({
              record_id: record.id,
              date: record.date,
              className: record.className,
              teacherName: record.teacherName,
              studentId: sa.studentId,
              studentName: sa.studentName || sa.student?.name,
              status: sa.status,
            });
          }
        } else {
          exportData.push({
            record_id: record.id,
            date: record.date,
            className: record.className,
            teacherName: record.teacherName,
            studentId: "N/A",
            studentName: "N/A",
            status: "No Students Recorded",
          });
        }
      }
    } else {
      exportData = filteredBackupData.map(item => {
        const newItem: any = { ...item };
        if (newItem.participant) {
            newItem.participantName = newItem.participant.name;
            newItem.participantEmail = newItem.participant.email;
            delete newItem.participant;
        }
        if (newItem.package) {
            newItem.packageName = newItem.package.nama;
            delete newItem.package;
        }
        return newItem;
      });
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const label = 
      backupSource === "payments" ? "pembayaran" : 
      backupSource === "attendance_records" ? "presensi" : "logs";
    const dateLabel =
      filterMode === "month"
        ? filterMonth
        : `${filterRange.start || "awal"}_${filterRange.end || "akhir"}`;

    a.href = url;
    a.download = `backup_${label}_${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${filteredBackupData.length} data ${label} berhasil diekspor.`);
  }

  const tabs = [
    { id: "schema" as const, label: "Struktur Database", icon: <Layers className="h-4 w-4" /> },
    { id: "backup" as const, label: "Backup Data", icon: <HardDrive className="h-4 w-4" /> },
  ];

  return (
    <RoleGuard allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> Database
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat struktur relasional database dan kelola backup data
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════ TAB: Schema ════════════════ */}
        {activeTab === "schema" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tabel</p>
                  <p className="text-2xl font-bold mt-1">{dbTablesMeta.length}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Relasi</p>
                  <p className="text-2xl font-bold mt-1">{relations.length}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Kolom</p>
                  <p className="text-2xl font-bold mt-1">
                    {dbTablesMeta.reduce((a, t) => a + t.columns.length, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Data</p>
                  <p className="text-2xl font-bold mt-1">
                    {isStatsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : Object.values(dbStats).reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Table Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dbTables.map((table) => {
                const c = colorClasses(table.color);
                const isSelected = selectedTable === table.name;
                return (
                  <Card
                    key={table.name}
                    className={`shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? `ring-2 ring-primary ${c.bg}` : "hover:scale-[1.01]"
                    }`}
                    onClick={() => setSelectedTable(isSelected ? null : table.name)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${c.dot}`} />
                          <CardTitle className="text-sm font-bold">{table.displayName}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-mono ${c.border} ${c.text}`}>
                          {table.name}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {table.rowCount} baris · {table.columns.length} kolom
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-1">
                        {table.columns.map((col) => (
                          <div
                            key={col.name}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <div className="flex items-center gap-1.5">
                              {col.pk && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400 px-1 rounded">
                                  PK
                                </span>
                              )}
                              {col.fk && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 px-1 rounded">
                                  FK
                                </span>
                              )}
                              <span className={`font-medium ${col.pk ? "text-foreground" : "text-muted-foreground"}`}>
                                {col.name}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground/60">
                              {col.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Relationships */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" /> Relasi Antar Tabel
                </CardTitle>
                <CardDescription>Foreign key relationships yang menghubungkan data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relations.map((rel, idx) => {
                    const fromTable = dbTables.find((t) => t.name === rel.from);
                    const toTable = dbTables.find((t) => t.name === rel.to);
                    const fromC = colorClasses(fromTable?.color || "blue");
                    const toC = colorClasses(toTable?.color || "blue");

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-sm"
                      >
                        <Badge variant="outline" className={`font-mono text-[10px] ${fromC.border} ${fromC.text}`}>
                          {rel.from}
                        </Badge>
                        <span className="text-muted-foreground font-mono text-xs">.{rel.fromCol}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Badge variant="outline" className={`font-mono text-[10px] ${toC.border} ${toC.text}`}>
                          {rel.to}
                        </Badge>
                        <span className="text-muted-foreground font-mono text-xs">.{rel.toCol}</span>
                        <span className="ml-auto text-xs text-muted-foreground/60 hidden sm:inline">
                          {rel.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Table data preview */}
            {selectedTable && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    Preview: {dbTablesMeta.find((t) => t.name === selectedTable)?.displayName}
                  </CardTitle>
                  <CardDescription>
                    Menampilkan data terbaru (read-only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {tablePreviewData.length > 0 && Object.keys(tablePreviewData[0]).map((h) => (
                            <TableHead key={h} className="font-semibold text-xs whitespace-nowrap">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tablePreviewData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Tidak ada data pratinjau.
                            </TableCell>
                          </TableRow>
                        ) : (
                          tablePreviewData.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              {Object.values(row).map((val, i) => (
                                <TableCell key={i} className="text-xs font-mono max-w-[200px] truncate">
                                  {val !== null && val !== undefined ? String(val) : "-"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ════════════════ TAB: Backup ════════════════ */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            {/* Source selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {backupSources.map((source) => (
                <Card
                  key={source.id}
                  className={`shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                    backupSource === source.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:scale-[1.01]"
                  }`}
                  onClick={() => setBackupSource(source.id)}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        backupSource === source.id
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {source.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{source.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{source.description}</p>
                      </div>
                      {backupSource === source.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter controls */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" /> Filter Periode
                </CardTitle>
                <CardDescription>Pilih rentang data yang akan diekspor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                    <button
                      onClick={() => setFilterMode("month")}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filterMode === "month"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Per Bulan
                    </button>
                    <button
                      onClick={() => setFilterMode("range")}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filterMode === "range"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                  </div>

                  {filterMode === "month" ? (
                    <div className="grid gap-2 max-w-xs">
                      <Label htmlFor="filterMonth">Bulan</Label>
                      <Input
                        id="filterMonth"
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                      <div className="grid gap-2">
                        <Label htmlFor="filterStart">Dari Tanggal</Label>
                        <Input
                          id="filterStart"
                          type="date"
                          value={filterRange.start}
                          onChange={(e) => setFilterRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="filterEnd">Sampai Tanggal</Label>
                        <Input
                          id="filterEnd"
                          type="date"
                          value={filterRange.end}
                          onChange={(e) => setFilterRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview & Export */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Pratinjau Data</CardTitle>
                    <CardDescription>
                      {isBackupLoading ? (
                        <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Mencari data...</span>
                      ) : (
                        `${filteredBackupData.length} data ${backupSource === "payments" ? "pembayaran" : backupSource === "attendance_records" ? "presensi" : "log aktivitas"} ditemukan`
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleExportCsv}
                    disabled={filteredBackupData.length === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBackupData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Tidak ada data untuk periode ini.</p>
                    <p className="text-xs mt-1">Coba ubah filter periode di atas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold text-xs">#</TableHead>
                          {backupSource === "payments" ? (
                            <>
                              <TableHead className="font-semibold text-xs">ID</TableHead>
                              <TableHead className="font-semibold text-xs">Peserta</TableHead>
                              <TableHead className="font-semibold text-xs">Nominal</TableHead>
                              <TableHead className="font-semibold text-xs">Status</TableHead>
                              <TableHead className="font-semibold text-xs">Tanggal</TableHead>
                            </>
                          ) : backupSource === "attendance_records" ? (
                            <>
                              <TableHead className="font-semibold text-xs">ID</TableHead>
                              <TableHead className="font-semibold text-xs">Kelas</TableHead>
                              <TableHead className="font-semibold text-xs">Pengajar</TableHead>
                              <TableHead className="font-semibold text-xs">Peserta</TableHead>
                              <TableHead className="font-semibold text-xs">Tanggal</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="font-semibold text-xs">ID</TableHead>
                              <TableHead className="font-semibold text-xs">Aksi</TableHead>
                              <TableHead className="font-semibold text-xs">Target</TableHead>
                              <TableHead className="font-semibold text-xs">Oleh</TableHead>
                              <TableHead className="font-semibold text-xs">Waktu</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(filteredBackupData as any[]).slice(0, 20).map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            {backupSource === "payments" ? (
                              <>
                                <TableCell className="text-xs font-mono">{String(row.id).slice(0, 8)}...</TableCell>
                                <TableCell className="text-xs">
                                  {row.participant?.name || String(row.participantId)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  Rp {Number(row.amount).toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Badge
                                    variant="outline"
                                    className={
                                      row.paymentStatus === "success"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : row.paymentStatus === "overdue"
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : row.paymentStatus === "pending"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-700"
                                    }
                                  >
                                    {String(row.paymentStatus)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(String(row.createdAt)).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </TableCell>
                              </>
                            ) : backupSource === "attendance_records" ? (
                              <>
                                <TableCell className="text-xs font-mono">{String(row.id).slice(0, 8)}...</TableCell>
                                <TableCell className="text-xs">{String(row.className)}</TableCell>
                                <TableCell className="text-xs">{String(row.teacherName)}</TableCell>
                                <TableCell className="text-xs">
                                  {(row.studentAttendance?.length || 0)} siswa
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(String(row.date)).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-xs font-mono">{String(row.id).slice(0, 8)}...</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {String(row.action).replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{String(row.targetName)}</TableCell>
                                <TableCell className="text-xs">
                                  {String(row.performedBy)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(String(row.timestamp)).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredBackupData.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Menampilkan 20 dari {filteredBackupData.length} data. Semua data akan diexport.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
