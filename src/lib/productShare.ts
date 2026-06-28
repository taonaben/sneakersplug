interface ProductSharePayload {
  name: string;
  url: string;
  imageUrl?: string | null;
  price?: number | null;
  storeName?: string | null;
}

export type ProductShareResult = "shared-link" | "copied";

function getShareText({ name, price, storeName }: ProductSharePayload) {
  const priceText = typeof price === "number" ? ` - $${price.toFixed(2)}` : "";
  const storeText = storeName ? ` at ${storeName}` : "";
  return `${name}${priceText}${storeText}`;
}

export async function shareProduct(payload: ProductSharePayload): Promise<ProductShareResult> {
  const title = payload.name;
  const text = getShareText(payload);
  const shareData: ShareData = { title, text, url: payload.url };

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(shareData);
    return "shared-link";
  }

  await navigator.clipboard.writeText(payload.url);
  return "copied";
}
