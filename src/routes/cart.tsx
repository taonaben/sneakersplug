import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — SneakersPlug" },
      { name: "description", content: "Your shopping cart at SneakersPlug." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link to="/" className="text-xs underline mt-2 inline-block">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 max-w-lg mx-auto">
      <h1 className="text-sm font-bold uppercase tracking-wider mb-6">Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={`${item.id}-${item.size_id ?? "no-size"}`} className="flex gap-3">
            <div className="h-20 w-20 shrink-0 bg-secondary overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground uppercase">No img</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider truncate">{item.name}</p>
              {item.size && <p className="text-[10px] text-muted-foreground">Size: {item.size}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">${item.price.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size_id)} className="text-muted-foreground hover:text-foreground">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size_id)} className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <button onClick={() => removeItem(item.id, item.size_id)} className="text-muted-foreground hover:text-foreground self-start">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t mt-6 pt-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider">Subtotal</span>
        <span className="text-sm font-bold">${subtotal.toFixed(2)}</span>
      </div>
      <Link to="/checkout">
        <Button className="w-full mt-4 uppercase tracking-widest text-xs h-11">Checkout</Button>
      </Link>
    </div>
  );
}
