"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useHeroSlides } from "@/features/heroSlides/hooks";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const AUTO_ROTATE_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

export function HeroCarousel() {
  const { data: slides } = useHeroSlides();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const touchStartX = useRef<number | null>(null);

  const count = slides?.length ?? 0;

  // Auto-advance is a real "subscribe to a timer" effect — setState only
  // ever happens inside the interval callback, not synchronously in the
  // effect body, so this doesn't trip react-hooks/set-state-in-effect.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [count, paused, reducedMotion]);

  // 4 fixed rows, but only the enabled ones are ever returned — hides
  // entirely rather than rendering a broken empty carousel.
  if (!slides || slides.length === 0) return null;

  const activeIndex = index % slides.length;
  const slide = slides[activeIndex];

  function goTo(target: number) {
    setIndex(((target % slides!.length) + slides!.length) % slides!.length);
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1);
  }

  return (
    <section
      className="relative h-[420px] w-full overflow-hidden sm:h-[480px] md:h-[560px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={slide.id}
        src={slide.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={reducedMotion ? undefined : { animation: "hero-fade 500ms ease" }}
      />
      {/* Scrim behind the text — needed regardless of slide since the image
          is arbitrary admin-supplied content, not a solid brand color. */}
      <div className="absolute inset-0 bg-gradient-to-t from-heading/85 via-heading/25 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end gap-3 px-6 pb-14 sm:px-8 sm:pb-16">
        <h1 className="max-w-lg text-2xl font-semibold text-white sm:text-4xl">{slide.headline}</h1>
        <p className="max-w-md text-sm text-white/90 sm:text-base">{slide.text}</p>
        <Link
          href={slide.ctaUrl}
          className="mt-2 inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {slide.ctaLabel}
        </Link>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-heading hover:bg-surface"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-heading hover:bg-surface"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === activeIndex}
                className={`h-2 w-2 rounded-full transition-colors ${i === activeIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
