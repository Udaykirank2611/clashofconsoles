import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel } from "./primitives";
import {
  DEFAULT_TEMPLATE,
  LOYALTY_KEYS,
  LOYALTY_PLACEHOLDERS,
  PLACEHOLDERS,
  TEMPLATE_HINT,
  TEMPLATE_LABEL,
  type TemplateKey,
} from "@/lib/message-templates";

const BOOKING_KEYS: TemplateKey[] = ["booking_placed", "booking_confirmed"];
const KEYS: TemplateKey[] = [...BOOKING_KEYS, ...LOYALTY_KEYS];

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

      {BOOKING_KEYS.map((key) => (
        <Editor
          key={key}
          templateKey={key}
          rows={key === "booking_confirmed" ? 8 : 10}
          value={bodies[key] ?? ""}
          saving={saving === key}
          onChange={(v) => setBodies((prev) => ({ ...prev, [key]: v }))}
          onReset={() => setBodies((prev) => ({ ...prev, [key]: DEFAULT_TEMPLATE[key] }))}
          onSave={() => void save(key)}
        />
      ))}

      <Panel title="Loyalty thank-you messages">
        <p className="text-xs text-muted-foreground">
          One message per visit count — these appear beside each customer in the Customers tab and
          are pre-filled into the WhatsApp chat.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOYALTY_PLACEHOLDERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[0.7rem] font-semibold"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-mono">{"{left}"}</span> is the number of visits still needed for the
          next free-gaming milestone, and <span className="font-mono">{"{reward}"}</span> is the
          reward the customer has waiting.
        </p>
      </Panel>

      {LOYALTY_KEYS.map((key) => (
        <Editor
          key={key}
          templateKey={key}
          rows={4}
          value={bodies[key] ?? ""}
          saving={saving === key}
          onChange={(v) => setBodies((prev) => ({ ...prev, [key]: v }))}
          onReset={() => setBodies((prev) => ({ ...prev, [key]: DEFAULT_TEMPLATE[key] }))}
          onSave={() => void save(key)}
        />
      ))}
    </div>
  );
}
