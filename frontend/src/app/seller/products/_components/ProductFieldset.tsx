"use client";

import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { useActiveCategories } from "@/features/categories/hooks";
import type { ProductImageInput } from "@/features/products/api";
import type { ProductType, ShippingType } from "@/types/product";

export interface ProductFieldsetValues {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  stockQuantity: string;
  shippingType: ShippingType;
  shippingFee: string;
}

export function ProductFieldset({
  type,
  values,
  onChange,
  images,
  onImagesChange,
}: {
  type: ProductType;
  values: ProductFieldsetValues;
  onChange: (field: keyof ProductFieldsetValues, value: string) => void;
  images: ProductImageInput[];
  onImagesChange: (images: ProductImageInput[]) => void;
}) {
  const { data: categories, isLoading: categoriesLoading } = useActiveCategories();

  function handle(field: keyof ProductFieldsetValues) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(field, e.target.value);
  }

  function updateImageUrl(index: number, url: string) {
    onImagesChange(images.map((image, i) => (i === index ? { ...image, url } : image)));
  }

  function removeImage(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <TextField label="Product name" name="name" required value={values.name} onChange={handle("name")} />
      <Textarea
        label="Description"
        name="description"
        required
        minLength={10}
        value={values.description}
        onChange={handle("description")}
      />
      <Select label="Category" name="categoryId" required value={values.categoryId} onChange={handle("categoryId")}>
        <option value="">{categoriesLoading ? "Loading categories…" : "Select a category"}</option>
        {categories?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <TextField
        label="Price (₦)"
        name="price"
        type="number"
        min="0"
        step="0.01"
        required
        value={values.price}
        onChange={handle("price")}
      />

      {type === "PHYSICAL" && (
        <>
          <TextField
            label="Stock quantity"
            name="stockQuantity"
            type="number"
            min="0"
            required
            value={values.stockQuantity}
            onChange={handle("stockQuantity")}
          />
          <Select label="Shipping" name="shippingType" required value={values.shippingType} onChange={handle("shippingType")}>
            <option value="FREE">Free shipping</option>
            <option value="FIXED">Fixed shipping fee</option>
          </Select>
          {values.shippingType === "FIXED" && (
            <TextField
              label="Shipping fee (₦)"
              name="shippingFee"
              type="number"
              min="0"
              step="0.01"
              required
              value={values.shippingFee}
              onChange={handle("shippingFee")}
            />
          )}
        </>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Images (optional)</span>
        <p className="text-xs text-foreground/50">
          No image upload integration yet — paste a direct image URL for each.
        </p>
        {images.map((image, index) => (
          <div key={index} className="flex gap-2">
            <input
              aria-label={`Image URL ${index + 1}`}
              className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
              placeholder="https://…"
              value={image.url}
              onChange={(e) => updateImageUrl(index, e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={() => removeImage(index)}>
              Remove
            </Button>
          </div>
        ))}
        {images.length < 8 && (
          <Button type="button" variant="secondary" className="self-start" onClick={() => onImagesChange([...images, { url: "" }])}>
            Add image
          </Button>
        )}
      </div>
    </div>
  );
}
