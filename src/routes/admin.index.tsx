import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ShoppingCart, Tag, MapPin, Store } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const links = [
    { to: "/admin/stores" as const, label: "Stores", icon: Store, desc: "Manage storefronts" },
    { to: "/admin/products" as const, label: "Products", icon: Package, desc: "Manage inventory" },
    { to: "/admin/orders" as const, label: "Orders", icon: ShoppingCart, desc: "View & update orders" },
    { to: "/admin/categories" as const, label: "Categories", icon: Tag, desc: "Manage categories" },
    { to: "/admin/zones" as const, label: "Delivery Zones", icon: MapPin, desc: "Toggle active zones" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-3xl">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="border border-border p-4 hover:bg-secondary transition-colors">
          <l.icon className="h-5 w-5 mb-2" />
          <p className="text-xs font-bold uppercase tracking-wider">{l.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{l.desc}</p>
        </Link>
      ))}
    </div>
  );
}
