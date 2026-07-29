export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="py-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-foreground/60">
        This tab is part of the seller dashboard shell built in Phase 3 — its content ships in {phase}.
      </p>
    </div>
  );
}
