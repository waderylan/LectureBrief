import Link from "next/link";
import { SignInForm } from "./form";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="page-shell flex flex-1 flex-col items-center justify-center gap-6 py-16 sm:py-24">
      <div className="text-center">
        <p className="section-kicker mb-3">Reader account</p>
        <h1 className="font-editorial text-5xl font-bold">Sign in</h1>
      </div>
      <SignInForm />
      <p className="text-sm text-[#6f6a61]">
        Need an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
