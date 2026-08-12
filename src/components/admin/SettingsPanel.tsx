import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel } from "./primitives";

interface BranchSettings {
  name: string;
  address: string;
  city: string;
  phone: string;
  opens_at: string;
  closes_at: string;
  slot_minutes: string;
  tax_percent: string;
  map_url: string;
}

const EMPTY: BranchSettings = {
  name: "",
  address: "",
  city: "",
  phone: "",
  opens_at: "10:00",
  closes_at: "23:00",
  slot_minutes: "30",
  tax_percent: "5",
  map_url: "",
};

export function SettingsPanel({ branchId }: { branchId: string }) {
  const [form, setForm] = useState<BranchSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase
      .from("branches")
      .select("name, address, city, phone, opens_at, closes_at, slot_minutes, tax_percent, map_url")
      .eq("id", branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setForm({
          name: data.name ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          phone: data.phone ?? "",
          opens_at: String(data.opens_at).slice(0, 5),
          closes_at: String(data.closes_at).slice(0, 5),
          slot_minutes: String(data.slot_minutes ?? 30),
          tax_percent: String(data.tax_percent ?? 0),
          map_url: (data as { map_url?: string | null }).map_url ?? "",
        });
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [branchId]);

  const set = (key: keyof BranchSettings) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    if (form.opens_at >= form.closes_at) {
      toast.error("Closing time must be after opening time.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("branches")
      .update({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phone: form.phone.trim() || null,
        opens_at: `${form.opens_at}:00`,
        closes_at: `${form.closes_at}:00`,
        slot_minutes: Number(form.slot_minutes) || 30,
        tax_percent: Number(form.tax_percent) || 0,
        map_url: form.map_url.trim() || null,
      })
      .eq("id", branchId);
    setSaving(false);
    if (error) {
      toast.error("Could not save these settings.");
      return;
    }
    toast.success("Branch settings updated — live on the website.");
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <Panel
      title="Branch settings"
      action={
        <AdminButton variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save settings"}
        </AdminButton>
      }
    >
      <p className="mb-5 text-xs text-muted-foreground">
        Business hours control which start times customers can pick. Bookings can never start before
        opening or run past closing.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput label="Branch name" value={form.name} onChange={set("name")} />
        <AdminInput label="Phone" value={form.phone} onChange={set("phone")} />
        <AdminInput label="Address" value={form.address} onChange={set("address")} className="sm:col-span-2" />
        <AdminInput label="City" value={form.city} onChange={set("city")} />
        <AdminInput label="Tax (%)" value={form.tax_percent} onChange={set("tax_percent")} />
        <AdminInput label="Opens at" value={form.opens_at} onChange={set("opens_at")} type="time" />
        <AdminInput label="Closes at" value={form.closes_at} onChange={set("closes_at")} type="time" />
        <AdminInput
          label="Google Maps link"
          value={form.map_url}
          onChange={set("map_url")}
          className="sm:col-span-2"
        />
        <AdminInput label="Slot size (minutes)" value={form.slot_minutes} onChange={set("slot_minutes")} />
      </div>
    </Panel>
  );
}
