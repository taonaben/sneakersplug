import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("categories").insert({ name: name.trim(), slug, sort_order: parseInt(sortOrder) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setName(""); setSortOrder("0"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="max-w-md">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Categories</h2>
      <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="flex gap-2 mb-6">
        <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} required className="flex-1" />
        <Input placeholder="Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16" />
        <Button type="submit" disabled={addMutation.isPending} className="text-xs uppercase">Add</Button>
      </form>
      {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {categories?.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-border p-2">
              <div>
                <p className="text-xs font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">/{c.slug} · order: {c.sort_order}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
