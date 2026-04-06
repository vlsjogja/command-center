import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  numeric,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ════════════════ ENUMS ════════════════

export const roleEnum = pgEnum("role", [
  "super_admin",
  "staff_pembayaran",
  "teacher",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "active",
  "inactive",
  "graduated",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "overdue",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "manual_transfer",
]);

export const packageStatusEnum = pgEnum("package_status", [
  "active",
  "inactive",
]);

export const packageTypeEnum = pgEnum("package_type", [
  "one_time",
  "subscription",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
]);

// ════════════════ TABLES ════════════════

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  teacherId: uuid("teacher_id").references((): AnyPgColumn => teachers.id, { onDelete: "set null" }),
  avatar: text("avatar"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address").notNull(),
  status: participantStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const statusHistory = pgTable("status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  status: participantStatusEnum("status").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  changedBy: text("changed_by").notNull(),
  reason: text("reason"),
});

export const classPackages = pgTable("class_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  learningDuration: text("learning_duration").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const participantClasses = pgTable("participant_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  classPackageId: uuid("class_package_id")
    .notNull()
    .references(() => classPackages.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
});

export const packages = pgTable("packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  nominal: integer("nominal").notNull(),
  kelas: uuid("kelas")
    .notNull()
    .references(() => classPackages.id, { onDelete: "cascade" }),
  durasi: integer("durasi").notNull(), // 1, 2, or 3 months
  deskripsi: text("deskripsi"),
  status: packageStatusEnum("status").default("active").notNull(),
  type: packageTypeEnum("type").default("subscription").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  classPackageId: uuid("class_package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("manual_transfer").notNull(),
  paymentTime: timestamp("payment_time", { withTimezone: true }),
  billingTime: timestamp("billing_time", { withTimezone: true }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  participantStatus: participantStatusEnum("participant_status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }).unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  assignedClasses: text("assigned_classes").notNull(),
  schedule: text("schedule").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  className: text("class_name").notNull(),
  teacherName: text("teacher_name").notNull(),
  totalParticipants: integer("total_participants").notNull(),
  presentCount: integer("present_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studentAttendance = pgTable("student_attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  attendanceRecordId: uuid("attendance_record_id")
    .notNull()
    .references(() => attendanceRecords.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  status: attendanceStatusEnum("status").notNull(),
});

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(), // e.g., 'payment_success', 'class_assign'
  targetType: text("target_type").notNull(), // e.g., 'participant', 'payment', 'package'
  targetId: uuid("target_id").notNull(),
  targetName: text("target_name").notNull(),
  performedBy: text("performed_by").notNull(), // User Name
  details: text("details").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// ════════════════ RELATIONS ════════════════

export const usersRelations = relations(users, ({ one }) => ({
  teacher: one(teachers, {
    fields: [users.teacherId],
    references: [teachers.id],
  }),
}));

export const participantsRelations = relations(participants, ({ many }) => ({
  statusHistory: many(statusHistory),
  classes: many(participantClasses),
  payments: many(payments),
  attendance: many(studentAttendance),
  activityLogs: many(activityLogs),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  participant: one(participants, {
    fields: [activityLogs.targetId],
    references: [participants.id],
  }),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  participant: one(participants, {
    fields: [statusHistory.participantId],
    references: [participants.id],
  }),
}));

export const classPackagesRelations = relations(classPackages, ({ many }) => ({
  enrollments: many(participantClasses),
  packages: many(packages),
}));

export const participantClassesRelations = relations(participantClasses, ({ one }) => ({
  participant: one(participants, {
    fields: [participantClasses.participantId],
    references: [participants.id],
  }),
  classPackage: one(classPackages, {
    fields: [participantClasses.classPackageId],
    references: [classPackages.id],
  }),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  classPackage: one(classPackages, {
    fields: [packages.kelas],
    references: [classPackages.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  participant: one(participants, {
    fields: [payments.participantId],
    references: [participants.id],
  }),
  package: one(packages, {
    fields: [payments.classPackageId],
    references: [packages.id],
  }),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
  userAccounts: many(users), // existing
}));


export const attendanceRecordsRelations = relations(attendanceRecords, ({ many }) => ({
  studentAttendance: many(studentAttendance),
}));

export const studentAttendanceRelations = relations(studentAttendance, ({ one }) => ({
  attendanceRecord: one(attendanceRecords, {
    fields: [studentAttendance.attendanceRecordId],
    references: [attendanceRecords.id],
  }),
  student: one(participants, {
    fields: [studentAttendance.studentId],
    references: [participants.id],
  }),
}));
