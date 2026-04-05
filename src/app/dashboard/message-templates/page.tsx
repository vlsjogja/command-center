"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Info } from "lucide-react";
import { toast } from "sonner";

export default function MessageTemplatesPage() {
  const { user, hasAccess } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState({
    paymentReminder: "Halo {{bold_start}}{{nama_siswa}}{{bold_end}},{{break_space}}{{break_space}}Jangan lupa pembayaran untuk {{nama_paket_pembayaran}} sebesar {{bold_start}}{{nominal_pembayaran}}{{bold_end}} sebelum tanggal {{bold_start}}{{tanggal_jatuh_tempo}}{{bold_end}}.",
    overdueReminder: "Peringatan:{{break_space}}{{break_space}}Pembayaran Anda sebesar {{bold_start}}{{nominal_pembayaran}}{{bold_end}} untuk paket {{nama_paket_pembayaran}} telah jatuh tempo sejak {{bold_start}}{{tanggal_jatuh_tempo}}{{bold_end}}.",
    teachingReminder: "Halo {{bold_start}}{{nama_pengajar}}{{bold_end}},{{break_space}}{{break_space}}Anda memiliki jadwal mengajar hari ini pukul {{bold_start}}{{waktu_mengajar}}{{bold_end}} untuk kelas {{nama_kelas}}."
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasAccess(["super_admin"])) {
      router.replace("/dashboard");
    }
  }, [hasAccess, router]);

  if (!user || user.role !== "super_admin") {
    return null; // Will redirect in useEffect
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Template pesan berhasil disimpan");
    }, 1000);
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
              <Textarea 
                placeholder="Halo {{bold_start}}{{nama_siswa}}{{bold_end}},{{break_space}}{{break_space}}Jangan lupa pembayaran untuk {{nama_paket_pembayaran}} sebesar {{bold_start}}{{nominal_pembayaran}}{{bold_end}} sebelum tanggal {{bold_start}}{{tanggal_jatuh_tempo}}{{bold_end}}." 
                className="min-h-[150px]"
                value={templates.paymentReminder}
                onChange={(e) => setTemplates(prev => ({ ...prev, paymentReminder: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Reminder Pembayaran Jatuh Tempo</CardTitle>
              <CardDescription>Pesan pengingat setelah lewat jatuh tempo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Peringatan:{{break_space}}{{break_space}}Pembayaran Anda sebesar {{bold_start}}{{nominal_pembayaran}}{{bold_end}} untuk paket {{nama_paket_pembayaran}} telah jatuh tempo sejak {{bold_start}}{{tanggal_jatuh_tempo}}{{bold_end}}." 
                className="min-h-[150px]"
                value={templates.overdueReminder}
                onChange={(e) => setTemplates(prev => ({ ...prev, overdueReminder: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Reminder Mengajar untuk Teacher</CardTitle>
              <CardDescription>Pesan pengingat jadwal mengajar untuk pengajar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Halo {{bold_start}}{{nama_pengajar}}{{bold_end}},{{break_space}}{{break_space}}Anda memiliki jadwal mengajar hari ini pukul {{bold_start}}{{waktu_mengajar}}{{bold_end}} untuk kelas {{nama_kelas}}." 
                className="min-h-[150px]"
                value={templates.teachingReminder}
                onChange={(e) => setTemplates(prev => ({ ...prev, teachingReminder: e.target.value }))}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
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
