import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminMenuItem } from "@/lib/admin/useBranchData";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Veg", "Non-Veg", "Lassi", "Fresh Juices", "Milkshakes", "Mocktails"];

/** Menu for the signed-in branch only. Text and price only — no images anywhere. */
export function MenuPanel({
  menu,
  branchId,
  branchName,
  onBack,
  onChanged,
}: {
  menu: AdminMenuItem[];
  branchId: string;
  branchName: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setName("");
    setCategory(CATEGORIES[0]!);
    setPrice("");
  };

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setAdding((v) => !v);
  };

  const openEdit = (item: AdminMenuItem) => {
    setAdding(false);
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setPrice(String(Math.round(Number(item.price))));
  };

  const save = async () => {
    if (name.trim().length < 2) {
      toast.error("Give the item a name.");
      return;
    }
    const payload = {
      name: name.trim(),
      category: category.trim() || CATEGORIES[0]!,
      price: Number(price) || 0,
    };
    setBusy(editingId ?? "new");
    const { error } = editingId
      ? await supabase.from("menu_items").update(payload).eq("id", editingId)
      : await supabase.from("menu_items").insert({
          ...payload,
          branch_id: branchId,
          sort_order: menu.length + 1,
        });
    setBusy(null);
    if (error) {
      toast.error(editingId ? "Could not save this item." : "Could not add this item.");
      return;
    }
    setAdding(false);
    setEditingId(null);
    resetForm();
    toast.success(editingId ? "Item updated." : "Menu item added.");
    onChanged();
  };

  const patch = async (
    item: AdminMenuItem,
    values: { is_available?: boolean; sort_order?: number },
    message?: string,
  ) => {
    setBusy(item.id);
    const { error } = await supabase.from("menu_items").update(values).eq("id", item.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update this item.");
      return;
    }
    if (message) toast.success(message);
    onChanged();
  };

  const move = async (item: AdminMenuItem, dir: -1 | 1) => {
    const ordered = [...menu].sort((a, b) => a.sort_order - b.sort_order);
    const i = ordered.findIndex((m) => m.id === item.id);
    const swap = ordered[i + dir];
    if (!swap) return;
    setBusy(item.id);
    await Promise.all([
      supabase.from("menu_items").update({ sort_order: swap.sort_order }).eq("id", item.id),
      supabase.from("menu_items").update({ sort_order: item.sort_order }).eq("id", swap.id),
    ]);
    setBusy(null);
    onChanged();
  };

  const duplicate = async (item: AdminMenuItem) => {
    setBusy(item.id);
    const { error } = await supabase.from("menu_items").insert({
      name: `${item.name} (copy)`,
      category: item.category,
      price: item.price,
      branch_id: branchId,
      is_available: item.is_available,
      sort_order: menu.length + 1,
    });
    setBusy(null);
    if (error) {
      toast.error("Could not duplicate this item.");
      return;
    }
    toast.success("Item duplicated.");
    onChanged();
  };

  const remove = async (item: AdminMenuItem) => {
    if (!window.confirm(`Remove ${item.name} from the menu?`)) return;
    setBusy(item.id);
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
    setBusy(null);
    if (error) {
      toast.error("Could not remove this item", {
        description: "It appears in existing orders — disable it instead.",
      });
      return;
    }
    toast.success("Item removed.");
    onChanged();
  };

  const formOpen = adding || editingId !== null;
  const ordered = [...menu].sort((a, b) => a.sort_order - b.sort_order);
  const groups = ordered.reduce<Record<string, AdminMenuItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <AdminButton onClick={onBack}>
        <ArrowLeft className="size-3.5" /> Back to Dashboard
      </AdminButton>

      <Panel
        title={`Food & drinks · ${branchName}`}
        action={
          <AdminButton variant="primary" onClick={openAdd}>
            <Plus className="size-3.5" /> {adding ? "Cancel" : "Add item"}
          </AdminButton>
        }
      >
        <p className="mb-4 text-xs text-muted-foreground">
          This menu and its prices belong to {branchName} only. Category artwork for the home page is
          managed separately under Home page → Menu categories.
        </p>

        {formOpen ? (
          <div className="mb-5 grid gap-3 rounded-3xl border border-cyan/25 bg-cyan/5 p-4 sm:grid-cols-3">
            <AdminInput label="Name" value={name} onChange={setName} placeholder="Peri peri fries" />
            <label className="block">
              <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
              >
                {[...new Set([...CATEGORIES, ...Object.keys(groups)])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <AdminInput label="Price (₹)" value={price} onChange={(v) => setPrice(v.replace(/[^0-9]/g, ""))} />
            <div className="flex items-end gap-2 sm:col-span-3">
              <AdminButton
                variant="primary"
                disabled={busy === (editingId ?? "new")}
                onClick={() => void save()}
                className="flex-1 py-3"
              >
                {busy === (editingId ?? "new") ? "Saving…" : editingId ? "Save changes" : "Save item"}
              </AdminButton>
              {editingId ? (
                <AdminButton
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                  }}
                  className="py-3"
                >
                  Cancel
                </AdminButton>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-8">
          {Object.entries(groups).map(([cat, items]) => (
            <section key={cat}>
              <h3 className="mb-3 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-cyan">
                {cat} · {items.length} items
              </h3>
              <ul className="divide-y divide-border/60 rounded-3xl border border-border bg-surface/40">
                {items.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</span>
                    <span className="text-sm font-black">₹{Math.round(Number(m.price))}</span>
                    <Pill tone={m.is_available ? "good" : "muted"}>
                      {m.is_available ? "Active" : "Inactive"}
                    </Pill>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminButton disabled={busy === m.id} onClick={() => openEdit(m)}>
                        <Pencil className="size-3.5" /> Edit
                      </AdminButton>
                      <AdminButton
                        disabled={busy === m.id}
                        onClick={() =>
                          void patch(
                            m,
                            { is_available: !m.is_available },
                            m.is_available ? "Item disabled." : "Item enabled.",
                          )
                        }
                      >
                        {m.is_available ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {m.is_available ? "Disable" : "Enable"}
                      </AdminButton>
                      <AdminButton disabled={busy === m.id} onClick={() => void duplicate(m)}>
                        <Copy className="size-3.5" />
                      </AdminButton>
                      <AdminButton disabled={busy === m.id} onClick={() => void move(m, -1)}>
                        <ArrowUp className="size-3.5" />
                      </AdminButton>
                      <AdminButton disabled={busy === m.id} onClick={() => void move(m, 1)}>
                        <ArrowDown className="size-3.5" />
                      </AdminButton>
                      <AdminButton variant="danger" disabled={busy === m.id} onClick={() => void remove(m)}>
                        <Trash2 className="size-3.5" />
                      </AdminButton>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {!menu.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No menu items yet.</p>
        ) : null}
      </Panel>
    </div>
  );
}
