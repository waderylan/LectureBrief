import Link from "next/link";
import { SignUpForm } from "./form";

export const metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <main className="page-shell flex flex-1 flex-col items-center justify-center gap-6 py-16 sm:py-24">
      <div className="text-center">
        <p className="section-kicker mb-3">Join the discussion</p>
        <h1 className="font-editorial text-5xl font-bold">Sign up</h1>
      </div>
      <SignUpForm />
      <p className="text-sm text-[#6f6a61]">
        Already have an account?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
