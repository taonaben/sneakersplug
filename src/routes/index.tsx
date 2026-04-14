import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Grid3X3, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SneakersPlug — Premium Sneakers & Streetwear" },
      { name: "description", content: "Shop the latest sneakers, jackets, and accessories at SneakersPlug. Delivery across Zimbabwe." },
      { property: "og:title", content: "SneakersPlug — Premium Sneakers & Streetwear" },
      { property: "og:description", content: "Shop the latest sneakers, jackets, and accessories." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", activeCategory],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (activeCategory) query = query.eq("category_id", activeCategory);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-4 py-6 md:px-8">
      {/* Category filters */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs uppercase tracking-widest whitespace-nowrap pb-1 border-b-2 transition-colors ${
            !activeCategory ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-xs uppercase tracking-widest whitespace-nowrap pb-1 border-b-2 transition-colors ${
              activeCategory === cat.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}

        {/* Layout toggle */}
        <button onClick={() => setExpanded(!expanded)} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Toggle grid layout">
          {expanded ? <Grid3X3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </button>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${expanded ? 3 : 6}, 1fr)` }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary animate-pulse" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-20">No products yet.</p>
      ) : (
        <div
          className={`grid gap-4 ${expanded ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3 md:grid-cols-6"}`}
        >
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} compact={!expanded} categoryId={activeCategory} />
          ))}
        </div>
      )}
    </div>
  );
}
