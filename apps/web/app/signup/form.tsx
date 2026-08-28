"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = { error: null };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="editorial-card flex w-full max-w-sm flex-col gap-5 border p-6 sm:p-8">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="border border-[#a9a094] bg-[#fbf8f1] px-3 py-2.5 outline-none focus:border-black"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="border border-[#a9a094] bg-[#fbf8f1] px-3 py-2.5 outline-none focus:border-black"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-black px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#d9362b] disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
