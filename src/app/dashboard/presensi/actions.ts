"use server";

import { db } from "@/db";
import { 
  attendanceRecords, 
  studentAttendance, 
  teachers, 
  classPackages,
  participants
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAttendanceHistory() {
  try {
    const records = await db.query.attendanceRecords.findMany({
      orderBy: [desc(attendanceRecords.date)],
      with: {
        studentAttendance: {
          with: {
            student: true
          }
        }
      }
    });

    const formatted = records.map(r => ({
      id: r.id,
      date: r.date,
      className: r.className,
      teacherName: r.teacherName,
      presentCount: r.presentCount,
      totalParticipants: r.totalParticipants,
      studentAttendance: r.studentAttendance.map(sa => ({
        studentName: sa.studentName,
        status: sa.status
      }))
    }));

    return { data: formatted, error: null };
  } catch (error: any) {
    console.error("Error fetching attendance history:", error);
    return { data: [], error: error.message };
  }
}

export async function saveAttendanceRecord(data: {
  teacherName: string;
  className: string;
  date: string;
  attendance: { participantId: string; participantName: string; status: "present" | "absent" }[];
}) {
  try {
    const totalParticipants = data.attendance.length;
    const presentCount = data.attendance.filter(a => a.status === "present").length;

    // 1. Create the record
    const [record] = await db.insert(attendanceRecords).values({
      className: data.className,
      teacherName: data.teacherName,
      date: new Date(data.date),
      totalParticipants,
      presentCount
    }).returning();

    // 2. Create student entries
    if (data.attendance.length > 0) {
      await db.insert(studentAttendance).values(
        data.attendance.map(a => ({
          attendanceRecordId: record.id,
          studentId: a.participantId,
          studentName: a.participantName,
          status: a.status
        }))
      );
    }

    revalidatePath("/dashboard/presensi");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error saving attendance:", error);
    return { success: false, error: error.message };
  }
}

export async function getTodayData() {
  try {
    const teachersData = await db.query.teachers.findMany({
      with: {
        user: true,
      },
    });

    const pkgsData = await db.query.classPackages.findMany({
      with: {
        enrollments: {
          with: {
            participant: true
          }
        }
      }
    });
    const allParticipants = await db.query.participants.findMany({
      where: eq(participants.status, "active")
    });
    
    return { 
      data: { 
        teachers: teachersData, 
        packages: pkgsData,
        allParticipants
      }, 
      error: null 
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
