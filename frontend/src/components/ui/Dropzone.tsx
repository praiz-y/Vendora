"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { UploadIcon } from "@/components/icons";
import type { UploadFolder } from "@/features/uploads/api";
import { useUploadImage } from "@/features/uploads/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface DropzoneProps {
  label: string;
  imageUrl: string;
  onUrlChange: (url: string) => void;
  folder: UploadFolder;
  inputName?: string;
}

export function Dropzone({ label, imageUrl, onUrlChange, folder, inputName }: DropzoneProps) {
  const uploadImage = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFile(file: File) {
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError("Images must be 5MB or smaller.");
      return;
    }
    uploadImage.mutate({ file, folder }, { onSuccess: onUrlChange });
  }

  function openFilePicker() {
    if (!uploadImage.isPending) fileInputRef.current?.click();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const errorMessage = localError ?? (uploadImage.isError ? getErrorMessage(uploadImage.error) : null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-heading">{label}</span>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDraggingOver ? "border-primary bg-primary-light" : "border-border"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-20 w-20 rounded object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-light">
            <UploadIcon className="h-5 w-5" />
          </span>
        )}
        <p className="text-xs text-muted">{uploadImage.isPending ? "Uploading…" : "Click or drag and drop an image to upload"}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}
      <input
        aria-label={`${label} URL`}
        name={inputName}
        className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-body outline-none focus:ring-2 focus:ring-primary/30"
        placeholder="Or paste an image URL directly"
        value={imageUrl}
        onChange={(e) => onUrlChange(e.target.value)}
      />
    </div>
  );
}
