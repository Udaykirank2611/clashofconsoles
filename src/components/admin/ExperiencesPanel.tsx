import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import { toast } from "sonner";
import type { Experience } from "@/lib/site-content";

type BranchOption = { id: string; name: string };

/** Experience management — every homepage experience card is edited here. */
export function ExperiencesPanel({ branches }: { branches: BranchOption[] }) {
  const [rows, setRows] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("experiences").select("*").order("sort_order");
    setRows((data ?? []) as unknown as Experience[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = (id: string, changes: Partial<Experience>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  const save = async (exp: Experience) => {
    const { error } = await supabase
      .from("experiences")
      .update({
        name: exp.name,
        description: exp.description,
        image_url: exp.image_url,
        starting_price: Number(exp.starting_price) || 0,
        price_unit: exp.price_unit,
        branch_ids: exp.branch_ids,
        is_exclusive: exp.is_exclusive,
        is_active: exp.is_active,
        sort_order: Number(exp.sort_order) || 0,
      })
      .eq("id", exp.id);
    if (error) toast.error(error.message);
    else toast.success(`${exp.name} updated`);
  };

  const add = async () => {
    const slug = `experience-${Date.now()}`;
    const { error } = await supabase.from("experiences").insert({
      slug,
      name: "New Experience",
      description: "",
      starting_price: 0,
      branch_ids: branches.map((b) => b.id),
      sort_order: rows.length + 1,
    });
    if (error) toast.error(error.message);
    else void load();
  };

  const remove = async (exp: Experience) => {
    const { error } = await supabase.from("experiences").delete().eq("id", exp.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Experience removed");
      void load();
    }
  };

  if (loading) return <Panel><p className="text-sm text-muted-foreground">Loading experiences…</p></Panel>;

  return (
    <Panel
      title="Experience management"
      action={<AdminButton variant="primary" onClick={() => void add()}>Add experience</AdminButton>}
    >
      <ul className="space-y-4">
        {rows.map((exp) => (
          <li key={exp.id} className="rounded-3xl border border-border bg-background/40 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{exp.name}</h3>
                <Pill tone={exp.is_active ? "good" : "muted"}>{exp.is_active ? "Active" : "Hidden"}</Pill>
                {exp.is_exclusive ? <Pill tone="warn">Exclusive</Pill> : null}
              </div>
              <div className="flex gap-2">
                <AdminButton onClick={() => patch(exp.id, { is_active: !exp.is_active })}>
                  {exp.is_active ? "Deactivate" : "Activate"}
                </AdminButton>
                <AdminButton variant="danger" onClick={() => void remove(exp)}>Remove</AdminButton>
                <AdminButton variant="primary" onClick={() => void save(exp)}>Save</AdminButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminInput label="Name" value={exp.name} onChange={(v) => patch(exp.id, { name: v })} />
              <AdminInput
                label="Cover image URL"
                value={exp.image_url ?? ""}
                onChange={(v) => patch(exp.id, { image_url: v })}
                placeholder="/experiences/ps5.jpg"
              />
              <AdminInput
                label="Starting price (₹)"
                type="number"
                value={String(exp.starting_price)}
                onChange={(v) => patch(exp.id, { starting_price: Number(v) })}
              />
              <AdminInput
                label="Price unit"
                value={exp.price_unit}
                onChange={(v) => patch(exp.id, { price_unit: v })}
              />
              <AdminInput
                label="Display order"
                type="number"
                value={String(exp.sort_order)}
                onChange={(v) => patch(exp.id, { sort_order: Number(v) })}
              />
              <label className="block">
                <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Description
                </span>
                <textarea
                  value={exp.description}
                  onChange={(e) => patch(exp.id, { description: e.target.value })}
                  rows={3}
                  className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Available branches
              </p>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => {
                  const on = exp.branch_ids.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        patch(exp.id, {
                          branch_ids: on
                            ? exp.branch_ids.filter((x) => x !== b.id)
                            : [...exp.branch_ids, b.id],
                        })
                      }
                      className={
                        on
                          ? "rounded-full border border-cyan/50 bg-cyan/10 px-4 py-2 text-xs font-semibold text-cyan"
                          : "rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {b.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => patch(exp.id, { is_exclusive: !exp.is_exclusive })}
                  className={
                    exp.is_exclusive
                      ? "rounded-full border border-violet/50 bg-violet/10 px-4 py-2 text-xs font-semibold text-violet"
                      : "rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold text-muted-foreground"
                  }
                >
                  Exclusive badge
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
