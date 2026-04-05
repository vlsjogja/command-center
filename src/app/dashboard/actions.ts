"use server";

import { db } from "@/db";
import { participants, teachers, classPackages, payments, participantClasses } from "@/db/schema";
import { count, eq, sql, desc } from "drizzle-orm";

export async function getDashboardData(userId?: string, role?: string) {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Basic Stats
    let studentsCount = 0;
    let classesCount = 0;
    let revenueThisMonth = 0;
    let pendingCount = 0;
    let successCount = 0;
    let teacherInfo = null;

    if (role === "teacher" && userId) {
      // Find teacher profile linked to this user
      // Note: In a real app, you'd have a link between users and teachers. 
      // For now, we'll assume the userId might be the teacher name or a direct map is needed.
      // Assuming user.name or a lookup. Let's just fetch all and filter for now as a fallback.
      const allTeachers = await db.query.teachers.findMany();
      teacherInfo = allTeachers.find(t => t.id === userId || t.name === userId);

      if (teacherInfo) {
        // Count assigned classes
        const assignedClasses = teacherInfo.assignedClasses.split(",").map(c => c.trim());
        classesCount = assignedClasses.length;

        // Count assigned students
        // This is complex - need to find students in those classes
        const pkgs = await db.query.classPackages.findMany({
          where: sql`${classPackages.name} IN (${sql.join(assignedClasses.map(c => sql`${c}`), sql`, `)})`
        });
        const pkgIds = pkgs.map(p => p.id);
        
        if (pkgIds.length > 0) {
          const pc = await db.query.participantClasses.findMany({
            where: sql`${participantClasses.classPackageId} IN (${sql.join(pkgIds.map(id => sql`${id}`), sql`, `)})`
          });
          studentsCount = new Set(pc.map(item => item.participantId)).size;
        }
      }
    } else {
      // Admin View
      const [sResult] = await db.select({ val: count() }).from(participants).where(eq(participants.status, "active"));
      studentsCount = sResult.val;

      const [cResult] = await db.select({ val: count() }).from(classPackages);
      classesCount = cResult.val;

      // Revenue and Payments (roughly)
      const allPayments = await db.query.payments.findMany({
        where: sql`${payments.paymentTime} >= ${firstDayOfMonth} OR ${payments.billingTime} >= ${firstDayOfMonth}`
      });

      allPayments.forEach(p => {
        if (p.paymentStatus === "success") {
          revenueThisMonth += p.amount;
          successCount++;
        } else {
          pendingCount++;
        }
      });
    }

    const recentPayments = await db.query.payments.findMany({
      with: {
        participant: true,
        package: true,
      },
      orderBy: [desc(payments.paymentTime), desc(payments.billingTime)],
      limit: 5,
    });

    return {
      data: {
        studentsCount,
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
    return { data: null, error: error.message };
  }
}
