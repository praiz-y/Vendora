"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/ui/Dropzone";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminHeroSlides, useUpdateHeroSlide } from "@/features/admin/heroSlides/hooks";
import type { AdminHeroSlide, UpdateHeroSlideInput } from "@/features/admin/heroSlides/api";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

function HeroSlideCard({ slide }: { slide: AdminHeroSlide }) {
  const updateSlide = useUpdateHeroSlide();
  const [input, setInput] = useState<UpdateHeroSlideInput>(() => ({
    imageUrl: slide.imageUrl,
    headline: slide.headline,
    text: slide.text,
    ctaLabel: slide.ctaLabel,
    ctaUrl: slide.ctaUrl,
    enabled: slide.enabled,
  }));
  const [saved, setSaved] = useState(false);

  function set<K extends keyof UpdateHeroSlideInput>(key: K, value: UpdateHeroSlideInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateSlide.mutate({ position: slide.position, input }, { onSuccess: () => setSaved(true) });
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border-admin p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-heading">Slide {slide.position}</h3>
        <Badge variant={slide.enabled ? "success" : "neutral"}>{slide.enabled ? "Enabled" : "Disabled"}</Badge>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Dropzone
          label="Image"
          folder="hero-slides"
          imageUrl={input.imageUrl}
          onUrlChange={(url) => set("imageUrl", url)}
        />
        <TextField
          label="Headline"
          name={`headline-${slide.position}`}
          required
          maxLength={120}
          value={input.headline}
          onChange={(e) => set("headline", e.target.value)}
        />
        <Textarea
          label="Text"
          name={`text-${slide.position}`}
          required
          rows={2}
          maxLength={300}
          value={input.text}
          onChange={(e) => set("text", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="CTA label"
            name={`ctaLabel-${slide.position}`}
            required
            maxLength={40}
            value={input.ctaLabel}
            onChange={(e) => set("ctaLabel", e.target.value)}
          />
          <TextField
            label="CTA URL"
            name={`ctaUrl-${slide.position}`}
            required
            value={input.ctaUrl}
            onChange={(e) => set("ctaUrl", e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" checked={input.enabled} onChange={(e) => set("enabled", e.target.checked)} />
          Enabled
        </label>

        {updateSlide.isError && <FormMessage type="error">{getErrorMessage(updateSlide.error)}</FormMessage>}
        {saved && !updateSlide.isPending && <FormMessage type="success">Slide updated.</FormMessage>}

        <Button type="submit" variant="brand" loading={updateSlide.isPending} className="self-start">
          Save
        </Button>
      </form>
    </div>
  );
}

export default function AdminHeroSlidesPage() {
  const { data: slides, isLoading, isError, error } = useAdminHeroSlides();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Hero Slides</h2>
        <p className="mt-1 text-sm text-muted">The 4 fixed slides shown in the homepage hero carousel.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="grid gap-4 md:grid-cols-2">
        {(slides ?? []).map((slide) => (
          <HeroSlideCard key={slide.id} slide={slide} />
        ))}
      </div>
    </div>
  );
}
