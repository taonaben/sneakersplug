import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { APP_NAME, fetchStoreById } from "@/lib/storefront";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: `Checkout - ${APP_NAME}` },
      { name: "description", content: "Complete your order." },
    ],
  }),
  component: CheckoutRedirect,
});

function CheckoutRedirect() {
  const { items } = useCart();
  const navigate = useNavigate();
  const storeId = items[0]?.store_id;
  const { data: store } = useQuery({
    queryKey: ["checkout-store", storeId],
    enabled: !!storeId,
    queryFn: () => fetchStoreById(storeId!),
  });

  useEffect(() => {
    if (!store) return;
    navigate({ to: "/s/$slug/checkout", params: { slug: store.slug }, replace: true });
  }, [navigate, store]);

  useEffect(() => {
    if (items.length > 0) return;
    navigate({ to: "/cart", replace: true });
  }, [items.length, navigate]);

  return <div className="px-4 py-20 text-center text-sm text-muted-foreground">Loading checkout...</div>;
}

