import Link from "next/link";
import { formatNaira } from "@/lib/currency";
import type { PublicProduct } from "@/types/product";

export function ProductCard({ product }: { product: PublicProduct }) {
  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const outOfStock = product.type === "PHYSICAL" && product.stockQuantity === 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex flex-col overflow-hidden rounded-md border border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
    >
      <div className="relative flex aspect-square items-center justify-center bg-black/5 dark:bg-white/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-foreground/40">No image</span>
        )}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
            Out of Stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs text-foreground/50">{product.store.name}</p>
        <p className="text-sm font-medium leading-snug">{product.name}</p>
        <p className="mt-auto text-sm font-semibold">{formatNaira(product.price)}</p>
      </div>
    </Link>
  );
}
