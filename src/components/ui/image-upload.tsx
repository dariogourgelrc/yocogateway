"use client";

import { useCallback, useRef, useState } from "react";
import { Label } from "./label";

interface ImageUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

export function ImageUpload({ label, value, onChange, error }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Max 5MB.");
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Invalid file type. Use JPEG, PNG, or WebP.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const { url } = await res.json();
        onChange(url);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-black bg-gray-50"
            : "border-gray-300 hover:border-gray-400"
        } ${error ? "border-red-500" : ""}`}
      >
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading...</p>
        ) : value ? (
          <img
            src={value}
            alt="Preview"
            className="max-h-40 rounded object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Drop an image here or click to upload
            </p>
            <p className="mt-1 text-xs text-gray-400">
              JPEG, PNG, WebP. Max 5MB.
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
