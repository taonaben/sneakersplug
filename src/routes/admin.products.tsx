import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

interface ProductForm {
  name: string;
  price: string;
  stock: string;
  category_id: string;
  image: File | null;
}

const emptyForm: ProductForm = { name: "", price: "", stock: "0", category_id: "", image: null };

/* ── Size manager for a single product ── */
function SizeManager({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [altLabel, setAltLabel] = useState("");
  const [stock, setStock] = useState("0");

  const { data: sizes } = useQuery({
    queryKey: ["product-sizes", productId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_sizes").select("*").eq("product_id", productId).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addSize = useMutation({
    mutationFn: async () => {
      const nextOrder = (sizes?.length ?? 0);
      const { error } = await supabase.from("product_sizes").insert({
        product_id: productId,
        label: label.trim(),
        alt_label: altLabel.trim() || null,
        stock: parseInt(stock),
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-sizes", productId] });
      setLabel("");
      setAltLabel("");
      setStock("0");
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("product_sizes").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-sizes", productId] }),
  });

  const deleteSize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_sizes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-sizes", productId] }),
  });

  return (
    <div className="border border-border p-3 mt-3 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider">Sizes</h3>

      {/* Existing sizes */}
      {sizes && sizes.length > 0 && (
        <div className="space-y-1">
          {sizes.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-xs font-medium w-12">{s.label}</span>
              {s.alt_label && <span className="text-[10px] text-muted-foreground w-12">({s.alt_label})</span>}
              <Input
                type="number"
                defaultValue={String(s.stock)}
                className="w-20 h-7 text-xs"
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val !== s.stock) updateStock.mutate({ id: s.id, stock: val });
                }}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteSize.mutate(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add size form */}
      <form onSubmit={(e) => { e.preventDefault(); if (label.trim()) addSize.mutate(); }} className="flex items-center gap-2">
        <Input placeholder="Label (e.g. 7)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-20 h-7 text-xs" required />
        <Input placeholder="Alt (e.g. 40)" value={altLabel} onChange={(e) => setAltLabel(e.target.value)} className="w-20 h-7 text-xs" />
        <Input placeholder="Stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-16 h-7 text-xs" />
        <Button type="submit" size="sm" className="h-7 text-[10px] uppercase" disabled={addSize.isPending}>Add</Button>
      </form>
    </div>
  );
}

/* ── Main admin products page ── */
function AdminProducts() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | undefined;

      if (form.image) {
        const ext = form.image.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, form.image);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        category_id: form.category_id || null,
        ...(image_url ? { image_url } : {}),
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setForm(emptyForm);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const startEdit = (p: Tables<"products">) => {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock), category_id: p.category_id || "", image: null });
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4">{editingId ? "Edit Product" : "Add Product"}</h2>

      <form
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        className="space-y-3 mb-4"
      >
        <Input placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <div className="flex gap-3">
          <Input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required className="flex-1" />
          <Input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required className="w-24" />
        </div>
        <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Category (optional)" /></SelectTrigger>
          <SelectContent>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="file" accept="image/*" onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))} />
        <div className="flex gap-2">
          <Button type="submit" disabled={saveMutation.isPending} className="text-xs uppercase tracking-widest">
            {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Add Product"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-xs">
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Size manager appears when editing an existing product */}
      {editingId && <SizeManager productId={editingId} />}

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 mt-8">All Products</h2>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {products?.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border border-border p-2">
              <div className="h-10 w-10 bg-secondary shrink-0 overflow-hidden">
                {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">${p.price} · Stock: {p.stock}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(p)}>
                <Plus className="h-3 w-3 rotate-45" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
