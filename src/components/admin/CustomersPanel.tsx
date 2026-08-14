import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Gift, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { listCustomers } from "@/lib/admin.functions";
import { rewardLabel } from "@/lib/loyalty.functions";
import { loyaltyMessage, whatsappLink } from "@/lib/loyalty-messages";
import { Panel } from "./primitives";


/** Read-only loyalty roster: name, phone, visits and available rewards. */
export function CustomersPanel() {
  const fn = useServerFn(listCustomers);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  return (
    <Panel title="Customers">
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading customers…</p>
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
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
              </div>
              <span className="text-xs text-muted-foreground">
                <strong className="text-sm font-black text-foreground">{c.totalVisits}</strong> completed
                visits
              </span>
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
  const message = loyaltyMessage({ name, visits, rewardAvailable, rewardMinutes });

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

