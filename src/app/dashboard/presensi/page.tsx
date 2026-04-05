"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  getAttendanceHistory, 
  saveAttendanceRecord, 
  getTodayData 
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  CheckSquare, 
  Clock, 
  User, 
  BookOpen, 
  ChevronRight, 
  Users,
  Search,
  CalendarCheck2,
  Save,
  Filter,
  Eye,
  Calendar,
  UserPlus,
  X,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Participant, AttendanceRecord, ClassPackage } from "@/types";
import { Loader2 } from "lucide-react";

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type ClassInstance = {
  id: string;
  className: string;
  teacherId: string;
  teacherName: string;
  teacherPhone: string | null;
  startTime: string;
  endTime: string;
  day: string;
  participants: Participant[];
};

export default function AttendancePage() {
  const { user } = useAuth();
  
  // Today's Attendance State
  const [todayClasses, setTodayClasses] = useState<ClassInstance[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [adHocParticipants, setAdHocParticipants] = useState<Record<string, Participant[]>>({});
  
  // Add Student Dialog State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  
  // History State
  const [searchCourse, setSearchCourse] = useState("");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => (currentYear - 1 + i).toString());
  const months = [
    { value: "all", label: "Semua Bulan" },
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

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    const { data, error } = await getAttendanceHistory();
    if (data) setHistory(data);
    setIsHistoryLoading(false);
  };

  async function fetchData() {
    setIsLoading(true);
    const { data, error } = await getTodayData();
    if (error) { toast.error("Gagal memuat data: " + error); setIsLoading(false); return; }
    if (!data) { setIsLoading(false); return; }

    const { teachers, packages, allParticipants: participantsFromDB } = data;
    setAllParticipants(participantsFromDB as any);

    const today = new Date();
    const dayName = DAYS_ID[today.getDay()];
    const classes: ClassInstance[] = [];

    const relevantTeachers = user?.role === "super_admin" 
      ? teachers 
      : (teachers as any[]).filter(t => t.id === user?.teacherId);

    relevantTeachers.forEach((teacher: any) => {
      const scheduleStr = teacher.schedule;
      if (!scheduleStr) return;

      const segments = scheduleStr.includes(";") ? scheduleStr.split("; ") : [scheduleStr];
      
      segments.forEach((seg: string) => {
        let className = teacher.assignedClasses?.split(", ")[0] || "Kelas Utama";
        let dayData = seg;

        if (seg.includes(": ")) {
          const [namePart, daysPart] = seg.split(": ");
          className = namePart;
          dayData = daysPart;
        }

        const daySegments = dayData.split(/, (?=[A-Z])/);
        daySegments.forEach(ds => {
          const match = ds.match(/(.*) \((.*)\)/);
          if (match) {
            const [, day, timesContent] = match;
            if (day.trim() === dayName) {
              const timePairs = timesContent.split(", ");
              timePairs.forEach((tp, idx) => {
                const [start, end] = tp.split("-");
                // Find matching package
                const pkg = (packages as any[]).find(p => 
                  p.name.toLowerCase().includes(className.toLowerCase()) || 
                  className.toLowerCase().includes(p.name.toLowerCase())
                );
                
                const classParticipants = pkg 
                  ? pkg.enrollments.map((en: any) => en.participant).filter(Boolean) as Participant[]
                  : [];

                classes.push({
                  id: `${teacher.id}-${className}-${day}-${idx}`,
                  className,
                  teacherId: teacher.id,
                  teacherName: teacher.name,
                  teacherPhone: teacher.phone,
                  day,
                  startTime: start?.trim() || "00:00",
                  endTime: end?.trim() || "00:00",
                  participants: classParticipants
                });
              });
            }
          }
        });
      });
    });

    classes.sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTodayClasses(classes);
    if (classes.length > 0) setSelectedClassId(classes[0].id);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, [user]);

  const toggleAttendance = (classId: string, studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [studentId]: !(prev[classId]?.[studentId])
      }
    }));
  };

  async function handleSaveAttendance() {
    if (!selectedClass) return;
    
    const records = mergedParticipants.map(p => ({
      participantId: p.id,
      participantName: p.name,
      status: (attendance[selectedClass.id]?.[p.id] ? "present" : "absent") as "present" | "absent"
    }));

    const sessionDate = new Date();
    // Use the class's scheduled time for the timestamp
    const [hours, minutes] = selectedClass.startTime.split(":");
    sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const { success, error } = await saveAttendanceRecord({
      teacherName: selectedClass.teacherName,
      className: selectedClass.className,
      date: sessionDate.toISOString(),
      attendance: records
    });

    if (success) {
      toast.success("Presensi hari ini berhasil disimpan!");
      fetchHistory(); // Refresh history tab
    } else {
      toast.error("Gagal menyimpan presensi: " + error);
    }
  }

  const filteredHistory = history.filter(record => {
    const recordDate = new Date(record.date);
    const matchCourse = record.className.toLowerCase().includes(searchCourse.toLowerCase());
    const matchYear = recordDate.getFullYear().toString() === filterYear;
    const matchMonth = filterMonth === "all" || recordDate.getMonth().toString() === filterMonth;
    return matchCourse && matchYear && matchMonth;
  });

  const selectedClass = todayClasses.find(c => c.id === selectedClassId);
  const currentAdHoc = selectedClass ? (adHocParticipants[selectedClass.id] || []) : [];
  const mergedParticipants = selectedClass ? [...selectedClass.participants, ...currentAdHoc] : [];

  // Group classes by name for the sidebar
  const groupedClasses = todayClasses.reduce((acc, current) => {
    if (!acc[current.className]) acc[current.className] = [];
    acc[current.className].push(current);
    return acc;
  }, {} as Record<string, ClassInstance[]>);

  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [selectedClassHistory, setSelectedClassHistory] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Group history by name for the history tab
  const groupedHistory = filteredHistory.reduce((acc, current) => {
    if (!acc[current.className]) acc[current.className] = [];
    acc[current.className].push(current);
    return acc;
  }, {} as Record<string, typeof filteredHistory>);

  const activeClassSessions = selectedClassHistory 
    ? filteredHistory.filter(h => h.className === selectedClassHistory)
    : [];

  // Filter students for ad-hoc dialog
  const availableStudents = allParticipants.filter(p => 
    !mergedParticipants.some(mp => mp.id === p.id) &&
    p.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const addAdHocStudent = (student: Participant) => {
    if (!selectedClassId) return;
    
    setAdHocParticipants(prev => ({
      ...prev,
      [selectedClassId]: [...(prev[selectedClassId] || []), student]
    }));
    
    // Automatically mark as present
    setAttendance(prev => ({
      ...prev,
      [selectedClassId]: {
        ...(prev[selectedClassId] || {}),
        [student.id]: true
      }
    }));
    
    setIsAddStudentOpen(false);
    setStudentSearch("");
    toast.success(`${student.name} ditambahkan ke sesi ini.`);
  };

  const removeAdHocStudent = (studentId: string) => {
    if (!selectedClassId) return;
    
    setAdHocParticipants(prev => ({
      ...prev,
      [selectedClassId]: (prev[selectedClassId] || []).filter(s => s.id !== studentId)
    }));
    toast.info("Siswa tambahan dihapus.");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat data presensi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="h-6 w-6 text-primary" /> Manajemen Presensi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rekap kehadiran harian dan riwayat kelas
          </p>
        </div>
      </div>

      <Tabs defaultValue="harian" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="harian" className="rounded-lg px-6 data-[state=active]:shadow-sm">Harian</TabsTrigger>
          {user?.role === "super_admin" && (
            <TabsTrigger value="riwayat" className="rounded-lg px-6 data-[state=active]:shadow-sm">Riwayat (Admin)</TabsTrigger>
          )}
        </TabsList>

        {/* --- DAILY TAB --- */}
        <TabsContent value="harian" className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border shadow-sm">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Class List */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jadwal Hari Ini</h2>
              </div>
              
              {todayClasses.length === 0 ? (
                <Card className="border-dashed shadow-none bg-muted/20 rounded-xl">
                  <CardContent className="pt-10 pb-10 text-center">
                    <Search className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Tidak ada kelas terjadwal hari ini.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedClasses).map(([className, sessions]) => (
                    <div key={className} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wide text-primary/80">{className}</h3>
                      </div>
                      <div className="space-y-2">
                        {sessions.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedClassId(item.id)}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden",
                              selectedClassId === item.id 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02] z-10" 
                                : "bg-card hover:border-primary/30 hover:bg-muted/50"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <Badge variant={selectedClassId === item.id ? "outline" : "secondary"} className={cn(
                                "font-semibold text-[11px] rounded-full px-2.5",
                                selectedClassId === item.id && "text-white border-white/40"
                              )}>
                                {item.startTime} - {item.endTime}
                              </Badge>
                              {selectedClassId === item.id && (
                                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] opacity-70 mt-3">
                              <User className="h-3 w-3" />
                              <span className="font-medium">{item.teacherName}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Marking */}
            <div className="lg:col-span-8">
              {selectedClass ? (
                <Card className="shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-6 border-b border-muted">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold">{selectedClass.className}</CardTitle>
                            <CardDescription className="text-xs font-medium uppercase tracking-wide">
                              Sesi {selectedClass.startTime} WIB
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleSaveAttendance}
                        className="gap-2 h-10"
                      >
                        <Save className="h-4 w-4" /> Simpan Presensi
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-5 bg-muted/10 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm font-semibold">
                        <Users className="h-4 w-4 text-primary" />
                        Daftar Siswa
                        <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-none rounded-full">
                          {mergedParticipants.length} Siswa
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                          Hadir: {Object.values(attendance[selectedClass.id] || {}).filter(Boolean).length}
                        </div>
                        {user?.role === "super_admin" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg gap-1.5 text-[11px] font-semibold border-success/20 hover:bg-success/5 hover:text-success transition-all text-success"
                            onClick={() => {
                              if (!selectedClass.teacherPhone) return toast.error("Nomor telepon pengajar tidak tersedia");
                              const text = encodeURIComponent(`Halo *${selectedClass.teacherName}*,\n\nAnda memiliki jadwal mengajar hari ini pukul *${selectedClass.startTime} WIB* untuk kelas ${selectedClass.className}.`);
                              window.open(`https://wa.me/${selectedClass.teacherPhone}?text=${text}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-3 w-3" /> Ingatkan Tutor
                          </Button>
                        )}
                        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                          <DialogTrigger render={(props) => (
                            <Button {...props} variant="outline" size="sm" className="h-8 rounded-lg gap-1.5 text-[11px] font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                              <UserPlus className="h-3 w-3" /> Tambah Siswa
                            </Button>
                          )} />
                          <DialogContent className="sm:max-w-md rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-bold">Tambah Siswa Dadakan</DialogTitle>
                              <DialogDescription>
                                Pilih siswa yang hadir di sesi ini meskipun tidak terdaftar resmi di kelas.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="Cari nama siswa..."
                                  className="pl-10 h-10 rounded-lg bg-card border border-border/60" 
                                  value={studentSearch}
                                  onChange={(e) => setStudentSearch(e.target.value)}
                                />
                              </div>
                              <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                  {availableStudents.length === 0 ? (
                                    <div className="text-center py-10 opacity-40">
                                      <p className="text-sm">Siswa tidak ditemukan atau sudah ada di daftar.</p>
                                    </div>
                                  ) : (
                                    availableStudents.map(student => (
                                      <button
                                        key={student.id}
                                        onClick={() => addAdHocStudent(student)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors group"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-semibold text-xs uppercase">
                                            {student.name.charAt(0)}
                                          </div>
                                          <div className="text-left">
                                            <p className="text-sm font-semibold group-hover:text-primary">{student.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{student.phone}</p>
                                          </div>
                                        </div>
                                        <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                      </button>
                                    ))
                                  )}
                                </div>
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <ScrollArea className="h-[450px]">
                      <div className="divide-y divide-muted/50">
                        {mergedParticipants.map((p, idx) => {
                          const isAdHoc = currentAdHoc.some(adhoc => adhoc.id === p.id);
                          return (
                            <div 
                              key={p.id} 
                              className={cn(
                                "flex items-center justify-between p-5 px-8 hover:bg-muted/20 transition-colors group cursor-pointer",
                                attendance[selectedClass.id]?.[p.id] && "bg-primary/[0.02]"
                              )}
                              onClick={() => toggleAttendance(selectedClass.id, p.id)}
                            >
                              <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center text-primary font-bold text-sm border border-transparent group-hover:border-primary/20 group-hover:bg-white transition-all">
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm group-hover:text-primary transition-colors">{p.name}</p>
                                    {isAdHoc && (
                                      <Badge className="bg-warning-muted text-warning hover:bg-warning-muted rounded-lg text-[11px] font-semibold h-4 px-1.5 border-none">
                                        TAMBAHAN
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{p.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {isAdHoc && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeAdHocStudent(p.id);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                <Badge 
                                  className={cn(
                                    "text-[11px] font-bold px-3 py-1 rounded-full border-none transition-all",
                                    attendance[selectedClass.id]?.[p.id] 
                                      ? "bg-success-muted text-success" 
                                      : "bg-destructive/10 text-destructive"
                                  )}
                                >
                                  {attendance[selectedClass.id]?.[p.id] ? "HADIR" : "ALPA"}
                                </Badge>
                                <Checkbox 
                                  checked={attendance[selectedClass.id]?.[p.id] || false}
                                  onCheckedChange={() => toggleAttendance(selectedClass.id, p.id)}
                                  className="h-7 w-7 rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center min-h-[500px] border-2 border-dashed rounded-xl bg-muted/5 opacity-50">
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                    <CheckSquare className="h-10 w-10 text-primary/20" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight">Pilih Jadwal Kelas</h3>
                  <p className="text-sm text-muted-foreground max-w-xs text-center mt-2 font-medium">
                    Silakan pilih kelas di samping untuk memproses rekap absensi harian.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* --- HISTORY TAB (Super Admin) --- */}
        <TabsContent value="riwayat" className="space-y-6">
          {/* History Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid gap-2 w-full lg:flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ml-1">Cari Kursus</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama kursus..." 
                  className="pl-10 h-10 rounded-lg bg-card border border-border/60 focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground/60" 
                  value={searchCourse}
                  onChange={(e) => setSearchCourse(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2 w-full lg:w-40">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ml-1">Tahun</label>
              <Select value={filterYear} onValueChange={(v) => v && setFilterYear(v)}>
                <SelectTrigger className="h-10 rounded-lg bg-card border border-border/60 font-medium text-sm focus-visible:ring-0 shadow-none">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 w-full lg:w-56">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ml-1">Bulan</label>
              <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
                <SelectTrigger className="h-10 rounded-lg bg-card border border-border/60 font-medium text-sm focus-visible:ring-0 shadow-none">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  className="h-10 w-10 p-0 rounded-lg border-muted hover:bg-muted" 
                  onClick={() => { setSearchCourse(""); setFilterMonth("all"); }}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

          {/* Records Table */}
          {/* Classes Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isHistoryLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <Card className="col-span-full shadow-sm rounded-xl overflow-hidden py-32 bg-muted/20">
                <CardContent className="flex flex-col items-center gap-3 opacity-30">
                  <Calendar className="h-16 w-16" />
                  <p className="text-lg font-bold">Tidak ada rekaman sejarah.</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedHistory).map(([className, records]: [string, any]) => {
                const lastSession = records[0];
                return (
                  <Card key={className} className="shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden group hover:-translate-y-1">
                    <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 pb-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="rounded-full bg-primary text-white border-none font-semibold text-[11px] px-3">
                          {records.length} SESI
                        </Badge>
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform duration-500">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold leading-tight text-primary">
                        {className}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-6">
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                          <div className="p-2 rounded-xl bg-muted/50">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span>Terakhir: {new Date(lastSession.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => { setSelectedClassHistory(className); setIsHistorySheetOpen(true); }}
                        className="w-full h-12 rounded-xl font-semibold text-xs uppercase tracking-wide transition-all duration-300 group"
                      >
                        Lihat Riwayat Sesi
                        <ChevronRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-[600px] lg:max-w-[650px] p-0 shadow-lg">
              <div className="h-full flex flex-col">
                <SheetHeader className="p-8 bg-primary text-primary-foreground space-y-2">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <SheetTitle className="text-2xl font-bold text-white">{selectedClassHistory}</SheetTitle>
                      <SheetDescription className="text-white/60 font-semibold uppercase tracking-wide text-[11px]">
                        Arsip Lengkap Kehadiran Kelas
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-8">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide px-4">Tanggal & Jam</TableHead>
                            <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide">Pengajar</TableHead>
                            <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-center">Statistik</TableHead>
                            <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-right px-4">Laporan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeClassSessions.map((record) => (
                            <TableRow key={record.id} className="hover:bg-muted/30 transition-colors border-muted/20">
                              <TableCell className="py-3 px-4 font-semibold text-sm">
                                <div className="flex flex-col">
                                  <span>{new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                  <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wide">Jam {new Date(record.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 font-semibold text-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                                    {record.teacherName.charAt(0)}
                                  </div>
                                  {record.teacherName}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-sm font-bold">{record.presentCount} / {record.totalParticipants}</span>
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        (record.presentCount / record.totalParticipants) > 0.8 ? "bg-success" : "bg-warning"
                                      )} 
                                      style={{ width: `${(record.presentCount / record.totalParticipants) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-right px-4">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-lg font-semibold h-9 border-muted hover:border-primary hover:text-primary transition-all duration-300" 
                                  onClick={() => { setSelectedRecord(record); setIsDetailOpen(true); }}
                                >
                                  Detail
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Single Detail Dialog for History */}
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
              {selectedRecord && (
                <>
                  <div className="bg-primary p-10 text-primary-foreground">
                    <DialogHeader className="p-0">
                      <DialogTitle className="text-2xl font-bold">{selectedRecord.className}</DialogTitle>
                      <DialogDescription className="text-primary-foreground/70 font-semibold uppercase tracking-wide text-[11px] pt-1">
                        Riwayat Kehadiran Siswa • {formatDate(selectedRecord.date)}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="p-0">
                    <ScrollArea className="h-[400px]">
                      <div className="divide-y divide-muted/50">
                        {selectedRecord.studentAttendance.map((sa: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-6 px-10 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-5">
                              <div className="text-[11px] font-bold text-muted-foreground bg-muted/80 h-6 w-6 rounded-lg flex items-center justify-center">{idx + 1}</div>
                              <span className="font-semibold text-sm tracking-tight">{sa.studentName}</span>
                            </div>
                            <Badge 
                              className={cn(
                                "rounded-full font-bold text-[11px] px-3.5 py-1 border-none shadow-sm",
                                sa.status === 'present' ? "bg-success-muted text-success" : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {sa.status === 'present' ? "HADIR" : "ALPA"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="p-8 bg-muted/30 border-t flex justify-between items-center px-10">
                      <div>
                        <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide mb-1">Total Kehadiran</div>
                        <div className="text-sm font-bold text-primary">{selectedRecord.presentCount} dari {selectedRecord.totalParticipants} Siswa</div>
                      </div>
                      <div className="h-16 w-16 rounded-full border-4 border-primary flex items-center justify-center text-lg font-bold text-primary shadow-inner bg-white">
                        {Math.round((selectedRecord.presentCount / selectedRecord.totalParticipants) * 100)}%
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
