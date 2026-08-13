import { UploadIcon } from "@/components/icons";

interface DropzoneProps {
  label: string;
  imageUrl: string;
  onUrlChange: (url: string) => void;
  inputName?: string;
}

// Visual-only upload-style treatment (Overhaul Phase 9) — real drag-and-drop
// upload wiring (e.g. Cloudinary) is Phase 12. The only actual mechanism to
// set an image today is still the URL field beneath the dropzone card; this
// just reframes that field behind an upload-style preview instead of a bare
// <input>, and says plainly that upload isn't wired up yet rather than
// implying the dashed border itself accepts a drop.
export function Dropzone({ label, imageUrl, onUrlChange, inputName }: DropzoneProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-heading">{label}</span>
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-20 w-20 rounded object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-light">
            <UploadIcon className="h-5 w-5" />
          </span>
        )}
        <p className="text-xs text-muted">Drag and drop an image, or paste a URL below</p>
        <p className="text-[11px] text-light">Upload isn&apos;t wired up yet — paste a direct image URL for now.</p>
      </div>
      <input
        aria-label={`${label} URL`}
        name={inputName}
        className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-body outline-none focus:ring-2 focus:ring-primary/30"
        placeholder="https://…"
        value={imageUrl}
        onChange={(e) => onUrlChange(e.target.value)}
      />
    </div>
  );
}
