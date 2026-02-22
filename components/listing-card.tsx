import Link from "next/link";
import { KasAmount } from "./kas-amount";

interface ListingCardProps {
  id: string;
  title: string;
  description: string;
  price: string; // sompi as string
  category: string;
  imageData: string | null;
  escrowPattern: string;
  seller: { name: string | null; image: string | null };
}

const patternLabels: Record<string, string> = {
  basic: "Basic Escrow",
  timelocked: "Time-Locked",
  covenant_multi_path: "Multi-Path",
  payment_split: "Payment Split",
};

export function ListingCard({
  id,
  title,
  description,
  price,
  category,
  imageData,
  escrowPattern,
  seller,
}: ListingCardProps) {
  return (
    <Link
      href={`/listings/${id}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {imageData ? (
          <img
            src={imageData}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-gray-300">
            {category === "digital-goods" ? "💾" : category === "services" ? "🔧" : "📦"}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight group-hover:text-kaspa-500">
            {title}
          </h3>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {patternLabels[escrowPattern] || escrowPattern}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <KasAmount sompi={price} className="text-lg font-bold" />
          <div className="flex items-center gap-1.5">
            {seller.image && (
              <img src={seller.image} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span className="text-xs text-gray-500">{seller.name || "Anonymous"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
