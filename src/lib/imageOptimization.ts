const OPTIMIZED_IMAGE_TYPE = "image/webp";
const OPTIMIZED_IMAGE_EXTENSION = "webp";

export const PRODUCT_IMAGE_ACCEPT = "image/*,.heic,.heif,image/heic,image/heif";

function isHeicImage(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

function getFileBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const safeName = withoutExtension.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safeName || "product-image";
}

function toOptimizedFileName(file: File) {
  return `${getFileBaseName(file.name)}.${OPTIMIZED_IMAGE_EXTENSION}`;
}

function isImageFile(file: File) {
  return file.type.toLowerCase().startsWith("image/") || isHeicImage(file);
}

function assertImageFile(file: File) {
  if (!isImageFile(file)) {
    throw new Error(`${file.name || "This file"} is not a supported image.`);
  }
}

async function convertHeicToJpeg(file: File) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.95,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  return new File([blob], `${getFileBaseName(file.name)}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export async function optimizeImageForUpload(file: File) {
  assertImageFile(file);

  const { default: imageCompression } = await import("browser-image-compression");
  const sourceFile = isHeicImage(file) ? await convertHeicToJpeg(file) : file;
  const optimized = await imageCompression(sourceFile, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2000,
    initialQuality: 0.88,
    fileType: OPTIMIZED_IMAGE_TYPE,
    useWebWorker: false,
    preserveExif: false,
  });

  return new File([optimized], toOptimizedFileName(file), {
    type: OPTIMIZED_IMAGE_TYPE,
    lastModified: file.lastModified,
  });
}
