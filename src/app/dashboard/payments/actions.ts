"use server";

import { db } from "@/db";
import { payments, participants, packages, statusHistory, messageTemplates } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { activityLogs as activityLogsTable } from "@/db/schema";

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

    // Logic for SUCCESS payment
    if (formData.paymentStatus === "success") {
      const session = await auth();
      const userName = session?.user?.name || "System (Payment)";

      const pkg = await db.query.packages.findFirst({
        where: eq(packages.id, formData.classPackageId)
      });

      if (pkg) {
        // Update billing time if it's a subscription
        if (pkg.type === "subscription") {
          const paymentDate = formData.paymentTime ? new Date(formData.paymentTime) : new Date();
          const nextBilling = new Date(paymentDate);
          nextBilling.setMonth(nextBilling.getMonth() + pkg.durasi);

          await db.update(payments)
            .set({ billingTime: nextBilling })
            .where(eq(payments.id, newPayment.id));
        }

        // Add to Student Log
        await db.insert(activityLogsTable).values({
          action: "payment_success",
          targetType: "participant",
          targetId: formData.participantId,
          targetName: p?.name || "Siswa",
          performedBy: userName,
          details: `Pembayaran lunas untuk paket ${pkg.nama} senilai Rp ${formData.amount.toLocaleString("id-ID")}`,
        });
      }
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
    // Fetch current status before update
    const currentPayment = await db.query.payments.findFirst({
      where: eq(payments.id, id)
    });
    const oldStatus = currentPayment?.paymentStatus;

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

    // Logic for SUCCESS payment (triggered only when status changes TO success)
    if (formData.paymentStatus === "success" && oldStatus !== "success") {
      const session = await auth();
      const userName = session?.user?.name || "System (Payment)";

      const pkg = await db.query.packages.findFirst({
        where: eq(packages.id, formData.classPackageId)
      });

      if (pkg) {
        // Update billing time if it's a subscription
        if (pkg.type === "subscription") {
          const paymentDate = formData.paymentTime ? new Date(formData.paymentTime) : new Date();
          const nextBilling = new Date(paymentDate);
          nextBilling.setMonth(nextBilling.getMonth() + pkg.durasi);

          await db.update(payments)
            .set({ billingTime: nextBilling })
            .where(eq(payments.id, id));
        }

        // Add to Student Log
        await db.insert(activityLogsTable).values({
          action: "payment_success",
          targetType: "participant",
          targetId: formData.participantId,
          targetName: p?.name || "Siswa",
          performedBy: userName,
          details: `Pembayaran lunas untuk paket ${pkg.nama} senilai Rp ${formData.amount.toLocaleString("id-ID")}`,
        });
      }
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

export async function getMessageTemplates() {
  try {
    const data = await db.query.messageTemplates.findMany();
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching message templates:", error);
    return { data: [], error: error.message };
  }
}
