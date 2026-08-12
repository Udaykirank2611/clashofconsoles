import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import { toast } from "sonner";
import type { MembershipPlan, SiteOffer } from "@/lib/site-content";

/** Memberships, unlimited pass, combo and student offers — for this branch only. */
export function OffersPanel({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [pass, setPass] = useState<SiteOffer | null>(null);
  const [student, setStudent] = useState<SiteOffer | null>(null);
  const [combo, setCombo] = useState<SiteOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [p, o] = await Promise.all([
      supabase.from("membership_plans").select("*").eq("branch_id", branchId).order("sort_order"),
      supabase.from("site_offers").select("*").eq("branch_id", branchId),
    ]);
    setPlans((p.data ?? []) as unknown as MembershipPlan[]);
    const offers = (o.data ?? []) as unknown as SiteOffer[];
    setPass(offers.find((x) => x.id === "unlimited_pass") ?? null);
    setStudent(offers.find((x) => x.id === "student_offer") ?? null);
    setCombo(offers.find((x) => x.id === "combo_offer") ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);


  const patchPlan = (id: string, changes: Partial<MembershipPlan>) =>
    setPlans((r) => r.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  const savePlan = async (plan: MembershipPlan) => {
    const { error } = await supabase
      .from("membership_plans")
      .update({
        name: plan.name,
        hours_included: Number(plan.hours_included) || 0,
        price: Number(plan.price) || 0,
        validity: plan.validity,
        badge: plan.badge,
        perks: plan.perks,
        is_popular: plan.is_popular,
        is_visible: plan.is_visible,
        sort_order: Number(plan.sort_order) || 0,
      })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
    else toast.success(`${plan.name} plan updated`);
  };

  const saveOffer = async (offer: SiteOffer, label: string) => {
    const { error } = await supabase
      .from("site_offers")
      .update({
        title: offer.title,
        subtitle: offer.subtitle,
        price: Number(offer.price) || 0,
        validity: offer.validity,
        features: offer.features,
        discount_percent: Number(offer.discount_percent) || 0,
        min_bill: Number(offer.min_bill) || 0,
        offer_text: offer.offer_text,
        is_visible: offer.is_visible,
      })
      .eq("branch_id", branchId)
      .eq("id", offer.id);
    if (error) toast.error(error.message);
    else toast.success(`${label} updated`);
  };

  if (loading) return <Panel><p className="text-sm text-muted-foreground">Loading offers…</p></Panel>;

  return (
    <div className="space-y-6">
      <Panel title={`Membership plans · ${branchName}`}>
        <ul className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-3xl border border-border bg-background/40 p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{plan.name}</h3>
                <Pill tone={plan.is_visible ? "good" : "muted"}>{plan.is_visible ? "Visible" : "Hidden"}</Pill>
              </div>
              <div className="space-y-3">
                <AdminInput label="Name" value={plan.name} onChange={(v) => patchPlan(plan.id, { name: v })} />
                <AdminInput
                  label="Hours included"
                  type="number"
                  value={String(plan.hours_included)}
                  onChange={(v) => patchPlan(plan.id, { hours_included: Number(v) })}
                />
                <AdminInput
                  label="Price (₹)"
                  type="number"
                  value={String(plan.price)}
                  onChange={(v) => patchPlan(plan.id, { price: Number(v) })}
                />
                <AdminInput
                  label="Validity"
                  value={plan.validity}
                  onChange={(v) => patchPlan(plan.id, { validity: v })}
                />
                <AdminInput
                  label="Badge (e.g. Best Value)"
                  value={plan.badge ?? ""}
                  onChange={(v) => patchPlan(plan.id, { badge: v })}
                />
                <AdminInput
                  label="Perks (comma separated)"
                  value={plan.perks.join(", ")}
                  onChange={(v) =>
                    patchPlan(plan.id, { perks: v.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton onClick={() => patchPlan(plan.id, { is_popular: !plan.is_popular })}>
                  {plan.is_popular ? "Popular ✓" : "Mark popular"}
                </AdminButton>
                <AdminButton onClick={() => patchPlan(plan.id, { is_visible: !plan.is_visible })}>
                  {plan.is_visible ? "Hide" : "Show"}
                </AdminButton>
                <AdminButton variant="primary" onClick={() => void savePlan(plan)}>Save</AdminButton>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {pass ? (
        <Panel
          title={`Unlimited pass · ${branchName}`}
          action={
            <div className="flex gap-2">
              <AdminButton onClick={() => setPass({ ...pass, is_visible: !pass.is_visible })}>
                {pass.is_visible ? "Visible" : "Hidden"}
              </AdminButton>
              <AdminButton variant="primary" onClick={() => void saveOffer(pass, "Unlimited pass")}>Save</AdminButton>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput label="Title" value={pass.title} onChange={(v) => setPass({ ...pass, title: v })} />
            <AdminInput label="Subtitle" value={pass.subtitle} onChange={(v) => setPass({ ...pass, subtitle: v })} />
            <AdminInput
              label="Price (₹)"
              type="number"
              value={String(pass.price)}
              onChange={(v) => setPass({ ...pass, price: Number(v) })}
            />
            <AdminInput label="Validity" value={pass.validity} onChange={(v) => setPass({ ...pass, validity: v })} />
            <AdminInput
              className="sm:col-span-2"
              label="Features (comma separated)"
              value={pass.features.join(", ")}
              onChange={(v) =>
                setPass({ ...pass, features: v.split(",").map((s) => s.trim()).filter(Boolean) })
              }
            />
          </div>
        </Panel>
      ) : null}

      {combo ? (
        <Panel
          title={`Combo offer · ${branchName}`}
          action={
            <div className="flex gap-2">
              <AdminButton onClick={() => setCombo({ ...combo, is_visible: !combo.is_visible })}>
                {combo.is_visible ? "Visible" : "Hidden"}
              </AdminButton>
              <AdminButton variant="primary" onClick={() => void saveOffer(combo, "Combo offer")}>Save</AdminButton>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput label="Name" value={combo.title} onChange={(v) => setCombo({ ...combo, title: v })} />
            <AdminInput
              label="Price (₹)"
              type="number"
              value={String(combo.price)}
              onChange={(v) => setCombo({ ...combo, price: Number(v) })}
            />
            <AdminInput
              className="sm:col-span-2"
              label="Experiences included (comma separated)"
              value={combo.features.join(", ")}
              onChange={(v) =>
                setCombo({ ...combo, features: v.split(",").map((s) => s.trim()).filter(Boolean) })
              }
            />
            <AdminInput label="Subtitle" value={combo.subtitle} onChange={(v) => setCombo({ ...combo, subtitle: v })} />
            <AdminInput label="Validity note" value={combo.validity} onChange={(v) => setCombo({ ...combo, validity: v })} />
            <AdminInput
              className="sm:col-span-2"
              label="Offer text"
              value={combo.offer_text}
              onChange={(v) => setCombo({ ...combo, offer_text: v })}
            />
          </div>
        </Panel>
      ) : null}

      {student ? (
        <Panel
          title={`Student offer · ${branchName}`}
          action={
            <div className="flex gap-2">
              <AdminButton onClick={() => setStudent({ ...student, is_visible: !student.is_visible })}>
                {student.is_visible ? "Enabled" : "Disabled"}
              </AdminButton>
              <AdminButton variant="primary" onClick={() => void saveOffer(student, "Student offer")}>Save</AdminButton>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              label="Discount %"
              type="number"
              value={String(student.discount_percent)}
              onChange={(v) => setStudent({ ...student, discount_percent: Number(v) })}
            />
            <AdminInput
              label="Minimum bill (₹)"
              type="number"
              value={String(student.min_bill)}
              onChange={(v) => setStudent({ ...student, min_bill: Number(v) })}
            />
            <AdminInput
              className="sm:col-span-2"
              label="Fine print / conditions"
              value={student.subtitle}
              onChange={(v) => setStudent({ ...student, subtitle: v })}
            />
            <AdminInput
              className="sm:col-span-2"
              label="Offer text"
              value={student.offer_text}
              onChange={(v) => setStudent({ ...student, offer_text: v })}
            />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
