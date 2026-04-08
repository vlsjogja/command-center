"use server";

import { db } from "@/db";
import { 
  users, 
  participants, 
  statusHistory, 
  classPackages, 
  participantClasses, 
  payments, 
  packages, 
  teachers, 
  attendanceRecords, 
  studentAttendance, 
  activityLogs, 
  messageTemplates 
} from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";

export async function getDatabaseStats() {
  try {
    const stats: Record<string, number> = {};

    const queries = {
      users: db.select({ val: count() }).from(users),
      participants: db.select({ val: count() }).from(participants),
      status_history: db.select({ val: count() }).from(statusHistory),
      class_packages: db.select({ val: count() }).from(classPackages),
      participant_classes: db.select({ val: count() }).from(participantClasses),
      payments: db.select({ val: count() }).from(payments),
      packages: db.select({ val: count() }).from(packages),
      teachers: db.select({ val: count() }).from(teachers),
      attendance_records: db.select({ val: count() }).from(attendanceRecords),
      student_attendance: db.select({ val: count() }).from(studentAttendance),
      activity_logs: db.select({ val: count() }).from(activityLogs),
      message_templates: db.select({ val: count() }).from(messageTemplates),
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const res = await query;
        return [key, res[0]?.val ?? 0];
      })
    );

    results.forEach(([key, val]) => {
      stats[key as string] = val as number;
    });

    return { data: stats, error: null };
  } catch (error: any) {
    console.error("Error fetching DB stats:", error);
    return { data: null, error: error.message };
  }
}

export async function getBackupData(sourceId: string) {
  try {
    let data : any[] = [];

    if (sourceId === "payments") {
      data = await db.query.payments.findMany({
        with: {
          participant: true,
          package: true,
        },
        orderBy: [desc(payments.createdAt)],
      });
    } else if (sourceId === "attendance_records") {
      data = await db.query.attendanceRecords.findMany({
        with: {
          studentAttendance: {
            with: {
              student: true,
            }
          }
        },
        orderBy: [desc(attendanceRecords.date)],
      });
    } else if (sourceId === "student_attendance") {
      data = await db
        .select({
          id: studentAttendance.id,
          attendanceRecordId: studentAttendance.attendanceRecordId,
          studentId: studentAttendance.studentId,
          studentName: studentAttendance.studentName,
          status: studentAttendance.status,
          date: attendanceRecords.date,
          className: attendanceRecords.className,
          teacherName: attendanceRecords.teacherName,
        })
        .from(studentAttendance)
        .innerJoin(attendanceRecords, eq(studentAttendance.attendanceRecordId, attendanceRecords.id))
        .orderBy(desc(attendanceRecords.date));
    } else if (sourceId === "activity_logs") {
      data = await db.query.activityLogs.findMany({
        orderBy: [desc(activityLogs.timestamp)],
        limit: 1000,
      });
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Error fetching backup data for ${sourceId}:`, error);
    return { data: [], error: error.message };
  }
}

export async function getParticipants() {
  try {
    const data = await db.query.participants.findMany({
      where: eq(participants.status, "active"),
      orderBy: [desc(participants.name)],
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching participants:", error);
    return { data: [], error: error.message };
  }
}

export async function getClasses() {
  try {
    const data = await db.query.classPackages.findMany({
      orderBy: [desc(classPackages.name)],
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching classes:", error);
    return { data: [], error: error.message };
  }
}

export async function getTablePreview(tableName: string) {
  try {
    let data: any[] = [];
    
    // Dynamically fetch from the requested table (limited to 5 for preview)
    switch (tableName) {
      case 'users': data = await db.query.users.findMany({ limit: 5 }); break;
      case 'participants': data = await db.query.participants.findMany({ limit: 5 }); break;
      case 'status_history': data = await db.query.statusHistory.findMany({ limit: 5 }); break;
      case 'class_packages': data = await db.query.classPackages.findMany({ limit: 5 }); break;
      case 'participant_classes': data = await db.query.participantClasses.findMany({ limit: 5 }); break;
      case 'payments': data = await db.query.payments.findMany({ limit: 5 }); break;
      case 'packages': data = await db.query.packages.findMany({ limit: 5 }); break;
      case 'teachers': data = await db.query.teachers.findMany({ limit: 5 }); break;
      case 'attendance_records': data = await db.query.attendanceRecords.findMany({ limit: 5 }); break;
      case 'student_attendance': data = await db.query.studentAttendance.findMany({ limit: 5 }); break;
      case 'activity_logs': data = await db.query.activityLogs.findMany({ limit: 5, orderBy: [desc(activityLogs.timestamp)] }); break;
      case 'message_templates': data = await db.query.messageTemplates.findMany({ limit: 5 }); break;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Error fetching preview for ${tableName}:`, error);
    return { data: [], error: error.message };
  }
}
