"use server";

import { db } from "@/db";
import { participants, teachers, classPackages, payments, participantClasses } from "@/db/schema";
import { count, eq, sql, desc, and, gte } from "drizzle-orm";

export async function getDashboardData(userId?: string, role?: string) {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Basic Stats
    let studentsCount = 0;
    let newStudentsCount = 0;
    let classesCount = 0;
    let revenueThisMonth = 0;
    let pendingCount = 0;
    let successCount = 0;
    let teacherInfo = null;

    if (role === "teacher" && userId) {
      // Find teacher profile linked to this user
      const allTeachers = await db.query.teachers.findMany();
      teacherInfo = allTeachers.find(t => t.id === userId || t.name === userId);

      if (teacherInfo) {
        // Count assigned classes
        const assignedClasses = teacherInfo.assignedClasses.split(",").map((c: string) => c.trim()).filter(Boolean);
        classesCount = assignedClasses.length;

        // Count assigned students
        if (assignedClasses.length > 0) {
          const pkgs = await db.query.classPackages.findMany({
            where: (cp, { inArray }) => inArray(cp.name, assignedClasses)
          });
          const pkgIds = pkgs.map(p => p.id);
          
          if (pkgIds.length > 0) {
            const pc = await db.query.participantClasses.findMany({
              where: (pcTable, { inArray }) => inArray(pcTable.classPackageId, pkgIds),
              with: {
                participant: true
              }
            });
            const activeParticipants = pc.filter((p: any) => p.participant?.status === 'active');
            studentsCount = new Set(activeParticipants.map((item: any) => item.participantId)).size;

            const newActiveParticipants = activeParticipants.filter((p: any) => p.participant?.createdAt && p.participant.createdAt >= firstDayOfMonth);
            newStudentsCount = new Set(newActiveParticipants.map((item: any) => item.participantId)).size;
          }
        }
      }
    } else {
      // Admin View
      const sResult = await db.select({ val: count() }).from(participants).where(eq(participants.status, "active"));
      studentsCount = sResult[0]?.val ?? 0;

      const newSResult = await db.select({ val: count() }).from(participants).where(
        and(
          eq(participants.status, "active"),
          gte(participants.createdAt, firstDayOfMonth)
        )
      );
      newStudentsCount = newSResult[0]?.val ?? 0;

      const cResult = await db.select({ val: count() }).from(classPackages);
      classesCount = cResult[0]?.val ?? 0;

      // Revenue and Payments (roughly)
      // Use standard Drizzle operators for dates
      const allPayments = await db.query.payments.findMany({
        where: (paymentsTable, { gte, or }) => or(
          gte(paymentsTable.paymentTime, firstDayOfMonth),
          gte(paymentsTable.billingTime, firstDayOfMonth)
        )
      });

      allPayments.forEach(p => {
        if (p.paymentStatus === "success") {
          revenueThisMonth += p.amount;
          successCount++;
        } else if (p.paymentStatus === "pending" || p.paymentStatus === "overdue") {
          pendingCount++;
        }
      });
    }

    const recentPayments = await db.query.payments.findMany({
      with: {
        participant: true,
        package: true,
      },
      orderBy: (paymentsTable, { desc }) => [
        desc(paymentsTable.paymentTime),
        desc(paymentsTable.billingTime),
        desc(paymentsTable.createdAt)
      ],
      limit: 5,
    });

    return {
      data: {
        studentsCount,
        newStudentsCount,
        classesCount,
        revenueThisMonth,
        pendingCount,
        successCount,
        teacherInfo,
        recentPayments,
      },
      error: null
    };
  } catch (error: any) {
    console.error("Dashboard data error:", error);
    return { data: null, error: error.message };
  }
}
