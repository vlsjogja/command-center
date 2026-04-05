"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, Eye, EyeOff, GraduationCap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Email atau password salah.");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-shape login-bg-shape--1" />
        <div className="login-bg-shape login-bg-shape--2" />
        <div className="login-bg-shape login-bg-shape--3" />
        <div className="login-bg-grid" />
      </div>

      {/* Login card */}
      <div className="login-card">
        {/* Header / Branding */}
        <div className="login-header">
          <div className="login-logo">
            <GraduationCap className="login-logo-icon" />
          </div>
          <h1 className="login-title">Command Center</h1>
          <p className="login-subtitle">Masuk ke panel administrasi</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <Alert variant="destructive" className="login-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <div className="login-field">
            <Label htmlFor="email" className="login-label">Email</Label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" />
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <Label htmlFor="password" className="login-label">Password</Label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="login-input login-input--password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="login-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner-wrap">
                <span className="login-spinner" />
                Memproses...
              </span>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} VLS Jogja</p>
        </div>
      </div>
    </div>
  );
}
