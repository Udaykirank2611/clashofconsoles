import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import { MenuCategoriesPanel } from "./MenuCategoriesPanel";
import { ExperiencesPanel } from "./ExperiencesPanel";
import { SiteMediaPanel } from "./SiteMediaPanel";
import { AlertTriangle } from "lucide-react";

export interface HomepageCard {
  id: string;
  kind: "membership" | "unlimited_pass" | "combo_offer" | "student_offer" | string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string | null;
  starting_price: number;
  hours_included: number;
  price_unit: string;
  features: string[];
  badge: string;
  discount_percent: number;
  min_bill: number;
  sort_order: number;
  is_visible: boolean;
}

const KIND_LABEL: Record<string, string> = {
  membership: "Membership card",
  unlimited_pass: "Unlimited pass",
  combo_offer: "Combo offer",
  student_offer: "Student offer",
};

/** Shared marketing content for the public home page — global across every branch. */
export function HomepagePanel({ branches }: { branches: { id: string; name: string }[] }) {
  const [cards, setCards] = useState<HomepageCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("homepage_cards").select("*").order("kind").order("sort_order");
    setCards((data ?? []) as unknown as HomepageCard[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = (id: string, changes: Partial<HomepageCard>) =>
    setCards((r) => r.map((c) => (c.id === id ? { ...c, ...changes } : c)));

  const save = async (card: HomepageCard) => {
    setBusy(card.id);
    const { error } = await supabase
      .from("homepage_cards")
      .update({
        title: card.title,
        subtitle: card.subtitle,
        body: card.body,
        image_url: card.image_url || null,
        starting_price: Number(card.starting_price) || 0,
        hours_included: Number(card.hours_included) || 0,
        price_unit: card.price_unit,
        features: card.features,
        badge: card.badge,
        discount_percent: Number(card.discount_percent) || 0,
        min_bill: Number(card.min_bill) || 0,
        is_visible: card.is_visible,
      })
      .eq("id", card.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success(`${card.title} updated on the home page.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-3xl border border-amber-400/40 bg-amber-400/5 p-5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Shared content — affects every branch</p>
          <p className="mt-1">
            Changes here update the public home page for all branches. Only edit shared marketing content
            (images, descriptions, feature cards and “starting from” prices). Branch pricing, menus, booking
            settings and offers are managed separately inside each branch dashboard.
          </p>
        </div>
      </div>

      {loading ? (
        <Panel>
          <p className="text-sm text-muted-foreground">Loading home page content…</p>
        </Panel>
      ) : (
        <Panel title="Home page cards">
          <ul className="grid gap-4 lg:grid-cols-2">
            {cards.map((card) => (
              <li key={card.id} className="rounded-3xl border border-border bg-background/40 p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-cyan">
                    {KIND_LABEL[card.kind] ?? card.kind}
                  </p>
                  <Pill tone={card.is_visible ? "good" : "muted"}>{card.is_visible ? "Visible" : "Hidden"}</Pill>
                </div>
                <div className="space-y-3">
                  <AdminInput label="Title" value={card.title} onChange={(v) => patch(card.id, { title: v })} />
                  <AdminInput
                    label="Subtitle"
                    value={card.subtitle ?? ""}
                    onChange={(v) => patch(card.id, { subtitle: v })}
                  />
                  <AdminInput
                    label="Description"
                    value={card.body ?? ""}
                    onChange={(v) => patch(card.id, { body: v })}
                  />
                  <AdminInput
                    label="Starting from price (₹)"
                    type="number"
                    value={String(card.starting_price)}
                    onChange={(v) => patch(card.id, { starting_price: Number(v) })}
                  />
                  {card.kind === "membership" ? (
                    <AdminInput
                      label="Hours included"
                      type="number"
                      value={String(card.hours_included ?? 0)}
                      onChange={(v) => patch(card.id, { hours_included: Number(v) })}
                    />
                  ) : null}
                  <AdminInput
                    label="Price note (e.g. Valid 30 days)"
                    value={card.price_unit ?? ""}
                    onChange={(v) => patch(card.id, { price_unit: v })}
                  />
                  <AdminInput
                    label="Badge (e.g. Best Value)"
                    value={card.badge ?? ""}
                    onChange={(v) => patch(card.id, { badge: v })}
                  />
                  <AdminInput
                    label="Image link"
                    value={card.image_url ?? ""}
                    onChange={(v) => patch(card.id, { image_url: v })}
                    placeholder="https://…/card.jpg"
                  />
                  <AdminInput
                    label="Features (comma separated)"
                    value={(card.features ?? []).join(", ")}
                    onChange={(v) =>
                      patch(card.id, { features: v.split(",").map((s) => s.trim()).filter(Boolean) })
                    }
                  />
                  {card.kind === "student_offer" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminInput
                        label="Discount %"
                        type="number"
                        value={String(card.discount_percent)}
                        onChange={(v) => patch(card.id, { discount_percent: Number(v) })}
                      />
                      <AdminInput
                        label="Minimum bill (₹)"
                        type="number"
                        value={String(card.min_bill)}
                        onChange={(v) => patch(card.id, { min_bill: Number(v) })}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminButton onClick={() => patch(card.id, { is_visible: !card.is_visible })}>
                    {card.is_visible ? "Hide" : "Show"}
                  </AdminButton>
                  <AdminButton variant="primary" disabled={busy === card.id} onClick={() => void save(card)}>
                    {busy === card.id ? "Saving…" : "Save"}
                  </AdminButton>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <SiteMediaPanel />

      <MenuCategoriesPanel />

      <ExperiencesPanel branches={branches} />
    </div>
  );
}
