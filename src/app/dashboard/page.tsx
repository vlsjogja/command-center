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
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-primary" />
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
        ))}
      </div>

      {/* Teacher Content */}
      {isTeacher && teacherData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Jadwal Mengajar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherData.schedule.split(';').map((sched, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-muted">
                    <p className="text-sm font-medium leading-relaxed">
                      {sched.trim()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Kelas yang Diampu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {teacherData.assignedClasses.split(',').map((cls, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm font-normal">
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
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Pembayaran Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
