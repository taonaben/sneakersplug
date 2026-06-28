import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { APP_NAME, fetchStoreById } from "@/lib/storefront";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Cart - ${APP_NAME}` },
      { name: "description", content: "Your shopping cart." },
    ],
  }),
  component: CartRedirect,
});

function CartRedirect() {
  const { items } = useCart();
  const navigate = useNavigate();
  const storeId = items[0]?.store_id;
  const { data: store } = useQuery({
    queryKey: ["cart-store", storeId],
    enabled: !!storeId,
    queryFn: () => fetchStoreById(storeId!),
  });

  useEffect(() => {
    if (!store) return;
    navigate({ to: "/s/$slug/cart", params: { slug: store.slug }, replace: true });
  }, [navigate, store]);

  if (items.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link to="/" className="mt-2 inline-block text-xs underline">Find a store</Link>
      </div>
    );
  }

  return <div className="px-4 py-20 text-center text-sm text-muted-foreground">Loading cart...</div>;
}

