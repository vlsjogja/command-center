import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);

          if (passwordMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              avatar: user.avatar,
              teacherId: user.teacherId,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.teacherId = (user as any).teacherId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role as string;
        (session.user as any).id = token.id as string;
        (session.user as any).teacherId = token.teacherId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
});
