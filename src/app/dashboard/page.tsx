"use client";

import { useAuth } from "@/lib/auth-context";
import { 
  dummyParticipants, 
  dummyPackages, 
  dummyPayments, 
  dummyTeachers,
  dummyClassPackages,
  dummyParticipantClasses
} from "@/lib/dummy-data";
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
} from "lucide-react";

const STAT_THEMES = [
  { bg: "rgba(99,102,241,0.10)", iconBg: "rgba(99,102,241,0.18)", iconColor: "#6366f1", border: "rgba(99,102,241,0.15)" },
  { bg: "rgba(139,92,246,0.10)", iconBg: "rgba(139,92,246,0.18)", iconColor: "#8b5cf6", border: "rgba(139,92,246,0.15)" },
  { bg: "rgba(16,185,129,0.10)", iconBg: "rgba(16,185,129,0.18)", iconColor: "#10b981", border: "rgba(16,185,129,0.15)" },
  { bg: "rgba(245,158,11,0.10)", iconBg: "rgba(245,158,11,0.18)", iconColor: "#f59e0b", border: "rgba(245,158,11,0.15)" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const isTeacher = user?.role === "teacher";
  const teacherData = isTeacher && user ? dummyTeachers.find(t => t.id === user.teacherId) : null;

  const assignedClassNames = teacherData ? teacherData.assignedClasses.split(',').map(c => c.trim()) : [];
  
  const assignedClassIds = dummyClassPackages
    .filter((cls) => assignedClassNames.includes(cls.name))
    .map((cls) => cls.id);

  const assignedParticipantIds = dummyParticipantClasses
    .filter((pc) => assignedClassIds.includes(pc.classPackageId))
    .map((pc) => pc.participantId);

  const uniqueAssignedParticipantIds = Array.from(new Set(assignedParticipantIds));

  const dashboardParticipants = isTeacher
    ? dummyParticipants.filter((p) => uniqueAssignedParticipantIds.includes(p.id))
    : dummyParticipants;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isThisMonth = (dateString: string | null | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const activeParticipants = dashboardParticipants.filter((p) => p.status === "active").length;
  const newParticipantsThisMonth = dashboardParticipants.filter((p) => isThisMonth(p.createdAt)).length;
  
  const totalPackagesCount = isTeacher ? assignedClassNames.length : dummyPackages.length;
  const newPackagesThisMonth = dummyPackages.filter((p) => isThisMonth(p.createdAt)).length;

  // Compute effectiveStatus for each payment (mirrors payments page logic)
  const enhancedPayments = dummyPayments.map((p) => {
    const pkg = dummyPackages.find((c) => c.id === p.classPackageId);
    const durationMonths = pkg?.durasi ?? 1;
    let effectiveStatus = p.paymentStatus;
    let effectiveBillingDate = p.billingTime;

    if (p.paymentStatus === "success" && p.paymentTime) {
      const paymentDate = new Date(p.paymentTime);
      const nextBilling = new Date(paymentDate);
      nextBilling.setMonth(nextBilling.getMonth() + durationMonths);
      effectiveBillingDate = nextBilling.toISOString();

      const warningDate = new Date(nextBilling);
      warningDate.setDate(warningDate.getDate() - 7);

      if (now > nextBilling) {
        effectiveStatus = "overdue";
      } else if (now >= warningDate) {
        effectiveStatus = "pending";
      }
    } else if (p.paymentStatus === "pending" && p.billingTime) {
      if (now > new Date(p.billingTime)) {
        effectiveStatus = "overdue";
      }
    }

    return { ...p, effectiveStatus, effectiveBillingDate };
  });

  const thisMonthPayments = enhancedPayments.filter((p) =>
    isThisMonth(p.paymentTime) || isThisMonth(p.effectiveBillingDate)
  );

  const totalRevenue = thisMonthPayments
    .filter((p) => p.effectiveStatus === "success" && isThisMonth(p.paymentTime))
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = thisMonthPayments.filter((p) => p.effectiveStatus === "pending").length;
  const overduePayments = thisMonthPayments.filter((p) => p.effectiveStatus === "overdue").length;
  const successPayments = thisMonthPayments.filter((p) => p.effectiveStatus === "success" && isThisMonth(p.paymentTime)).length;
  const failedPayments = thisMonthPayments.filter((p) => p.effectiveStatus === "failed").length;

  const statCards = [
    {
      title: "Siswa aktif",
      value: activeParticipants.toString(),
      subtitle: `${newParticipantsThisMonth} siswa baru`,
      icon: Users,
      show: true,
    },
    {
      title: "Total Kelas",
      value: totalPackagesCount,
      subtitle: `${newPackagesThisMonth} baru bulan ini`,
      icon: BookOpen,
      show: true,
    },
    {
      title: "Pendapatan (Bulan Ini)",
      value: formatCurrency(totalRevenue),
      subtitle: `${successPayments} transaksi sukses`,
      icon: TrendingUp,
      show: !isTeacher,
    },
    {
      title: "Menunggu Bayar (Bulan Ini)",
      value: pendingPayments + overduePayments,
      subtitle: `${overduePayments} sudah jatuh tempo`,
      icon: CreditCard,
      show: !isTeacher,
    },
  ].filter(card => card.show);

  const recentPayments = [...thisMonthPayments]
    .sort((a, b) => new Date(b.paymentTime || b.effectiveBillingDate).getTime() - new Date(a.paymentTime || a.effectiveBillingDate).getTime())
    .slice(0, 5);

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
              {/* Subtle gradient top accent */}
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
                {teacherData.schedule.split(';').map((sched, idx) => (
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
                {teacherData.assignedClasses.split(',').map((cls, idx) => (
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
              {recentPayments.map((payment) => {
                const participant = dummyParticipants.find(
                  (p) => p.id === payment.participantId
                );
                const pkg = dummyPackages.find(
                  (c) => c.id === payment.classPackageId
                );
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors border border-transparent hover:border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon[payment.effectiveStatus as keyof typeof statusIcon]}
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
                      {statusBadge[payment.effectiveStatus as keyof typeof statusBadge]}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
