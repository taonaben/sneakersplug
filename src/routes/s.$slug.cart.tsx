import { createFileRoute } from "@tanstack/react-router";
import { CartPageContent } from "@/components/store/CartPageContent";
import { APP_NAME } from "@/lib/storefront";

export const Route = createFileRoute("/s/$slug/cart")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} Cart - ${APP_NAME}` },
      { name: "description", content: "Your shopping cart." },
    ],
  }),
  component: StoreCartPage,
});

function StoreCartPage() {
  const { slug } = Route.useParams();
  return <CartPageContent storeSlug={slug} />;
}

