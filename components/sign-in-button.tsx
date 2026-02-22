"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-gray-200" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {session.user.name}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-md bg-kaspa-500 px-4 py-2 text-sm font-medium text-white hover:bg-kaspa-600"
    >
      Sign in with Google
    </button>
  );
}
