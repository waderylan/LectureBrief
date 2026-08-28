"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@lecturebrief/db";
import { signIn } from "@/auth";

export interface SignUpState {
  error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hash(password, 12);
  await db.insert(schema.users).values({ email, passwordHash });

  // Throws a redirect on success — this is Auth.js's normal signIn behavior,
  // not an error path.
  await signIn("credentials", { email, password, redirectTo: "/" });
  return { error: null };
}
