"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/icons";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    onClose();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-heading/40 px-4 pt-20 sm:pt-28">
      <button aria-label="Close search" onClick={onClose} className="absolute inset-0" />
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full max-w-lg items-center gap-2 rounded-lg border border-border bg-surface p-3 shadow-xl"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent px-1 py-1.5 text-sm text-body outline-none"
        />
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}
