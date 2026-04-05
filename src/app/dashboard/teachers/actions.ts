"use server";

import { db } from "@/db";
import { teachers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTeachers() {
  try {
    const data = await db.query.teachers.findMany({
      orderBy: [desc(teachers.createdAt)],
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function createTeacher(data: {
  name: string;
  phone: string;
  assignedClasses: string;
  schedule: string;
}) {
  try {
    const [teacher] = await db.insert(teachers).values(data).returning();
    revalidatePath("/dashboard/teachers");
    return { data: teacher, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function updateTeacher(id: string, data: {
  name?: string;
  phone?: string;
  assignedClasses?: string;
  schedule?: string;
}) {
  try {
    const [teacher] = await db
      .update(teachers)
      .set(data)
      .where(eq(teachers.id, id))
      .returning();
    revalidatePath("/dashboard/teachers");
    return { data: teacher, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function deleteTeacher(id: string) {
  try {
    await db.delete(teachers).where(eq(teachers.id, id));
    revalidatePath("/dashboard/teachers");
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
