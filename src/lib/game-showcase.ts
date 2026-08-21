import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameSectionItem {
  id: string;
  section_id: string;
  name: string;
  platform: string;
  badge: string;
  image_url: string | null;
  sort_order: number;
}

export interface GameSection {
  id: string;
  title: string;
  subtitle: string;
  /** Design-system accent token used for the section's glow. */
  accent: string;
  sort_order: number;
  is_active: boolean;
  items: GameSectionItem[];
}

/** Accents an admin can pick, mapped to the site's design tokens. */
export const SECTION_ACCENTS = ["pink", "violet", "cyan", "primary"] as const;

export const ACCENT_TEXT: Record<string, string> = {
  pink: "text-pink",
  violet: "text-violet",
  cyan: "text-cyan",
  primary: "text-primary",
};

export const ACCENT_GLOW: Record<string, string> = {
  pink: "shadow-[0_30px_80px_-50px_var(--pink)] hover:border-pink/60",
  violet: "shadow-[0_30px_80px_-50px_var(--violet)] hover:border-violet/60",
  cyan: "shadow-[0_30px_80px_-50px_var(--cyan)] hover:border-cyan/60",
  primary: "shadow-[0_30px_80px_-50px_var(--primary)] hover:border-primary/60",
};

/** Admin-curated game showcase used by the public games page. */
export function useGameShowcase(options?: { includeHidden?: boolean }) {
  const includeHidden = options?.includeHidden ?? false;
  const [sections, setSections] = useState<GameSection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: secs }, { data: items }] = await Promise.all([
      supabase.from("game_sections").select("*").order("sort_order"),
      supabase.from("game_section_items").select("*").order("sort_order"),
    ]);
    const rows = ((secs ?? []) as unknown as Omit<GameSection, "items">[]).filter(
      (s) => includeHidden || s.is_active,
    );
    const byId = new Map<string, GameSectionItem[]>();
    for (const it of (items ?? []) as unknown as GameSectionItem[]) {
      const list = byId.get(it.section_id) ?? [];
      list.push(it);
      byId.set(it.section_id, list);
    }
    setSections(rows.map((s) => ({ ...s, items: byId.get(s.id) ?? [] })));
    setLoading(false);
  }, [includeHidden]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sections, loading, refresh: load };
}
