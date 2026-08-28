import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/signin" className="underline">
          Sign in
        </Link>
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-600">{session.user.email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="underline cursor-pointer">
          Sign out
        </button>
      </form>
    </div>
  );
}
