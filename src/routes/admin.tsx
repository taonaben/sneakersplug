import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — SneakersPlug" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (roles?.some((r) => r.role === "admin")) {
        setIsAdmin(true);
      } else {
        navigate({ to: "/login" });
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-4 py-3 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/admin" className="text-sm font-bold uppercase tracking-wider">Admin</Link>
          <nav className="flex items-center gap-4">
            <Link to="/admin/products" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground" activeProps={{ className: "text-xs uppercase tracking-wider text-foreground font-medium" }}>Products</Link>
            <Link to="/admin/orders" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground" activeProps={{ className: "text-xs uppercase tracking-wider text-foreground font-medium" }}>Orders</Link>
            <Link to="/admin/categories" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground" activeProps={{ className: "text-xs uppercase tracking-wider text-foreground font-medium" }}>Categories</Link>
            <Link to="/admin/zones" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground" activeProps={{ className: "text-xs uppercase tracking-wider text-foreground font-medium" }}>Zones</Link>
          </nav>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
          Sign Out
        </Button>
      </header>
      <div className="p-4 md:p-8">
        <Outlet />
      </div>
    </div>
  );
}
