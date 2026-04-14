import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SneakersPlug" },
      { name: "description", content: "Complete your order at SneakersPlug." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "" });

  const { data: zones } = useQuery({
    queryKey: ["delivery_zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  if (items.length === 0) {
    navigate({ to: "/cart" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.city || !form.address.trim()) return;
    setSubmitting(true);

    try {
      const orderItems = items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size || null, size_id: i.size_id || null }));

      await supabase.from("orders").insert({
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city,
        address: form.address.trim(),
        items: orderItems,
        total: subtotal,
      });

      // Build WhatsApp message
      const lines = items.map((i) => {
        const sizeStr = i.size ? ` (Size: ${i.size})` : "";
        return `${i.quantity}x ${i.name}${sizeStr} — $${(i.price * i.quantity).toFixed(2)}`;
      });
      const msg = `🛒 *New SneakersPlug Order*\n\n` +
        `*Name:* ${form.name}\n*Phone:* ${form.phone}\n*City:* ${form.city}\n*Address:* ${form.address}\n\n` +
        `*Items:*\n${lines.join("\n")}\n\n*Total: $${subtotal.toFixed(2)}*`;
      const waUrl = `https://wa.me/263781830006?text=${encodeURIComponent(msg)}`;

      clearCart();
      window.open(waUrl, "_blank");
      navigate({ to: "/" });
    } catch {
      alert("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 max-w-lg mx-auto">
      <h1 className="text-sm font-bold uppercase tracking-wider mb-6">Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="mt-1" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required className="mt-1" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
          <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select delivery city" />
            </SelectTrigger>
            <SelectContent>
              {zones?.map((z) => (
                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Delivery Address</label>
          <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required className="mt-1" />
        </div>

        <div className="border-t pt-4 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider">Total</span>
          <span className="text-sm font-bold">${subtotal.toFixed(2)}</span>
        </div>

        <Button type="submit" disabled={submitting || !form.city} className="w-full uppercase tracking-widest text-xs h-11">
          {submitting ? "Placing order…" : "Place Order via WhatsApp"}
        </Button>
      </form>
    </div>
  );
}
