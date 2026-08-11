"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMyEntitlements, useRequestDownload } from "@/features/entitlements/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { DigitalEntitlement } from "@/types/entitlement";

function LibraryItem({ entitlement }: { entitlement: DigitalEntitlement }) {
  const requestDownload = useRequestDownload();
  const image = entitlement.product.images[0];

  function handleDownload() {
    requestDownload.mutate(entitlement.productId);
  }

  return (
    <div className="flex items-center gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={entitlement.product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-foreground/40">No image</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/products/${entitlement.product.slug}`} className="text-sm font-medium hover:underline">
          {entitlement.product.name}
        </Link>
        <p className="text-xs text-foreground/50">{entitlement.product.store.name}</p>
        {entitlement.latestVersion && (
          <p className="text-xs text-foreground/50">Version {entitlement.latestVersion.version}</p>
        )}
        {requestDownload.isError && (
          <p className="text-xs text-red-500">{getErrorMessage(requestDownload.error)}</p>
        )}
        {requestDownload.isSuccess && (
          <p className="break-all text-xs text-foreground/70">File reference: {requestDownload.data.download.fileKey}</p>
        )}
      </div>

      <Button onClick={handleDownload} loading={requestDownload.isPending}>
        Download
      </Button>
    </div>
  );
}

export default function LibraryPage() {
  const { data: entitlements, isLoading, isError, error } = useMyEntitlements();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Your Digital Library</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Digital products you&apos;ve purchased. Access always resolves to the latest version a seller has uploaded.
        </p>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {entitlements?.length === 0 && <p className="text-sm text-foreground/60">You haven&apos;t purchased any digital products yet.</p>}

      <div className="flex flex-col gap-3">
        {entitlements?.map((entitlement) => (
          <LibraryItem key={entitlement.id} entitlement={entitlement} />
        ))}
      </div>
    </div>
  );
}
