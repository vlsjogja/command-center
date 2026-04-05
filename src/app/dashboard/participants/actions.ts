"use server";

import { db } from "@/db";
import { participants, statusHistory, payments, packages, activityLogs as activityLogsTable } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { Participant, Role } from "@/types";
import { revalidatePath } from "next/cache";

export async function getParticipants() {
  try {
    const data = await db.query.participants.findMany({
      orderBy: [desc(participants.createdAt)],
      with: {
        statusHistory: {
          orderBy: [desc(statusHistory.changedAt)],
        },
        activityLogs: {
          orderBy: [desc(activityLogsTable.timestamp)],
        },
      },
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching participants:", error);
    return { data: [], error: error.message };
  }
}

export async function getParticipantDetail(id: string) {
  try {
    const data = await db.query.participants.findFirst({
      where: eq(participants.id, id),
      with: {
        statusHistory: {
          orderBy: [desc(statusHistory.changedAt)],
        },
        payments: {
          with: {
            package: true,
          },
          orderBy: [desc(payments.createdAt)],
        },
        activityLogs: {
          orderBy: [desc(activityLogsTable.timestamp)],
        },
      },
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching participant detail:", error);
    return { data: null, error: error.message };
  }
}

export async function addParticipant(formData: Omit<Participant, "id" | "statusHistory"> & { reason?: string }) {
  try {
    const [newP] = await db.insert(participants).values({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      status: formData.status as any,
      createdBy: formData.createdBy || "Admin",
      createdAt: new Date(formData.createdAt),
    }).returning();

    // Add initial status history
    await db.insert(statusHistory).values({
      participantId: newP.id,
      status: newP.status,
      changedBy: formData.createdBy || "Admin",
      reason: formData.reason || "Pendaftaran awal",
    });

    revalidatePath("/dashboard/participants");
    return { data: newP, error: null };
  } catch (error: any) {
    console.error("Error adding participant:", error);
    return { data: null, error: error.message };
  }
}

export async function updateParticipant(id: string, formData: Partial<Omit<Participant, "id" | "statusHistory">> & { reason?: string; performedBy?: string }) {
  try {
    const existing = await db.query.participants.findFirst({
      where: eq(participants.id, id),
    });

    if (!existing) throw new Error("Peserta tidak ditemukan");

    const statusChanged = formData.status && existing.status !== formData.status;

    const [updatedP] = await db.update(participants)
      .set({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        status: formData.status as any,
        createdAt: formData.createdAt ? new Date(formData.createdAt) : undefined,
      })
      .where(eq(participants.id, id))
      .returning();

    if (statusChanged) {
      await db.insert(statusHistory).values({
        participantId: id,
        status: formData.status as any,
        changedBy: formData.performedBy || "Admin",
        reason: formData.reason || "Perubahan status manual",
      });
    }

    revalidatePath("/dashboard/participants");
    return { data: updatedP, error: null };
  } catch (error: any) {
    console.error("Error updating participant:", error);
    return { data: null, error: error.message };
  }
}

export async function deleteParticipant(id: string) {
  try {
    await db.delete(participants).where(eq(participants.id, id));
    revalidatePath("/dashboard/participants");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting participant:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkAddParticipants(data: (Omit<Participant, "id" | "statusHistory">)[]) {
  try {
    for (const item of data) {
      const [newP] = await db.insert(participants).values({
        name: item.name,
        email: item.email,
        phone: item.phone,
        address: item.address,
        status: item.status as any,
        createdBy: item.createdBy || "Admin",
        createdAt: new Date(item.createdAt),
      }).returning();

      await db.insert(statusHistory).values({
        participantId: newP.id,
        status: newP.status,
        changedBy: item.createdBy || "Admin",
        reason: "Import CSV",
      });
    }
    
    revalidatePath("/dashboard/participants");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error bulk adding participants:", error);
    return { success: false, error: error.message };
  }
}
