"use client";

import { useAuth } from "@/lib/auth-context";
import { type Role } from "@/types";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { hasAccess, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasAccess(allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 ring-8 ring-destructive/5">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-[500px] leading-relaxed">
          Maaf, peran Anda tidak memiliki izin untuk melihat halaman ini. Silakan hubungi
          administrator jika Anda merasa ini adalah sebuah kesalahan.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
