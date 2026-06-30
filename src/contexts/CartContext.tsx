import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface CartItem {
  id: string;
  store_id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  variant_id?: string;
  selected_options?: Record<string, string>;
  size?: string;
  size_id?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string, variant_id?: string) => void;
  updateQuantity: (id: string, quantity: number, variant_id?: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "storefront_cart";
const LEGACY_CART_KEY = "sneakersplug_cart";
const CART_STORAGE_VERSION = 1;
const CART_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type StoredCart = {
  version: number;
  updatedAt: number;
  items: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanSelectedOptions(value: unknown) {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].trim().length > 0);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const storeId = typeof value.store_id === "string" ? value.store_id : "";
  const name = typeof value.name === "string" ? value.name : "";
  const price = typeof value.price === "number" && Number.isFinite(value.price) ? value.price : null;
  const quantity = typeof value.quantity === "number" && Number.isFinite(value.quantity) ? Math.floor(value.quantity) : 1;
  const imageUrl = typeof value.image_url === "string" ? value.image_url : null;
  const variantId = typeof value.variant_id === "string" ? value.variant_id : typeof value.size_id === "string" ? value.size_id : undefined;
  const size = typeof value.size === "string" ? value.size : undefined;
  const selectedOptions = cleanSelectedOptions(value.selected_options) || (size ? { Size: size } : undefined);

  if (!id || !storeId || !name || price === null || price < 0) return null;

  return {
    id,
    store_id: storeId,
    name,
    price,
    image_url: imageUrl,
    quantity: Math.max(1, Math.min(quantity, 99)),
    variant_id: variantId,
    selected_options: selectedOptions,
    size,
    size_id: typeof value.size_id === "string" ? value.size_id : undefined,
  };
}

function parseCartPayload(raw: string | null): CartItem[] {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  const maybeItems = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray((parsed as StoredCart).items)
      ? (parsed as StoredCart).items
      : [];

  if (isRecord(parsed) && typeof (parsed as StoredCart).updatedAt === "number" && Date.now() - (parsed as StoredCart).updatedAt > CART_TTL_MS) {
    return [];
  }

  return maybeItems.map(normalizeCartItem).filter((item): item is CartItem => Boolean(item));
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_CART_KEY);
    return parseCartPayload(raw || legacyRaw);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;

  try {
    if (items.length === 0) {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
      return;
    }

    localStorage.setItem(CART_KEY, JSON.stringify({
      version: CART_STORAGE_VERSION,
      updatedAt: Date.now(),
      items,
    }));
  } catch {
    // Storage can fail in private browsing or when quota is full. Keep the in-memory cart usable.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    saveCart(items);
  }, [items]);

  useEffect(() => {
    const syncCart = (event: StorageEvent) => {
      if (event.key !== CART_KEY && event.key !== LEGACY_CART_KEY) return;
      setItems(loadCart());
    };

    window.addEventListener("storage", syncCart);
    return () => window.removeEventListener("storage", syncCart);
  }, []);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const sameStoreItems = prev.filter((i) => i.store_id === item.store_id);
      const existing = prev.find((i) => i.id === item.id && (i.variant_id || i.size_id) === (item.variant_id || item.size_id));
      if (existing) {
        return prev.map((i) => (i.id === item.id && (i.variant_id || i.size_id) === (item.variant_id || item.size_id) ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...sameStoreItems, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string, variant_id?: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && (i.variant_id || i.size_id) === variant_id)));
  };

  const updateQuantity = (id: string, quantity: number, variant_id?: string) => {
    if (quantity < 1) {
      removeItem(id, variant_id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id && (i.variant_id || i.size_id) === variant_id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
