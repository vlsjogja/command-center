"use server";

import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getTemplates() {
  try {
    const data = await db.query.messageTemplates.findMany({
      orderBy: [desc(messageTemplates.updatedAt)],
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function updateTemplate(id: string, content: string) {
  try {
    const [template] = await db
      .update(messageTemplates)
      .set({ content, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    revalidatePath("/dashboard/message-templates");
    return { data: template, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
