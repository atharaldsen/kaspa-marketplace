/** Format sompi string as KAS display. 1 KAS = 100_000_000 sompi. */
export function KasAmount({ sompi, className }: { sompi: string; className?: string }) {
  let formatted: string;
  try {
    const kas = Number(BigInt(sompi)) / 100_000_000;
    if (kas % 1 === 0) {
      formatted = kas.toFixed(0);
    } else {
      // Show enough decimals to avoid hiding small amounts (e.g. fees)
      const s = kas.toString();
      const decimals = s.includes(".") ? s.split(".")[1].replace(/0+$/, "").length : 0;
      formatted = kas.toFixed(Math.max(2, Math.min(decimals, 5)));
    }
  } catch {
    formatted = "—";
  }
  return (
    <span className={className}>
      {formatted} <span className="text-kaspa-500 text-xs font-medium">KAS</span>
    </span>
  );
}
