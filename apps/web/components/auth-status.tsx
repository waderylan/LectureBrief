import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="order-2 ml-auto flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] sm:order-3 sm:gap-3 sm:text-[11px] sm:tracking-[0.1em]">
        <Link href="/signin" className="hover:underline">
          Sign in
        </Link>
        <Link href="/signup" className="border border-black bg-black px-2 py-1.5 text-white transition-colors hover:border-[#d9362b] hover:bg-[#d9362b] sm:px-3">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="order-2 ml-auto flex items-center gap-3 text-[11px] sm:order-3">
      <span className="hidden text-[#6f6a61] lg:inline">{session.user.email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="cursor-pointer font-semibold uppercase tracking-[0.1em] hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
