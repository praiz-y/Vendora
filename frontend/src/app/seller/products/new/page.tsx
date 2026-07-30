"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { ProductFieldset, type ProductFieldsetValues } from "../_components/ProductFieldset";
import type { ProductImageInput } from "@/features/products/api";
import { useCreateProduct } from "@/features/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { ProductType } from "@/types/product";

const emptyValues: ProductFieldsetValues = {
  name: "",
  description: "",
  categoryId: "",
  price: "",
  stockQuantity: "",
  shippingType: "FREE",
  shippingFee: "",
};

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const [type, setType] = useState<ProductType>("PHYSICAL");
  const [values, setValues] = useState(emptyValues);
  const [images, setImages] = useState<ProductImageInput[]>([]);
  const [fileKey, setFileKey] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState("");

  function handleChange(field: keyof ProductFieldsetValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cleanedImages = images.filter((image) => image.url.trim().length > 0);
    const base = {
      name: values.name,
      description: values.description,
      categoryId: values.categoryId,
      price: Number(values.price),
      images: cleanedImages.length ? cleanedImages : undefined,
    };

    if (type === "PHYSICAL") {
      createProduct.mutate(
        {
          ...base,
          type: "PHYSICAL",
          stockQuantity: Number(values.stockQuantity),
          shippingType: values.shippingType,
          shippingFee: values.shippingType === "FIXED" ? Number(values.shippingFee) : undefined,
        },
        { onSuccess: (data) => router.push(`/seller/products/${data.product.id}`) }
      );
    } else {
      createProduct.mutate(
        {
          ...base,
          type: "DIGITAL",
          file: { fileKey, fileType, fileSize: Number(fileSize) },
        },
        { onSuccess: (data) => router.push(`/seller/products/${data.product.id}`) }
      );
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <h2 className="text-lg font-semibold">New Product</h2>

      <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit}>
        <Select
          label="Product type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ProductType)}
        >
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
        </Select>

        <ProductFieldset type={type} values={values} onChange={handleChange} images={images} onImagesChange={setImages} />

        {type === "DIGITAL" && (
          <div className="flex flex-col gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs text-foreground/50">
              No file storage integration yet — provide a reference for the first version of this file.
            </p>
            <TextField label="File key / URL" name="fileKey" required value={fileKey} onChange={(e) => setFileKey(e.target.value)} />
            <TextField
              label="File type (e.g. application/pdf)"
              name="fileType"
              required
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
            />
            <TextField
              label="File size (bytes)"
              name="fileSize"
              type="number"
              min="1"
              required
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
            />
          </div>
        )}

        {createProduct.isError && <FormMessage type="error">{getErrorMessage(createProduct.error)}</FormMessage>}

        <Button type="submit" loading={createProduct.isPending} className="self-start">
          Create product
        </Button>
      </form>
    </div>
  );
}
