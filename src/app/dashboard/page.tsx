"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { getDashboardData } from "./actions";

const STAT_THEMES = [
  { bg: "rgba(99,102,241,0.10)", iconBg: "rgba(99,102,241,0.18)", iconColor: "#6366f1", border: "rgba(99,102,241,0.15)" },
  { bg: "rgba(139,92,246,0.10)", iconBg: "rgba(139,92,246,0.18)", iconColor: "#8b5cf6", border: "rgba(139,92,246,0.15)" },
  { bg: "rgba(16,185,129,0.10)", iconBg: "rgba(16,185,129,0.18)", iconColor: "#10b981", border: "rgba(16,185,129,0.15)" },
  { bg: "rgba(245,158,11,0.10)", iconBg: "rgba(245,158,11,0.18)", iconColor: "#f59e0b", border: "rgba(245,158,11,0.15)" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      const res = await getDashboardData(user?.id, user?.role);
      if (res.data) setData(res.data);
      setIsLoading(false);
    }
    if (user) loadStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Menghubungkan ke pusat data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">Belum ada data.</p>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher";
  const teacherData = isTeacher && data?.teacherInfo;

  const statCards = [
    {
      title: "Siswa aktif",
      value: data.studentsCount?.toString() || "0",
      subtitle: `${data.newStudentsCount || 0} baru bulan ini`,
      icon: Users,
      show: true,
    },
    {
      title: "Total Kelas",
      value: data.classesCount?.toString() || "0",
      subtitle: `Kelas yang tersedia`,
      icon: BookOpen,
      show: true,
    },
    {
      title: "Pendapatan (Bulan Ini)",
      value: formatCurrency(data.revenueThisMonth || 0),
      subtitle: `${data.successCount || 0} transaksi sukses`,
      icon: TrendingUp,
      show: !isTeacher,
    },
    {
      title: "Menunggu Bayar",
      value: (data.pendingCount || 0).toString(),
      subtitle: `Transaksi belum selesai`,
      icon: CreditCard,
      show: !isTeacher,
    },
  ].filter(card => card.show);

  const statusIcon = {
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
    pending: <Clock className="h-4 w-4 text-warning" />,
    overdue: <AlertTriangle className="h-4 w-4 text-destructive" />,
    failed: <XCircle className="h-4 w-4 text-muted-foreground" />,
  };

  const statusBadge = {
    success: <Badge variant="outline" className="border-success-border bg-success-muted text-success">Sukses</Badge>,
    pending: <Badge variant="outline" className="border-warning-border bg-warning-muted text-warning">Pending</Badge>,
    overdue: <Badge variant="destructive">Jatuh Tempo</Badge>,
    failed: <Badge variant="secondary">Gagal</Badge>,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat datang, {user?.name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Berikut ringkasan data kursus terbaru.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const theme = STAT_THEMES[idx % STAT_THEMES.length];
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{ borderColor: theme.border }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={{ background: `linear-gradient(90deg, ${theme.iconColor}, ${theme.iconColor}88)` }}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: theme.iconBg }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: theme.iconColor }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Teacher Content */}
      {isTeacher && teacherData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Clock className="h-4 w-4" style={{ color: '#6366f1' }} />
                </div>
                Jadwal Mengajar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teacherData.schedule.split(';').map((sched: string, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-accent/50 border border-border/60">
                    <p className="text-sm font-medium leading-relaxed">
                      {sched.trim()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <BookOpen className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                </div>
                Kelas yang Diampu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {teacherData.assignedClasses.split(',').map((cls: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm font-normal rounded-lg">
                    {cls.trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Payments - Hidden for Teachers */}
      {!isTeacher && (
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CreditCard className="h-4 w-4" style={{ color: '#10b981' }} />
              </div>
              Pembayaran Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-2">
              {data.recentPayments?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm border-dashed border rounded-xl">
                  Tidak ada data pembayaran terbaru.
                </div>
              ) : (
                data.recentPayments?.map((payment: any) => {
                  const participant = payment.participant;
                  const pkg = payment.package;
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        {statusIcon[payment.paymentStatus as keyof typeof statusIcon]}
                        <div>
                          <p className="text-sm font-medium">
                            {participant?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pkg?.nama ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        {statusBadge[payment.paymentStatus as keyof typeof statusBadge]}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
