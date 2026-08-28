"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface SignInState {
  error: string | null;
}

export async function signInWithCredentials(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return { error: null };
  } catch (err) {
    // Auth.js throws a redirect internally on success (a Next.js control-flow
    // signal, not a real error) — only report something to the user if this
    // is an actual auth failure.
    if (err instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw err;
  }
}
