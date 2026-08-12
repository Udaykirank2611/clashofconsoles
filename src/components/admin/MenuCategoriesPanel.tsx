import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import { categoryCover } from "@/lib/menu-categories";

export interface MenuCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  starting_price: number;
  sort_order: number;
  is_visible: boolean;
}

/**
 * Home page food category cards. Images live here and nowhere else —
 * actual menu items are text-only and managed per branch.
 */
export function MenuCategoriesPanel() {
  const [rows, setRows] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("menu_categories").select("*").order("sort_order");
    setRows((data ?? []) as unknown as MenuCategory[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = (id: string, changes: Partial<MenuCategory>) =>
    setRows((r) => r.map((c) => (c.id === id ? { ...c, ...changes } : c)));

  const save = async (row: MenuCategory) => {
    setBusy(row.id);
    const { error } = await supabase
      .from("menu_categories")
      .update({
        title: row.title,
        description: row.description,
        image_url: row.image_url || null,
        starting_price: Number(row.starting_price) || 0,
        is_visible: row.is_visible,
      })
      .eq("id", row.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success(`${row.title} updated on the home page.`);
  };

  if (loading) {
    return (
      <Panel title="Menu categories">
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      </Panel>
    );
  }

  return (
    <Panel title="Menu categories (home page)">
      <p className="mb-4 text-xs text-muted-foreground">
        These cards are the only place food images appear on the website. The full menu page, the booking
        flow and the branch menus are text-only.
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-3xl border border-border bg-background/40 p-5">
            <div className="mb-4 flex items-center gap-3">
              <img
                src={categoryCover(row.slug, row.image_url)}
                alt={row.title}
                width={64}
                height={64}
                loading="lazy"
                className="size-16 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <p className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{row.slug}</p>
              </div>
              <Pill tone={row.is_visible ? "good" : "muted"}>{row.is_visible ? "Visible" : "Hidden"}</Pill>
            </div>
            <div className="space-y-3">
              <AdminInput label="Title" value={row.title} onChange={(v) => patch(row.id, { title: v })} />
              <AdminInput
                label="Description"
                value={row.description ?? ""}
                onChange={(v) => patch(row.id, { description: v })}
              />
              <AdminInput
                label="Starting price (₹)"
                type="number"
                value={String(row.starting_price)}
                onChange={(v) => patch(row.id, { starting_price: Number(v) })}
              />
              <AdminInput
                label="Image link (leave blank for the default artwork)"
                value={row.image_url ?? ""}
                onChange={(v) => patch(row.id, { image_url: v })}
                placeholder="https://…/snacks.jpg"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton onClick={() => patch(row.id, { is_visible: !row.is_visible })}>
                {row.is_visible ? "Hide" : "Show"}
              </AdminButton>
              <AdminButton variant="primary" disabled={busy === row.id} onClick={() => void save(row)}>
                {busy === row.id ? "Saving…" : "Save"}
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
