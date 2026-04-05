"use server";

import { db } from "@/db";
import { classPackages, participantClasses, participants } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getClassPackages() {
  try {
    const data = await db.query.classPackages.findMany({
      orderBy: [desc(classPackages.createdAt)],
      with: {
        enrollments: {
          with: {
            participant: true,
          }
        }
      }
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching class packages:", error);
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

export async function addClassPackage(formData: any) {
  try {
    const [newPkg] = await db.insert(classPackages).values({
      name: formData.name,
      description: formData.description,
      learningDuration: formData.learningDuration,
    }).returning();
    
    revalidatePath("/dashboard/classes");
    return { data: newPkg, error: null };
  } catch (error: any) {
    console.error("Error adding class package:", error);
    return { data: null, error: error.message };
  }
}

export async function updateClassPackage(id: string, formData: any) {
  try {
    const [updatedPkg] = await db.update(classPackages)
      .set({
        name: formData.name,
        description: formData.description,
        learningDuration: formData.learningDuration,
      })
      .where(eq(classPackages.id, id))
      .returning();
      
    revalidatePath("/dashboard/classes");
    return { data: updatedPkg, error: null };
  } catch (error: any) {
    console.error("Error updating class package:", error);
    return { data: null, error: error.message };
  }
}

export async function deleteClassPackage(id: string) {
  try {
    // Check if there are enrollments
    const enrollments = await db.query.participantClasses.findMany({
      where: eq(participantClasses.classPackageId, id),
    });

    if (enrollments.length > 0) {
      return { success: false, error: "Hapus semua peserta terlebih dahulu sebelum menghapus kelas." };
    }

    await db.delete(classPackages).where(eq(classPackages.id, id));
    revalidatePath("/dashboard/classes");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting class package:", error);
    return { success: false, error: error.message };
  }
}

export async function assignParticipant(pkgId: string, participantId: string) {
  try {
    const [newAssignment] = await db.insert(participantClasses).values({
      participantId,
      classPackageId: pkgId,
    }).returning();
    
    revalidatePath("/dashboard/classes");
    return { data: newAssignment, error: null };
  } catch (error: any) {
    console.error("Error assigning participant:", error);
    return { data: null, error: error.message };
  }
}

export async function removeAssignment(id: string) {
  try {
    await db.delete(participantClasses).where(eq(participantClasses.id, id));
    revalidatePath("/dashboard/classes");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error removing assignment:", error);
    return { success: false, error: error.message };
  }
}

export async function moveAssignment(id: string, targetPkgId: string) {
  try {
    const [updated] = await db.update(participantClasses)
      .set({ classPackageId: targetPkgId })
      .where(eq(participantClasses.id, id))
      .returning();
      
    revalidatePath("/dashboard/classes");
    return { data: updated, error: null };
  } catch (error: any) {
    console.error("Error moving assignment:", error);
    return { data: null, error: error.message };
  }
}
