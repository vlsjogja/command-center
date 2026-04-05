"use server";

import { db } from "@/db";
import { packages, classPackages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPackages() {
  try {
    const data = await db.query.packages.findMany({
      orderBy: [desc(packages.createdAt)],
      with: {
        classPackage: true,
      },
    });
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching packages:", error);
    return { data: [], error: error.message };
  }
}

export async function getClassPackages() {
  try {
    const data = await db.select().from(classPackages).orderBy(desc(classPackages.createdAt));
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching class packages:", error);
    return { data: [], error: error.message };
  }
}

export async function addPackage(formData: any) {
  try {
    const [newPackage] = await db.insert(packages).values({
      nama: formData.nama,
      nominal: formData.nominal,
      kelas: formData.kelas,
      durasi: formData.durasi,
      deskripsi: formData.deskripsi || null,
      status: formData.status as any,
    }).returning();
    
    revalidatePath("/dashboard/packages");
    return { data: newPackage, error: null };
  } catch (error: any) {
    console.error("Error adding package:", error);
    return { data: null, error: error.message };
  }
}

export async function updatePackage(id: string, formData: any) {
  try {
    const [updatedPackage] = await db.update(packages)
      .set({
        nama: formData.nama,
        nominal: formData.nominal,
        kelas: formData.kelas,
        durasi: formData.durasi,
        deskripsi: formData.deskripsi || null,
        status: formData.status as any,
      })
      .where(eq(packages.id, id))
      .returning();
      
    revalidatePath("/dashboard/packages");
    return { data: updatedPackage, error: null };
  } catch (error: any) {
    console.error("Error updating package:", error);
    return { data: null, error: error.message };
  }
}

export async function deletePackage(id: string) {
  try {
    await db.delete(packages).where(eq(packages.id, id));
    revalidatePath("/dashboard/packages");
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting package:", error);
    return { success: false, error: error.message };
  }
}
