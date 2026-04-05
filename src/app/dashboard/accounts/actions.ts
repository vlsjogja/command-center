"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, ilike, sql } from "drizzle-orm";
import type { User, Role } from "@/types";
import { revalidatePath } from "next/cache";

// Simple password hash (matches seed.ts logic)
// For production, use bcrypt/argon2
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getUsers() {
  try {
    const data = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      teacherId: users.teacherId,
    }).from(users).orderBy(sql`${users.createdAt} DESC`);
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return { data: [], error: error.message };
  }
}

export async function addUser(formData: Omit<User, "id"> & { password?: string }) {
  try {
    const passwordHash = await hashPassword(formData.password || "password123");
    
    const [newUser] = await db.insert(users).values({
      name: formData.name,
      email: formData.email,
      passwordHash: passwordHash,
      role: formData.role as any,
      avatar: formData.avatar || null,
    }).returning();
    
    revalidatePath("/dashboard/accounts");
    return { data: newUser, error: null };
  } catch (error: any) {
    console.error("Error adding user:", error);
    return { data: null, error: error.message };
  }
}

export async function updateUser(id: string, formData: Partial<Omit<User, "id">> & { password?: string }) {
  try {
    const updateData: any = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      avatar: formData.avatar,
    };

    if (formData.password) {
      updateData.passwordHash = await hashPassword(formData.password);
    }

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
      
    revalidatePath("/dashboard/accounts");
    return { data: updatedUser, error: null };
  } catch (error: any) {
    console.error("Error updating user:", error);
    return { data: null, error: error.message };
  }
}

export async function deleteUser(id: string) {
  try {
    // Safety: Protect the first created admin in a real app
    // But here we rely on the UI and DB schema.
    await db.delete(users).where(eq(users.id, id));
    
    revalidatePath("/dashboard/accounts");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}
