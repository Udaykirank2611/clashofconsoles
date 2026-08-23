import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Gift, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { listCustomers, updateCustomerVisits } from "@/lib/admin.functions";
import { rewardLabel } from "@/lib/loyalty.functions";
import { loyaltyMessage, loyaltyTemplateKey, whatsappLink } from "@/lib/loyalty-messages";
import { useMessageTemplates } from "@/lib/message-templates";
import { AdminButton, Panel } from "./primitives";


/** Loyalty roster: name, phone, editable visit count and available rewards. */
export function CustomersPanel() {
  const fn = useServerFn(listCustomers);
  const [sortBy, setSortBy] = useState<"latest" | "visits">("latest");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  const rows = [...data].sort((a, b) =>
    sortBy === "visits"
      ? b.totalVisits - a.totalVisits ||
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      : (b.createdAt ?? b.lastActivityDate ?? "").localeCompare(
          a.createdAt ?? a.lastActivityDate ?? "",
        ),
  );


  return (
    <Panel
      title="Customers"
      action={
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "visits")}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary"
          >
            <option value="latest">Latest first</option>
            <option value="visits">Most visits</option>
          </select>
        </label>
      }
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading customers…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div
              key={c.phone}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <a
                  href={`tel:${c.phone}`}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan"
                >
                  <Phone className="size-3" /> {c.phone}
                </a>
                <ActivityLine c={c} />
              </div>

              <VisitsEditor phone={c.phone} visits={c.totalVisits} />
              {c.rewardStatus === "available" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <Gift className="size-3" />
                  {rewardLabel(c.rewardMinutes ?? 30)}
                  <span className="font-medium normal-case tracking-normal text-muted-foreground">
                    Available · expires at {c.rewardExpiresAtVisit}th visit
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Gift className="size-3" /> No active reward
                </span>
              )}
              <ThankYouActions
                name={c.name}
                phone={c.phone}
                visits={c.totalVisits}
                rewardAvailable={c.rewardStatus === "available"}
                rewardMinutes={c.rewardMinutes ?? null}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Inline editor for a customer's completed-visit count (level). */
function VisitsEditor({ phone, visits }: { phone: string; visits: number }) {
  const [value, setValue] = useState(String(visits));
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateCustomerVisits);
  const queryClient = useQueryClient();
  const dirty = String(visits) !== value.trim();

  const save = async () => {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0) {
      toast.error("Enter a whole number of visits");
      return;
    }
    setSaving(true);
    const res = await update({ data: { phone, totalVisits: next } });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not update visits");
      return;
    }
    toast.success("Visits updated");
    await queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Completed visits"
        className="w-16 rounded-xl border border-border bg-surface px-2 py-1 text-center text-sm font-black outline-none focus:border-primary"
      />
      <span className="text-xs text-muted-foreground">visits</span>
      {dirty ? (
        <AdminButton variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Update"}
        </AdminButton>
      ) : null}
    </div>
  );
}

function ThankYouActions({
  name,
  phone,
  visits,
  rewardAvailable,
  rewardMinutes,
}: {
  name: string;
  phone: string;
  visits: number;
  rewardAvailable: boolean;
  rewardMinutes: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const { anyTemplate } = useMessageTemplates();
  const message = loyaltyMessage({
    name,
    visits,
    rewardAvailable,
    rewardMinutes,
    body: anyTemplate(loyaltyTemplateKey(visits, rewardAvailable)),
  });


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Thank you message copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the message");
    }
  };

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <button
        type="button"
        onClick={() => void copy()}
        title={message}
        className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-left text-[0.68rem] text-muted-foreground transition-colors hover:border-cyan/50 hover:text-foreground sm:flex-none sm:max-w-[16rem]"
      >
        {copied ? (
          <Check className="size-3.5 shrink-0 text-emerald-300" />
        ) : (
          <Copy className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{message}</span>
      </button>
      <a
        href={whatsappLink(phone, message)}
        target="_blank"
        rel="noreferrer"
        title="Open WhatsApp chat"
        aria-label={`Open WhatsApp chat with ${name}`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 transition-colors hover:bg-emerald-400/20"
      >
        <MessageCircle className="size-4" />
      </a>
    </div>
  );
}

