/**
 * Auth.js v5, Credentials provider only (BUILD_PLAN.md Day 5) — email +
 * password, bcrypt, JWT session cookie. No OAuth app registration, no
 * password reset, no email verification, no roles beyond `user` and
 * `admin` (see `schema.ts`'s `userRole` enum).
 *
 * `bcryptjs` rather than the native `bcrypt` package: this machine has no
 * MSVC toolchain to build `bcrypt`'s native binding against, and `bcryptjs`
 * is a pure-JS implementation of the same algorithm — same guarantees for
 * this project's purposes, no native build step.
 *
 * `trustHost: true` because no production domain is chosen yet (BUILD_PLAN.md
 * Day 0's naming decision is still deferred) — safe for local dev and for a
 * first Vercel deploy, which auto-detects its own host anyway.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@lecturebrief/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: "user" | "admin" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "user" | "admin";
      }
      return session;
    },
  },
});
