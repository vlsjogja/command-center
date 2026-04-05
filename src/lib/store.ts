// Simple in-memory store for dummy data phase
// Will be replaced with Supabase/Prisma calls later

import type {
  User,
  Participant,
  ClassPackage,
  ParticipantClass,
  Payment,
} from "@/types";
import {
  dummyUsers,
  dummyParticipants,
  dummyClassPackages,
  dummyParticipantClasses,
  dummyPayments,
} from "./dummy-data";

// Deep clone to avoid mutation of original data
function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

let users: User[] = clone(dummyUsers);
let participants: Participant[] = clone(dummyParticipants);
let classPackages: ClassPackage[] = clone(dummyClassPackages);
let participantClasses: ParticipantClass[] = clone(dummyParticipantClasses);
let payments: Payment[] = clone(dummyPayments);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ==================== AUTH ====================
export function authenticateUser(email: string, password: string): User | null {
  // Dummy auth: any password works as long as email matches
  const user = users.find((u) => u.email === email);
  if (user && password === "password123") return user;
  return null;
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

// ==================== PARTICIPANTS ====================
export function getParticipants(): Participant[] {
  return clone(participants);
}

export function getParticipantById(id: string): Participant | undefined {
  return participants.find((p) => p.id === id);
}

export function createParticipant(
  data: Omit<Participant, "id" | "createdAt">
): Participant {
  const p: Participant = {
    ...data,
    id: generateId("p"),
    createdAt: new Date().toISOString(),
  };
  participants.push(p);
  return p;
}

export function updateParticipant(
  id: string,
  data: Partial<Omit<Participant, "id" | "createdAt">>
): Participant | null {
  const idx = participants.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  participants[idx] = { ...participants[idx], ...data };
  return clone(participants[idx]);
}

export function deleteParticipant(id: string): boolean {
  const idx = participants.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  participants.splice(idx, 1);
  return true;
}

export function bulkCreateParticipants(
  dataList: Omit<Participant, "id" | "createdAt">[]
): Participant[] {
  const created: Participant[] = [];
  for (const data of dataList) {
    created.push(createParticipant(data));
  }
  return created;
}

// ==================== CLASS PACKAGES ====================
export function getClassPackages(): ClassPackage[] {
  return clone(classPackages);
}

export function getClassPackageById(id: string): ClassPackage | undefined {
  return classPackages.find((c) => c.id === id);
}

export function createClassPackage(
  data: Omit<ClassPackage, "id" | "createdAt">
): ClassPackage {
  const c: ClassPackage = {
    ...data,
    id: generateId("cls"),
    createdAt: new Date().toISOString(),
  };
  classPackages.push(c);
  return c;
}

export function updateClassPackage(
  id: string,
  data: Partial<Omit<ClassPackage, "id" | "createdAt">>
): ClassPackage | null {
  const idx = classPackages.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  classPackages[idx] = { ...classPackages[idx], ...data };
  return clone(classPackages[idx]);
}

export function deleteClassPackage(id: string): boolean {
  const idx = classPackages.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  classPackages.splice(idx, 1);
  return true;
}

// ==================== PARTICIPANT CLASSES ====================
export function getParticipantClasses(): ParticipantClass[] {
  return clone(participantClasses);
}

export function assignParticipantToClass(
  participantId: string,
  classPackageId: string
): ParticipantClass {
  const pc: ParticipantClass = {
    id: generateId("pc"),
    participantId,
    classPackageId,
    enrolledAt: new Date().toISOString(),
  };
  participantClasses.push(pc);
  return pc;
}

export function removeParticipantFromClass(id: string): boolean {
  const idx = participantClasses.findIndex((pc) => pc.id === id);
  if (idx === -1) return false;
  participantClasses.splice(idx, 1);
  return true;
}

export function getClassesByParticipant(participantId: string): ParticipantClass[] {
  return participantClasses.filter((pc) => pc.participantId === participantId);
}

export function getParticipantsByClass(classPackageId: string): ParticipantClass[] {
  return participantClasses.filter((pc) => pc.classPackageId === classPackageId);
}

// ==================== PAYMENTS ====================
export function getPayments(): Payment[] {
  return clone(payments);
}

export function getPaymentById(id: string): Payment | undefined {
  return payments.find((p) => p.id === id);
}

export function createPayment(
  data: Omit<Payment, "id" | "createdAt">
): Payment {
  const p: Payment = {
    ...data,
    id: generateId("pay"),
    createdAt: new Date().toISOString(),
  };
  payments.push(p);
  return p;
}

export function updatePayment(
  id: string,
  data: Partial<Omit<Payment, "id" | "createdAt">>
): Payment | null {
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  payments[idx] = { ...payments[idx], ...data };
  return clone(payments[idx]);
}

export function deletePayment(id: string): boolean {
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  payments.splice(idx, 1);
  return true;
}

export function getPaymentsByParticipant(participantId: string): Payment[] {
  return payments.filter((p) => p.participantId === participantId);
}
