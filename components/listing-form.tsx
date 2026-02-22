"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "./image-upload";

const categories = [
  { value: "general", label: "General" },
  { value: "digital-goods", label: "Digital Goods" },
  { value: "services", label: "Services" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "collectibles", label: "Collectibles" },
];

const patterns = [
  {
    value: "basic",
    label: "Basic Escrow",
    description: "2-of-2 multisig. Both buyer and seller must agree to release.",
  },
  {
    value: "timelocked",
    label: "Time-Locked",
    description: "Auto-refund after timeout if seller doesn't deliver.",
    hasLockTime: true,
  },
  {
    value: "covenant_multi_path",
    label: "Multi-Path Covenant",
    description: "Release, dispute with arbitrator, or auto-refund on timeout.",
    hasLockTime: true,
  },
  {
    value: "payment_split",
    label: "Payment Split",
    description: "Covenant enforces seller + platform fee split on release.",
    hasFeePercent: true,
  },
];

interface Stage {
  name: string;
  priceKas: string;
}

export function ListingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceKas, setPriceKas] = useState("");
  const [category, setCategory] = useState("general");
  const [imageData, setImageData] = useState<string | null>(null);
  const [escrowPattern, setEscrowPattern] = useState("basic");
  const [lockTimeDaa, setLockTimeDaa] = useState("");
  const [feePercent, setFeePercent] = useState("5");
  const [useStages, setUseStages] = useState(false);
  const [stages, setStages] = useState<Stage[]>([
    { name: "Stage 1", priceKas: "" },
  ]);

  const selectedPattern = patterns.find((p) => p.value === escrowPattern);

  function addStage() {
    if (stages.length >= 4) return;
    setStages([...stages, { name: `Stage ${stages.length + 1}`, priceKas: "" }]);
  }

  function removeStage(index: number) {
    if (stages.length <= 1) return;
    setStages(stages.filter((_, i) => i !== index));
  }

  function updateStage(index: number, field: keyof Stage, value: string) {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title,
        description,
        priceKas,
        category,
        imageData,
        escrowPattern,
      };

      if (selectedPattern?.hasLockTime && lockTimeDaa) {
        body.lockTimeDaa = lockTimeDaa;
      }
      if (selectedPattern?.hasFeePercent && feePercent) {
        body.feePercent = feePercent;
      }
      if (useStages && stages.length > 0) {
        body.stages = stages.map((s) => ({
          name: s.name,
          priceSompi: Math.round(parseFloat(s.priceKas || "0") * 100_000_000).toString(),
        }));
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create listing");
      }

      const listing = await res.json();
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you selling?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your item or service..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {/* Price + Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Price (KAS)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={priceKas}
            onChange={(e) => setPriceKas(e.target.value)}
            placeholder="10.00"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium mb-1">Image</label>
        <ImageUpload value={imageData} onChange={setImageData} />
      </div>

      {/* Escrow Pattern */}
      <div>
        <label className="block text-sm font-medium mb-2">Escrow Pattern</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <label
              key={p.value}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                escrowPattern === p.value
                  ? "border-kaspa-500 bg-kaspa-50 dark:bg-kaspa-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-800"
              }`}
            >
              <input
                type="radio"
                name="pattern"
                value={p.value}
                checked={escrowPattern === p.value}
                onChange={(e) => setEscrowPattern(e.target.value)}
                className="sr-only"
              />
              <div className="text-sm font-medium">{p.label}</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {p.description}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Lock Time (conditional) */}
      {selectedPattern?.hasLockTime && (
        <div>
          <label className="block text-sm font-medium">
            Lock Time (DAA score for timeout refund)
          </label>
          <input
            type="number"
            min="1"
            value={lockTimeDaa}
            onChange={(e) => setLockTimeDaa(e.target.value)}
            placeholder="e.g. 1000 (roughly 1000 seconds)"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      )}

      {/* Fee Percent (conditional) */}
      {selectedPattern?.hasFeePercent && (
        <div>
          <label className="block text-sm font-medium">
            Platform Fee (%)
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      )}

      {/* Milestone Stages */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={useStages}
            onChange={(e) => setUseStages(e.target.checked)}
            className="rounded border-gray-300"
          />
          Use milestone stages
        </label>
        {useStages && (
          <div className="mt-3 space-y-3">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(i, "name", e.target.value)}
                  placeholder="Stage name"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stage.priceKas}
                  onChange={(e) => updateStage(i, "priceKas", e.target.value)}
                  placeholder="KAS"
                  className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {stages.length < 4 && (
              <button
                type="button"
                onClick={addStage}
                className="text-sm text-kaspa-500 hover:text-kaspa-600"
              >
                + Add stage
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-kaspa-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-kaspa-600 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Listing"}
      </button>
    </form>
  );
}
