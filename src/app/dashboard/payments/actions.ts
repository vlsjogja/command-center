"use server";

import { db } from "@/db";
import { payments, participants, packages, statusHistory } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPayments() {
  try {
    const data = await db.query.payments.findMany({
      orderBy: [desc(payments.createdAt)],
      with: {
        participant: true,
        package: true,
      },
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return { data: [], error: error.message };
  }
}

export async function getSelectorData() {
  try {
    const [pData, pkgData] = await Promise.all([
      db.query.participants.findMany({
        orderBy: [desc(participants.name)],
      }),
      db.query.packages.findMany({
        where: eq(packages.status, "active"),
      }),
    ]);
    return { 
      data: { 
        participants: pData, 
        packages: pkgData 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error("Error fetching selector data:", error);
    return { data: null, error: error.message };
  }
}

export async function addPayment(formData: any) {
  try {
    const [newPayment] = await db.insert(payments).values({
      participantId: formData.participantId,
      classPackageId: formData.classPackageId,
      amount: formData.amount,
      billingTime: new Date(formData.billingTime),
      paymentTime: formData.paymentTime ? new Date(formData.paymentTime) : null,
      paymentStatus: formData.paymentStatus as any,
      participantStatus: formData.participantStatus as any,
      notes: formData.notes || null,
    }).returning();

    // If participant status changed, record in history
    const p = await db.query.participants.findFirst({
        where: eq(participants.id, formData.participantId)
    });

    if (p && p.status !== formData.participantStatus) {
        await db.update(participants)
            .set({ status: formData.participantStatus as any })
            .where(eq(participants.id, formData.participantId));
        
        await db.insert(statusHistory).values({
            participantId: formData.participantId,
            status: formData.participantStatus as any,
            changedBy: "System (Payment)",
            reason: "Perubahan status otomatis saat tambah pembayaran",
        });
    }
    
    revalidatePath("/dashboard/payments");
    return { data: newPayment, error: null };
  } catch (error: any) {
    console.error("Error adding payment:", error);
    return { data: null, error: error.message };
  }
}

export async function updatePayment(id: string, formData: any) {
  try {
    const [updatedPayment] = await db.update(payments)
      .set({
        participantId: formData.participantId,
        classPackageId: formData.classPackageId,
        amount: formData.amount,
        billingTime: new Date(formData.billingTime),
        paymentTime: formData.paymentTime ? new Date(formData.paymentTime) : null,
        paymentStatus: formData.paymentStatus as any,
        participantStatus: formData.participantStatus as any,
        notes: formData.notes || null,
      })
      .where(eq(payments.id, id))
      .returning();

    // Sync participant status
    const p = await db.query.participants.findFirst({
        where: eq(participants.id, formData.participantId)
    });

    if (p && p.status !== formData.participantStatus) {
        await db.update(participants)
            .set({ status: formData.participantStatus as any })
            .where(eq(participants.id, formData.participantId));
        
        await db.insert(statusHistory).values({
            participantId: formData.participantId,
            status: formData.participantStatus as any,
            changedBy: "System (Payment)",
            reason: formData.reason || "Perubahan status otomatis melalui edit pembayaran",
        });
    }
      
    revalidatePath("/dashboard/payments");
    return { data: updatedPayment, error: null };
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return { data: null, error: error.message };
  }
}

export async function deletePayment(id: string) {
  try {
    await db.delete(payments).where(eq(payments.id, id));
    revalidatePath("/dashboard/payments");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return { success: false, error: error.message };
  }
}
