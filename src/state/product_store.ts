import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductImage = Tables<"product_images">;
export type ProductOption = Tables<"product_options">;
export type ProductOptionValue = Tables<"product_option_values">;
export type ProductVariant = Tables<"product_variants">;

export interface ProductOptionWithValues extends ProductOption {
  values: ProductOptionValue[];
}

export interface ProductDetail {
  product: Product;
  images: ProductImage[];
  options: ProductOptionWithValues[];
  variants: ProductVariant[];
  siblingIds: string[];
  storeId: string;
  categoryId: string | null;
  loadedAt: number;
}

interface ProductStoreState {
  productsById: Record<string, Product>;
  detailsById: Record<string, ProductDetail>;
  listIdsByKey: Record<string, string[]>;
  listLoadingByKey: Record<string, boolean>;
  detailLoadingById: Record<string, boolean>;
  listErrorsByKey: Record<string, string | null>;
  detailErrorsById: Record<string, string | null>;
  loadStoreProducts: (storeId: string, categoryId?: string | null) => Promise<Product[]>;
  loadProductDetail: (storeId: string, productId: string, categoryId?: string | null) => Promise<ProductDetail | null>;
  prefetchProductsAhead: (storeId: string, currentProductId: string, categoryId?: string | null, count?: number) => Promise<void>;
  clearStoreProducts: (storeId: string) => void;
}

const listRequests = new Map<string, Promise<Product[]>>();
const detailRequests = new Map<string, Promise<ProductDetail | null>>();

