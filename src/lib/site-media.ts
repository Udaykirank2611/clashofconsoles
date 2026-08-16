import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteMediaRow {
  key: string;
  label: string;
  media_type: "image" | "video";
  url: string | null;
}

export type SiteMediaMap = Record<string, SiteMediaRow | undefined>;

/**
 * Owner-managed site imagery (hero backdrop, food banner…).
 * Falls back to the bundled artwork when no link has been set.
 */
export function useSiteMedia(): { media: SiteMediaMap; loading: boolean } {
  const [media, setMedia] = useState<SiteMediaMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("site_media").select("key, label, media_type, url");
    const next: SiteMediaMap = {};
    for (const row of (data ?? []) as unknown as SiteMediaRow[]) next[row.key] = row;
    setMedia(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("site-media")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_media" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return { media, loading };
}
