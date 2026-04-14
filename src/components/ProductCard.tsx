import { Link } from "@tanstack/react-router";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
  compact?: boolean;
  categoryId?: string | null;
}

export function ProductCard({ product, compact, categoryId }: ProductCardProps) {
  return (
    <Link to="/product/$id" params={{ id: product.id }} search={{ cat: categoryId || undefined }} className="group block">
      <div className="aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
            No image
          </div>
        )}
      </div>
      <div className={compact ? "mt-1.5" : "mt-2"}>
        <p className="text-xs font-medium uppercase tracking-wider truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  );
}
