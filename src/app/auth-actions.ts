"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyLogin(email: string, password: string) {
  try {
    const passwordHash = await hashPassword(password);
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (user && user.passwordHash === passwordHash) {
      return { 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || undefined,
          teacherId: user.teacherId || undefined,
        } 
      };
    }
    
    return { success: false, error: "Email atau password salah" };
  } catch (error: any) {
    console.error("Login verification error:", error);
    return { success: false, error: error.message };
  }
}
