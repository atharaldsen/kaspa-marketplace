import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero */}
      <div className="py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-kaspa-500">Kaspa</span>Market
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
          Buy and sell with trustless escrow powered by Kaspa smart contracts.
          Your funds are locked on-chain until both parties agree.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/browse"
            className="rounded-lg bg-kaspa-500 px-6 py-3 text-sm font-medium text-white hover:bg-kaspa-600 transition-colors"
          >
            Browse Marketplace
          </Link>
          {session?.user ? (
            <Link
              href="/listings/create"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              Create a Listing
            </Link>
          ) : (
            <Link
              href="/api/auth/signin"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              Sign in to Sell
            </Link>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="w-full max-w-5xl px-4 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard
            step="1"
            title="Create a Listing"
            description="Seller lists an item or service with a price in KAS and selects an escrow pattern — basic, time-locked, multi-path, or payment split."
          />
          <StepCard
            step="2"
            title="Fund the Escrow"
            description="Buyer sends KAS to a P2SH address. Funds are locked on-chain in a smart contract. No intermediary holds your money."
          />
          <StepCard
            step="3"
            title="Release or Refund"
            description="Both agree to release funds to seller, or timeout triggers an automatic refund. Disputes can be resolved by an arbitrator."
          />
        </div>
      </div>

      {/* Escrow Patterns */}
      <div className="w-full bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Escrow Patterns
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PatternCard
              title="Basic Escrow"
              tag="2-of-2"
              description="Both buyer and seller must sign to release. Simple and trustless."
            />
            <PatternCard
              title="Time-Locked"
              tag="CLTV"
              description="Auto-refund after a timeout if the seller doesn't deliver. Buyer protection built in."
            />
            <PatternCard
              title="Multi-Path Covenant"
              tag="3 paths"
              description="Release, dispute with arbitrator, or auto-refund on timeout. Full feature set."
            />
            <PatternCard
              title="Payment Split"
              tag="Covenant"
              description="On-chain enforced seller payment + platform fee split. No trust required."
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Key Features</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard title="On-Chain" description="All escrow logic lives in Kaspa scripts. Trustless by design." />
          <FeatureCard title="Staged Payments" description="Split large deals into milestones. Fund and release stage by stage." />
          <FeatureCard title="Auto-Refund" description="Time-locked patterns automatically refund buyers after timeout." />
          <FeatureCard title="Dispute Resolution" description="Multi-path escrows include arbitrator support for conflicts." />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kaspa-500 text-lg font-bold text-white">
        {step}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function PatternCard({
  title,
  tag,
  description,
}: {
  title: string;
  tag: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full bg-kaspa-100 px-2 py-0.5 text-xs font-medium text-kaspa-700 dark:bg-kaspa-900/30 dark:text-kaspa-400">
          {tag}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
