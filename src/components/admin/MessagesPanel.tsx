import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel } from "./primitives";
import {
  DEFAULT_TEMPLATE,
  PLACEHOLDERS,
  TEMPLATE_HINT,
  TEMPLATE_LABEL,
  type TemplateKey,
} from "@/lib/message-templates";

const KEYS: TemplateKey[] = ["booking_placed", "booking_confirmed"];

/** Lets the branch team edit the two automated customer messages. */
export function MessagesPanel({ branchId }: { branchId: string }) {
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TemplateKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_templates")
      .select("template_key, body")
      .eq("branch_id", branchId);
    const next: Record<string, string> = {};
    for (const row of (data ?? []) as { template_key: string; body: string }[]) {
      next[row.template_key] = row.body;
    }
    for (const key of KEYS) next[key] = next[key] || DEFAULT_TEMPLATE[key];
    setBodies(next);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (key: TemplateKey) => {
    setSaving(key);
    const { error } = await supabase
      .from("message_templates")
      .upsert(
        { branch_id: branchId, template_key: key, body: bodies[key] ?? "" },
        { onConflict: "branch_id,template_key" },
      );
    setSaving(null);
    if (error) {
      toast.error("Could not save this message.");
      return;
    }
    toast.success("Message template saved.");
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading messages…</p>;
  }

  return (
    <div className="space-y-6">
      <Panel title="Automated customer messages">
        <p className="text-xs text-muted-foreground">
          These are the WhatsApp messages your team sends to guests. Edit the wording freely and use
          the placeholders below — they are replaced with each booking&apos;s real details.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLACEHOLDERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[0.7rem] font-semibold"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-mono">{"{details}"}</span> inserts the full auto-generated breakdown
          (booking ID, timings, items, passes, discounts and the amount).
        </p>
      </Panel>

      {KEYS.map((key) => (
        <Panel
          key={key}
          title={TEMPLATE_LABEL[key]}
          action={
            <div className="flex gap-2">
              <AdminButton
                onClick={() => setBodies((prev) => ({ ...prev, [key]: DEFAULT_TEMPLATE[key] }))}
              >
                Reset
              </AdminButton>
              <AdminButton variant="primary" disabled={saving === key} onClick={() => void save(key)}>
                {saving === key ? "Saving…" : "Save"}
              </AdminButton>
            </div>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{TEMPLATE_HINT[key]}</p>
          <textarea
            value={bodies[key] ?? ""}
            onChange={(e) => setBodies((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={key === "booking_confirmed" ? 8 : 10}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary"
          />
        </Panel>
      ))}
    </div>
  );
}
