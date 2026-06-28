import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SELECTED_STORE_KEY = "sneakersplug_selected_store_id";

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function useAdminStores() {
  const [selectedStoreId, setSelectedStoreIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SELECTED_STORE_KEY) || "";
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const storesQuery = useQuery({
    queryKey: ["owned-stores", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const stores = storesQuery.data ?? [];
  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null,
    [selectedStoreId, stores],
  );

  useEffect(() => {
    if (!stores.length) return;
    if (!selectedStoreId || !stores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  const setSelectedStoreId = (storeId: string) => {
    setSelectedStoreIdState(storeId);
    if (typeof window !== "undefined") localStorage.setItem(SELECTED_STORE_KEY, storeId);
  };

  return {
    user,
    stores,
    selectedStore,
    selectedStoreId: selectedStore?.id ?? "",
    setSelectedStoreId,
    isLoading: userLoading || storesQuery.isLoading,
    refetchStores: storesQuery.refetch,
  };
}
