"use client";

import { useState } from "react";
import { StarIcon } from "@/components/icons";

interface StarRatingPickerProps {
  value: number;
  onChange: (value: number) => void;
}

// Replaces the "5 stars / 4 stars..." <select> in the order-item review
// form (Overhaul Phase 8) — click-to-select stars using the Rating Gold
// token, matching how ratings are displayed everywhere else on the site.
export function StarRatingPicker({ value, onChange }: StarRatingPickerProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="text-rating-gold"
        >
          <StarIcon className="h-5 w-5" filled={n <= active} />
        </button>
      ))}
    </div>
  );
}
