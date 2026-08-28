import Link from "next/link";
import { SignUpForm } from "./form";

export const metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <SignUpForm />
      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