export function getProductListKey(storeId: string, categoryId?: string | null) {
  return `${storeId}:${categoryId || "all"}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getAheadIds(ids: string[], currentProductId: string, count: number) {
  if (ids.length <= 1) return [];

  const currentIndex = ids.indexOf(currentProductId);
  if (currentIndex === -1) return [];

  const aheadIds: string[] = [];
  const maxCount = Math.min(count, ids.length - 1);

  for (let offset = 1; offset <= maxCount; offset++) {
    aheadIds.push(ids[(currentIndex + offset) % ids.length]);
  }

  return aheadIds;
}

async function fetchStoreProducts(storeId: string, categoryId?: string | null) {
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchProductDetail(storeId: string, productId: string) {
  const [productResult, imageResult, optionResult, variantResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_options")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (productResult.error) throw productResult.error;
  if (imageResult.error) throw imageResult.error;
  if (optionResult.error) throw optionResult.error;
  if (variantResult.error) throw variantResult.error;
  if (!productResult.data) return null;

  const options = optionResult.data ?? [];
  const optionIds = options.map((option) => option.id);
  let optionValues: ProductOptionValue[] = [];

  if (optionIds.length > 0) {
    const { data, error } = await supabase
      .from("product_option_values")
      .select("*")
      .in("option_id", optionIds)
      .order("sort_order");

    if (error) throw error;
    optionValues = data ?? [];
  }

  return {
    product: productResult.data,
    images: imageResult.data ?? [],
    options: options.map((option) => ({
      ...option,
      values: optionValues.filter((value) => value.option_id === option.id),
    })),
    variants: variantResult.data ?? [],
  };
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  productsById: {},
  detailsById: {},
  listIdsByKey: {},
  listLoadingByKey: {},
  detailLoadingById: {},
  listErrorsByKey: {},
  detailErrorsById: {},

  loadStoreProducts: async (storeId, categoryId = null) => {
    const key = getProductListKey(storeId, categoryId);
    const cachedIds = get().listIdsByKey[key];

    if (cachedIds) {
      return cachedIds.map((id) => get().productsById[id]).filter((product): product is Product => Boolean(product));
    }

    const existingRequest = listRequests.get(key);
    if (existingRequest) return existingRequest;

    const request = fetchStoreProducts(storeId, categoryId)
      .then((products) => {
        set((state) => ({
          productsById: {
            ...state.productsById,
            ...Object.fromEntries(products.map((product) => [product.id, product])),
          },
          listIdsByKey: {
            ...state.listIdsByKey,
            [key]: products.map((product) => product.id),
          },
          listLoadingByKey: {
            ...state.listLoadingByKey,
            [key]: false,
          },
          listErrorsByKey: {
            ...state.listErrorsByKey,
            [key]: null,
          },
        }));
        return products;
      })
      .catch((error: unknown) => {
        set((state) => ({
          listLoadingByKey: {
            ...state.listLoadingByKey,
            [key]: false,
          },
          listErrorsByKey: {
            ...state.listErrorsByKey,
            [key]: getErrorMessage(error),
          },
        }));
        throw error;
      })
      .finally(() => {
        listRequests.delete(key);
      });

    listRequests.set(key, request);
    set((state) => ({
      listLoadingByKey: {
        ...state.listLoadingByKey,
        [key]: true,
      },
      listErrorsByKey: {
        ...state.listErrorsByKey,
        [key]: null,
      },
    }));

    return request;
  },

  loadProductDetail: async (storeId, productId, categoryId = null) => {
    const cachedDetail = get().detailsById[productId];
    if (cachedDetail) {
      const listKey = getProductListKey(storeId, categoryId);
      if (!get().listIdsByKey[listKey]) {
        await get().loadStoreProducts(storeId, categoryId);
      }
      return cachedDetail;
    }

    const existingRequest = detailRequests.get(productId);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      const listKey = getProductListKey(storeId, categoryId);
      const cachedSiblingIds = get().listIdsByKey[listKey];
      const siblingIdsPromise = cachedSiblingIds
        ? Promise.resolve(cachedSiblingIds)
        : get().loadStoreProducts(storeId, categoryId).then((products) => products.map((product) => product.id));

      const fetchedDetail = await fetchProductDetail(storeId, productId);
      if (!fetchedDetail) {
        set((state) => ({
          detailLoadingById: {
            ...state.detailLoadingById,
            [productId]: false,
          },
          detailErrorsById: {
            ...state.detailErrorsById,
            [productId]: null,
          },
        }));
        return null;
      }

      const detail: ProductDetail = {
        ...fetchedDetail,
        siblingIds: cachedSiblingIds ?? [],
        storeId,
        categoryId,
        loadedAt: Date.now(),
      };

      set((state) => ({
        productsById: {
          ...state.productsById,
          [detail.product.id]: detail.product,
        },
        detailsById: {
          ...state.detailsById,
          [productId]: detail,
        },
        detailLoadingById: {
          ...state.detailLoadingById,
          [productId]: false,
        },
        detailErrorsById: {
          ...state.detailErrorsById,
          [productId]: null,
        },
      }));

      siblingIdsPromise
        .then((siblingIds) => {
          set((state) => {
            const currentDetail = state.detailsById[productId];
            if (!currentDetail || currentDetail.storeId !== storeId) return state;

            return {
              detailsById: {
                ...state.detailsById,
                [productId]: {
                  ...currentDetail,
                  siblingIds,
                },
              },
            };
          });
        })
        .catch(() => {
          // The list error is already tracked by loadStoreProducts; keep detail usable.
        });

      return detail;
    })()
      .catch((error: unknown) => {
        set((state) => ({
          detailLoadingById: {
            ...state.detailLoadingById,
            [productId]: false,
          },
          detailErrorsById: {
            ...state.detailErrorsById,
            [productId]: getErrorMessage(error),
          },
        }));
        throw error;
      })
      .finally(() => {
        detailRequests.delete(productId);
      });

    detailRequests.set(productId, request);
    set((state) => ({
      detailLoadingById: {
        ...state.detailLoadingById,
        [productId]: true,
      },
      detailErrorsById: {
        ...state.detailErrorsById,
        [productId]: null,
      },
    }));

    return request;
  },

  prefetchProductsAhead: async (storeId, currentProductId, categoryId = null, count = 3) => {
    const products = await get().loadStoreProducts(storeId, categoryId);
    const aheadIds = getAheadIds(products.map((product) => product.id), currentProductId, count);

    await Promise.all(
      aheadIds.map(async (productId) => {
        if (get().detailsById[productId]) return;
        await get().loadProductDetail(storeId, productId, categoryId);
      }),
    );
  },

  clearStoreProducts: (storeId) => {
    for (const key of Array.from(listRequests.keys())) {
      if (key.startsWith(`${storeId}:`)) listRequests.delete(key);
    }
    for (const product of Object.values(get().productsById)) {
      if (product.store_id === storeId) detailRequests.delete(product.id);
    }

    set((state) => {
      const listIdsByKey = Object.fromEntries(
        Object.entries(state.listIdsByKey).filter(([key]) => !key.startsWith(`${storeId}:`)),
      );
      const listLoadingByKey = Object.fromEntries(
        Object.entries(state.listLoadingByKey).filter(([key]) => !key.startsWith(`${storeId}:`)),
      );
      const listErrorsByKey = Object.fromEntries(
        Object.entries(state.listErrorsByKey).filter(([key]) => !key.startsWith(`${storeId}:`)),
      );
      const productsById = Object.fromEntries(
        Object.entries(state.productsById).filter(([, product]) => product.store_id !== storeId),
      );
      const detailsById = Object.fromEntries(
        Object.entries(state.detailsById).filter(([, detail]) => detail.storeId !== storeId),
      );
      const detailLoadingById = Object.fromEntries(
        Object.entries(state.detailLoadingById).filter(([productId]) => productsById[productId]),
      );
      const detailErrorsById = Object.fromEntries(
        Object.entries(state.detailErrorsById).filter(([productId]) => productsById[productId]),
      );

      return {
        productsById,
        detailsById,
        listIdsByKey,
        listLoadingByKey,
        listErrorsByKey,
        detailLoadingById,
        detailErrorsById,
      };
    });
  },
}));
