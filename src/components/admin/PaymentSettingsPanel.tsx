import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel } from "./primitives";

interface PaymentForm {
  upi_id: string;
  account_name: string;
  qr_image_url: string;
  instructions: string;
  expiry_minutes: string;
}

const EMPTY: PaymentForm = {
  upi_id: "",
  account_name: "",
  qr_image_url: "",
  instructions:
    "Scan the QR code with any UPI app and pay the exact amount. Then enter your UTR / transaction number below so our team can verify it.",
  expiry_minutes: "10",
};

/** Branch-scoped manual UPI payment settings shown on the customer payment page. */
export function PaymentSettingsPanel({ branchId }: { branchId: string }) {
  const [form, setForm] = useState<PaymentForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void supabase
      .from("payment_settings")
      .select("upi_id, account_name, qr_image_url, instructions, expiry_minutes")
      .eq("branch_id", branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setForm({
            upi_id: data.upi_id ?? "",
            account_name: data.account_name ?? "",
            qr_image_url: data.qr_image_url ?? "",
            instructions: data.instructions ?? EMPTY.instructions,
            expiry_minutes: String(data.expiry_minutes ?? 10),
          });
        } else {
          setForm(EMPTY);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [branchId]);

  const set = (key: keyof PaymentForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  /** Read + downscale the chosen QR image into an inline data URL (no links needed). */
  const pickQr = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error("Upload a PNG, JPG, JPEG or WEBP image.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode"));
        el.src = dataUrl;
      });
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      const out = ctx
        ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height), canvas.toDataURL("image/png"))
        : dataUrl;
      setForm((f) => ({ ...f, qr_image_url: out }));
      toast.success("QR image ready — save settings to publish it.");
    } catch {
      toast.error("Could not read that image. Try another file.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.upi_id.trim()) {
      toast.error("Enter the UPI ID customers should pay to.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("payment_settings").upsert(
      {
        branch_id: branchId,
        upi_id: form.upi_id.trim(),
        account_name: form.account_name.trim() || "Clash of Consoles",
        qr_image_url: form.qr_image_url.trim() || null,
        instructions: form.instructions.trim() || EMPTY.instructions,
        expiry_minutes: Math.max(1, Number(form.expiry_minutes) || 10),
      },
      { onConflict: "branch_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Could not save the payment settings.");
      return;
    }
    toast.success("Payment settings updated — live on the payment page.");
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading payment settings…</p>;
  }

  return (
    <Panel
      title="Payment settings"
      action={
        <AdminButton variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save settings"}
        </AdminButton>
      }
    >
      <p className="mb-5 text-xs text-muted-foreground">
        Customers pay manually over UPI and submit a UTR number. These details appear on the payment
        page for this branch.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput label="UPI ID" value={form.upi_id} onChange={set("upi_id")} />
        <AdminInput label="Account name" value={form.account_name} onChange={set("account_name")} />
        <AdminInput
          label="Payment expiry (minutes)"
          value={form.expiry_minutes}
          onChange={set("expiry_minutes")}
        />
      </div>

      <div className="mt-4">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          UPI QR code image
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-cyan/40 bg-cyan/10 px-5 py-2.5 text-xs font-bold text-cyan transition-transform hover:scale-[1.03]">
            {uploading ? "Processing…" : form.qr_image_url ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void pickQr(file);
              }}
            />
          </label>
          {form.qr_image_url ? (
            <AdminButton onClick={() => set("qr_image_url")("")}>Remove image</AdminButton>
          ) : null}
          <span className="text-xs text-muted-foreground">PNG, JPG, JPEG or WEBP</span>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Instructions
        </span>
        <textarea
          value={form.instructions}
          onChange={(e) => set("instructions")(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors focus:border-cyan/60"
        />
      </label>

      {form.qr_image_url ? (
        <div className="mt-5">
          <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            QR preview
          </p>
          <img
            src={form.qr_image_url}
            alt="UPI QR code preview"
            className="size-40 rounded-2xl border border-border bg-background/60 object-contain p-2"
          />
        </div>
      ) : null}
    </Panel>
  );
}
