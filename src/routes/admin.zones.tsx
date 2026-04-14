import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/zones")({
  component: AdminZones,
});

function AdminZones() {
  const qc = useQueryClient();

  const { data: zones, isLoading } = useQuery({
    queryKey: ["admin-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("delivery_zones").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-zones"] }),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-md">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Delivery Zones</h2>
      <div className="space-y-2">
        {zones?.map((z) => (
          <div key={z.id} className="flex items-center justify-between border border-border p-3">
            <span className="text-xs font-medium">{z.name}</span>
            <Switch checked={z.active} onCheckedChange={(checked) => toggleMutation.mutate({ id: z.id, active: checked })} />
          </div>
        ))}
      </div>
    </div>
  );
}
