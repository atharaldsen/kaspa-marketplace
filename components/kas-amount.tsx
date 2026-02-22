/** Format sompi string as KAS display. 1 KAS = 100_000_000 sompi. */
export function KasAmount({ sompi, className }: { sompi: string; className?: string }) {
  let formatted: string;
  try {
    const kas = Number(BigInt(sompi)) / 100_000_000;
    formatted = kas % 1 === 0 ? kas.toFixed(0) : kas.toFixed(2);
  } catch {
    formatted = "?";
  }
  return (
    <span className={className}>
      {formatted} <span className="text-kaspa-500 text-xs font-medium">KAS</span>
    </span>
  );
}
