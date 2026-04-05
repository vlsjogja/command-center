"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTemplates, updateTemplate } from "./actions";

export default function MessageTemplatesPage() {
  const { user, hasAccess } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<Record<string, { id: string; content: string }>>({
    payment_reminder: { id: "", content: "" },
    overdue_reminder: { id: "", content: "" },
    teaching_reminder: { id: "", content: "" }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasAccess(["super_admin"])) {
      router.replace("/dashboard");
    }
  }, [hasAccess, router]);

  useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true);
      const { data } = await getTemplates();
      if (data) {
        setTemplates(prev => {
          const next = { ...prev };
          data.forEach(t => {
            if (next[t.key] !== undefined) {
              next[t.key] = { id: t.id, content: t.content };
            }
          });
          return next;
        });
      }
      setIsLoading(false);
    }
    loadTemplates();
  }, []);

  if (!user || user.role !== "super_admin") {
    return null; 
  }

  const handleSave = async () => {
    const toUpdate = Object.entries(templates).filter(([_, val]) => val.id);
    if (toUpdate.length === 0) {
      toast.error("Tidak ada template yang terhubung ke database untuk disimpan.");
      return;
    }

    setIsSaving(true);
    try {
      const promises = toUpdate.map(([_, val]) => updateTemplate(val.id, val.content));
      await Promise.all(promises);
      toast.success("Template pesan berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan template");
    } finally {
      setIsSaving(false);
    }
  };

  const variables = [
    "{{nama_pengajar}}",
    "{{nama_siswa}}",
    "{{tanggal_jatuh_tempo}}",
    "{{nominal_pembayaran}}",
    "{{nama_kelas}}",
    "{{nama_paket_pembayaran}}",
    "{{waktu_mengajar}}",
    "{{bold_start}}",
    "{{bold_end}}",
    "{{break_space}}"
  ];

  const handleVariableClick = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`${variable} disalin ke clipboard`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Pesan</h1>
        <p className="text-muted-foreground mt-1">
          Atur format pesan otomatis untuk berbagai pengingat.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Reminder Pembayaran</CardTitle>
              <CardDescription>Pesan pengingat sebelum jatuh tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[150px] flex items-center justify-center bg-muted/10 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                </div>
              ) : (
                <Textarea 
                  placeholder="Format pesan pengingat..." 
                  className="min-h-[150px]"
                  value={templates.payment_reminder.content}
                  onChange={(e) => setTemplates(prev => ({ 
                    ...prev, 
                    payment_reminder: { ...prev.payment_reminder, content: e.target.value } 
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Reminder Pembayaran Jatuh Tempo</CardTitle>
              <CardDescription>Pesan pengingat setelah lewat jatuh tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[150px] flex items-center justify-center bg-muted/10 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                </div>
              ) : (
                <Textarea 
                  placeholder="Format pesan jatuh tempo..." 
                  className="min-h-[150px]"
                  value={templates.overdue_reminder.content}
                  onChange={(e) => setTemplates(prev => ({ 
                    ...prev, 
                    overdue_reminder: { ...prev.overdue_reminder, content: e.target.value } 
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Reminder Mengajar untuk Teacher</CardTitle>
              <CardDescription>Pesan pengingat jadwal mengajar untuk pengajar.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[150px] flex items-center justify-center bg-muted/10 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                </div>
              ) : (
                <Textarea 
                  placeholder="Format pesan pengajar..." 
                  className="min-h-[150px]"
                  value={templates.teaching_reminder.content}
                  onChange={(e) => setTemplates(prev => ({ 
                    ...prev, 
                    teaching_reminder: { ...prev.teaching_reminder, content: e.target.value } 
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? "Menyimpan..." : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Semua Template
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="bg-muted/40 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Variabel Pendukung
              </CardTitle>
              <CardDescription>
                Klik pada variabel di bawah ini untuk menyalin, lalu tempel (paste) di kolom teks.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <Badge 
                    key={variable} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 font-mono"
                    onClick={() => handleVariableClick(variable)}
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
