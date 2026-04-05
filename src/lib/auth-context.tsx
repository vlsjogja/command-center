"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { User, Role } from "@/types";
import { useSession, signIn, signOut } from "next-auth/react";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasAccess: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const user = session?.user as User | null;

  const login = async (email: string, password: string): Promise<boolean> => {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    
    return !!res?.ok;
  };

  const logout = () => {
    signOut({ callbackUrl: "/" });
  };

  const hasAccess = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
