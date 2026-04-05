# Panduan Deploy ke Vercel dengan Supabase OAuth

## Prerequisites

1. Akun [Vercel](https://vercel.com)
2. Akun [Supabase](https://supabase.com)
3. Akun GitHub (untuk repository)
4. Project sudah di-push ke GitHub

---

## Step 1: Setup Supabase Project

### 1.1 Buat Project Baru di Supabase

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **New Project**
3. Isi:
   - **Name**: `vls-admin-dashboard` (atau nama sesuai keinginan)
   - **Database Password**: Buat password yang kuat
   - **Region**: Pilih yang terdekat (Singapore untuk Indonesia)
4. Klik **Create new project**
5. Tunggu hingga project selesai dibuat (~2 menit)

### 1.2 Dapatkan Kredensial

Setelah project siap, buka **Settings > API**:

```env
# Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Supabase Anon Key (Public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (Private - Jangan expose di client!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 Setup OAuth Provider di Supabase

Untuk Google OAuth:

1. Buka **Authentication > Providers**
2. Aktifkan **Google**
3. Buka [Google Cloud Console](https://console.cloud.google.com)
4. Buat OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-app.vercel.app` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-app.vercel.app/api/auth/callback/google`
5. Copy **Client ID** dan **Client Secret** ke Supabase
6. Klik **Save**

---

## Step 2: Setup Database Schema di Supabase

### 2.1 Buat Tables

Buka **SQL Editor** di Supabase dan jalankan:

```sql
-- Users table (extend dari auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff_pembayaran',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  status_history JSONB DEFAULT '[]'
);

-- Class packages table
CREATE TABLE public.class_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id),
  class_package_id UUID REFERENCES public.class_packages(id),
  amount INTEGER NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_time TIMESTAMP WITH TIME ZONE,
  billing_time TIMESTAMP WITH TIME ZONE NOT NULL,
  participant_status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  assigned_classes TEXT,
  schedule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participant Classes junction table
CREATE TABLE public.participant_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id),
  class_package_id UUID REFERENCES public.class_packages(id),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Presence table
CREATE TABLE public.presensi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'hadir',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'reminder',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Super admin can read all
CREATE POLICY "Super admin can read all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Similar policies untuk table lainnya...
-- (Sesuaikan dengan kebutuhan akses)
```

---

## Step 3: Install Supabase Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Install Supabase Auth Helpers untuk Next.js
npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

---

## Step 4: Setup Environment Variables

### 4.1 Buat file `.env.local` (untuk local development)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.2 Tambahkan ke `.gitignore`

```
.env.local
.env*.local
```

---

## Step 5: Deploy ke Vercel

### 5.1 Install Vercel CLI (optional)

```bash
npm i -g vercel
```

### 5.2 Deploy via Vercel Dashboard (Recommended)

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **Add New > Project**
3. Import repository dari GitHub
4. Konfigurasi project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (atau folder project)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Tambahkan Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL
   ```
6. Klik **Deploy**
7. Tunggu hingga deployment selesai

### 5.3 Deploy via CLI

```bash
# Login ke Vercel
vercel login

# Deploy ke production
vercel --prod
```

---

## Step 6: Setup OAuth Redirect URL di Supabase

Setelah deployment Vercel selesai:

1. Dapatkan URL production (contoh: `https://vls-admin.vercel.app`)
2. Buka Supabase Dashboard > **Authentication > URL Configuration**
3. Tambahkan production URL:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: 
     - `https://your-app.vercel.app/api/auth/callback`
     - `https://your-app.vercel.app/api/auth/callback/google`
4. Update Google OAuth redirect URIs di Google Cloud Console

---

## Step 7: Setup Environment Variables di Vercel

### 7.1 Via Dashboard

1. Buka project di Vercel Dashboard
2. Klik **Settings > Environment Variables**
3. Tambahkan semua environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

### 7.2 Via CLI

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

---

## Step 8: Redeploy Setelah Update Environment Variables

Setelah menambahkan/mengubah environment variables:

1. Buka Vercel Dashboard
2. Klik **Deployments**
3. Klik **...** di deployment terbaru
4. Pilih **Redeploy**

Atau via CLI:
```bash
vercel --prod
```

---

## Checklist Sebelum Deploy

- [ ] Supabase project sudah dibuat
- [ ] Database tables sudah di-create
- [ ] RLS policies sudah di-set
- [ ] OAuth provider sudah dikonfigurasi
- [ ] Environment variables sudah di-set lokal
- [ ] Project sudah di-push ke GitHub
- [ ] Environment variables sudah di-set di Vercel
- [ ] Redirect URLs sudah di-update di Supabase
- [ ] Test login OAuth di production

---

## Troubleshooting

### Error: "Invalid Redirect URL"
- Pastikan redirect URL di Supabase dan OAuth provider sudah sesuai
- Cek `NEXT_PUBLIC_APP_URL` environment variable

### Error: "Failed to fetch"
- Cek CORS settings di Supabase
- Pastikan `NEXT_PUBLIC_SUPABASE_URL` benar

### Error: "JWT expired"
- Session mungkin sudah expired, coba logout dan login ulang

### Database connection error
- Pastikan Supabase project tidak paused
- Cek database password dan connection string

---

## Useful Commands

```bash
# Run development server
npm run dev

# Build untuk production
npm run build

# Start production server
npm start

# Deploy ke Vercel
vercel --prod

# Check deployment logs
vercel logs [deployment-url]

# List environment variables
vercel env ls
```

---

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)