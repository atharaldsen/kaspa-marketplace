"use client";

import { useRef, useState } from "react";

interface ImageUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (5MB max)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragOver
          ? "border-kaspa-500 bg-kaspa-50 dark:bg-kaspa-900/20"
          : "border-gray-300 hover:border-gray-400 dark:border-gray-700"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Preview"
            className="mx-auto max-h-48 rounded-md object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-0 top-0 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          <p className="font-medium">Click or drag to upload an image</p>
          <p className="mt-1 text-xs">PNG, JPG up to 5MB</p>
        </div>
      )}
    </div>
  );
}
