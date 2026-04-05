"use server";

import { db } from "@/db";
import { teachers, users } from "@/db/schema";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTeachers() {
  try {
    const data = await db.query.teachers.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(teachers.createdAt)],
    });
    return { data: data as any[], error: null };
  } catch (error: any) {
    console.error("Error fetching teachers:", error);
    return { data: [], error: error.message };
  }
}

export async function createTeacher(data: {
  userId?: string | null;
  name: string;
  phone: string;
  assignedClasses: string;
  schedule: string;
}) {
  try {
    const id = crypto.randomUUID();
    const [teacher] = await db.insert(teachers).values({
      id,
      userId: data.userId,
      name: data.name,
      phone: data.phone,
      assignedClasses: data.assignedClasses,
      schedule: data.schedule,
    }).returning();


    
    // Sync back to users table
    if (data.userId) {
      await db.update(users).set({ teacherId: teacher.id }).where(eq(users.id, data.userId));
    }
    
    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/accounts");
    return { data: teacher, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function updateTeacher(id: string, data: {
  userId?: string | null;
  name?: string;
  phone?: string;
  assignedClasses?: string;
  schedule?: string;
}) {
  try {
    // Get old teacher to check if userId changed
    const oldTeacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, id),
    });

    const [teacher] = await db
      .update(teachers)
      .set({
        userId: data.userId,
        name: data.name,
        phone: data.phone,
        assignedClasses: data.assignedClasses,
        schedule: data.schedule,
      })
      .where(eq(teachers.id, id))
      .returning();
    
    // Handle user link sync
    if (data.userId && data.userId !== oldTeacher?.userId) {
      // Clear old link if any
      if (oldTeacher?.userId) {
        await db.update(users).set({ teacherId: null }).where(eq(users.id, oldTeacher.userId));
      }
      // Set new link
      await db.update(users).set({ teacherId: id }).where(eq(users.id, data.userId));
    } else if (data.userId === null && oldTeacher?.userId) {
      // Clear existing link
      await db.update(users).set({ teacherId: null }).where(eq(users.id, oldTeacher.userId));
    }

    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/accounts");
    return { data: teacher, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function deleteTeacher(id: string) {
  try {
    // Clear link in users table first to avoid fk issues or just let onDelete: set null handle it
    // Schema has references(() => teachers.id, { onDelete: "set null" })
    await db.delete(teachers).where(eq(teachers.id, id));
    revalidatePath("/dashboard/teachers");
    revalidatePath("/dashboard/accounts");
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
async function getTeacherAccounts() {
  try {
    const data = await db.query.users.findMany({
      where: eq(users.role, "teacher"),
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export { getTeacherAccounts };
