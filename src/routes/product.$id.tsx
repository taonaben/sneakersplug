import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { ArrowLeft, ChevronLeft, ChevronRight, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/product/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    cat: (search.cat as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Product — SneakersPlug" },
      { name: "description", content: "View product details at SneakersPlug." },
    ],
  }),
  component: ProductDetail,
});

/* ── Size selector overlay (YZY-style) ── */
function SizeSelector({
  sizes,
  price,
  onSelect,
  onClose,
}: {
  sizes: Tables<"product_sizes">[];
  price: number;
  onSelect: (size: Tables<"product_sizes">) => void;
  onClose: () => void;
}) {
  const [showAlt, setShowAlt] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-background px-6 pt-5 pb-8 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowAlt(!showAlt)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle size format"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Select Size</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Price */}
        <p className="text-center text-sm font-medium mb-4">${price.toFixed(2)}</p>

        {/* Size grid */}
        <div className="grid grid-cols-7 gap-2">
          {sizes.map((s) => {
            const oos = s.stock <= 0;
            const displayLabel = showAlt && s.alt_label ? s.alt_label : s.label;
            return (
              <button
                key={s.id}
                disabled={oos}
                onClick={() => onSelect(s)}
                className={`py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                  oos
                    ? "text-muted-foreground/40 cursor-not-allowed line-through"
                    : "text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main product detail ── */
function ProductDetail() {
  const { id } = Route.useParams();
  const { cat } = Route.useSearch();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [sizeOpen, setSizeOpen] = useState(false);

  // Touch swipe refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Fetch current product
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch sizes for this product
  const { data: sizes } = useQuery({
    queryKey: ["product-sizes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_sizes").select("*").eq("product_id", id).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sibling products for navigation (same category if cat param, otherwise all)
  const { data: siblings } = useQuery({
    queryKey: ["product-siblings", cat || "all"],
    queryFn: async () => {
      let query = supabase.from("products").select("id").order("created_at", { ascending: false });
      if (cat) query = query.eq("category_id", cat);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Determine prev/next
  const currentIndex = siblings?.findIndex((p) => p.id === id) ?? -1;
  const prevId = siblings && currentIndex > 0 ? siblings[currentIndex - 1].id : siblings && siblings.length > 0 ? siblings[siblings.length - 1].id : null;
  const nextId = siblings && currentIndex < (siblings.length - 1) ? siblings[currentIndex + 1].id : siblings && siblings.length > 0 ? siblings[0].id : null;

  const goTo = useCallback(
    (targetId: string | null) => {
      if (!targetId || targetId === id) return;
      navigate({ to: "/product/$id", params: { id: targetId }, search: { cat } });
    },
    [navigate, id, cat],
  );

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (sizeOpen) return;
      if (e.key === "ArrowLeft") goTo(prevId);
      if (e.key === "ArrowRight") goTo(nextId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevId, nextId, goTo, sizeOpen]);

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(nextId); // swipe left → next
      else goTo(prevId); // swipe right → prev
    }
  };

  const hasSizes = sizes && sizes.length > 0;
  const totalSizeStock = hasSizes ? sizes.reduce((sum, s) => sum + s.stock, 0) : 0;
  const isInStock = hasSizes ? totalSizeStock > 0 : (product?.stock ?? 0) > 0;

  const handleAddToCart = () => {
    if (!product) return;
    if (hasSizes) {
      setSizeOpen(true);
    } else {
      addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
    }
  };

  const handleSizeSelect = (size: Tables<"product_sizes">) => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      size: size.label,
      size_id: size.id,
    });
    setSizeOpen(false);
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="aspect-square bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-muted-foreground text-sm">Product not found.</p>
        <Link to="/" className="text-xs underline mt-2 inline-block">Back to shop</Link>
      </div>
    );
  }

  return (
    <div
      className="relative px-4 py-6 md:px-8 min-h-[calc(100vh-57px)]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      {/* Desktop nav arrows */}
      {prevId && prevId !== id && (
        <button
          onClick={() => goTo(prevId)}
          className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous product"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {nextId && nextId !== id && (
        <button
          onClick={() => goTo(nextId)}
          className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next product"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      <div className="max-w-lg mx-auto">
        <div className="aspect-square bg-secondary overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No image</div>
          )}
        </div>
        <div className="mt-4">
          <h1 className="text-sm font-bold uppercase tracking-wider">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">${product.price.toFixed(2)}</p>
          {isInStock ? (
            <Button
              onClick={handleAddToCart}
              className="w-full mt-6 uppercase tracking-widest text-xs h-11"
            >
              Add to Cart
            </Button>
          ) : (
            <p className="text-xs text-destructive mt-4 uppercase tracking-wider">Out of stock</p>
          )}
        </div>
      </div>

      {/* Size selector overlay */}
      {sizeOpen && hasSizes && (
        <SizeSelector
          sizes={sizes}
          price={product.price}
          onSelect={handleSizeSelect}
          onClose={() => setSizeOpen(false)}
        />
      )}
    </div>
  );
}
