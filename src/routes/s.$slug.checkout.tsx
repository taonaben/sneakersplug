import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPageContent } from "@/components/store/CheckoutPageContent";
import { APP_NAME } from "@/lib/storefront";

export const Route = createFileRoute("/s/$slug/checkout")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} Checkout - ${APP_NAME}` },
      { name: "description", content: "Complete your order." },
    ],
  }),
  component: StoreCheckoutPage,
});

function StoreCheckoutPage() {
  const { slug } = Route.useParams();
  return <CheckoutPageContent storeSlug={slug} />;
}

