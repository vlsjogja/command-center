export type Role = "super_admin" | "staff_pembayaran" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teacherId?: string;
  avatar?: string;
}

export interface StatusLog {
  status: "active" | "inactive" | "graduated";
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive" | "graduated";
  createdAt: string;
  createdBy?: string;
  statusHistory?: StatusLog[];
  activityLogs?: ActivityLog[];
  payments?: Payment[];
}

export interface ClassPackage {
  id: string;
  name: string;
  description: string | null;
  learningDuration: string;
  createdAt: string;
}

export interface ParticipantClass {
  id: string;
  participantId: string;
  classPackageId: string;
  enrolledAt: string;
}

export type PaymentStatus = "pending" | "success" | "failed" | "overdue";
export type PaymentMethod = "manual_transfer";

export interface Payment {
  id: string;
  participantId: string;
  classPackageId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentTime: string | null;
  billingTime: string;
  paymentStatus: PaymentStatus;
  participantStatus: "active" | "inactive" | "graduated";
  notes?: string;
  reason?: string;
  createdAt: string;
}

export type PackageStatus = "active" | "inactive";

export interface Package {
  id: string;
  nama: string;
  nominal: number;
  kelas: string;
  durasi: 1 | 2 | 3;
  type: "one_time" | "subscription";
  deskripsi?: string;
  status: PackageStatus;
  createdAt: string;
}

export interface Teacher {
  id: string;
  userId?: string | null;
  user?: User;
  name: string;
  phone: string;
  assignedClasses: string; // "Nama kelas yang diampu"
  schedule: string;        // "Jadwal kelas"
  createdAt: string;
}


export interface AttendanceRecord {
  id: string;
  date: string; // ISO string
  className: string;
  teacherName: string;
  totalParticipants: number;
  presentCount: number;
  studentAttendance: {
    studentId: string;
    studentName: string;
    status: 'present' | 'absent';
  }[];
}

export type ActivityAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "enroll" 
  | "status_change" 
  | "payment_success"
  | "class_assign"
  | "class_move"
  | "class_unenroll";

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  targetType: "participant" | "package" | "payment" | "class" | "user";
  targetId: string;
  targetName: string;
  performedBy: string; // User ID
  details: string;
  timestamp: string;
}
