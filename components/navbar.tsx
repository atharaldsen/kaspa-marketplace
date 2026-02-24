"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignInButton } from "./sign-in-button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-kaspa-500">KaspaMarket</span>
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/browse"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Browse
            </Link>
            {session?.user && (
              <>
                <Link
                  href="/listings/create"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Sell
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
        <SignInButton />
      </div>
    </nav>
  );
}
