import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel } from "./primitives";

interface MediaRow {
  key: string;
  label: string;
  media_type: "image" | "video" | "text";
  url: string | null;
}

/** Owner-managed site imagery: hero backdrop (image or video) and the food banner. */
export function SiteMediaPanel() {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("site_media")
      .select("key, label, media_type, url")
      .order("key")
      .then(({ data }) => {
        setRows((data ?? []) as unknown as MediaRow[]);
        setLoading(false);
      });
  }, []);

  const patch = (key: string, changes: Partial<MediaRow>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  const save = async (row: MediaRow) => {
    setBusy(row.key);
    const { error } = await supabase
      .from("site_media")
      .update({ media_type: row.media_type, url: row.url?.trim() || null })
      .eq("key", row.key);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Media updated — live on the website.");
  };

  if (loading) {
    return (
      <Panel title="Site images & video">
        <p className="text-sm text-muted-foreground">Loading media…</p>
      </Panel>
    );
  }

  return (
    <Panel title="Site images, video & player feedback">
      <p className="mb-4 text-xs text-muted-foreground">
        Update homepage media, Google rating details and the three Player Feedback reviews. Leave media
        links blank to use the built-in artwork.
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <li key={row.key} className="rounded-3xl border border-border bg-background/40 p-5">
            <p className="text-sm font-semibold">{row.label || row.key}</p>
            <div className="mt-3 space-y-3">
              {row.media_type === "text" ? (
                <AdminInput
                  label="Value"
                  value={row.url ?? ""}
                  onChange={(v) => patch(row.key, { url: v })}
                  placeholder="4.9"
                />
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Media type
                    </span>
                    <select
                      value={row.media_type}
                      onChange={(e) =>
                        patch(row.key, { media_type: e.target.value as MediaRow["media_type"] })
                      }
                      className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video (MP4 link)</option>
                    </select>
                  </label>
                  <AdminInput
                    label="Link"
                    value={row.url ?? ""}
                    onChange={(v) => patch(row.key, { url: v })}
                    placeholder="https://…/hero.mp4"
                  />
                  {row.url ? (
                    row.media_type === "video" ? (
                      <video
                        src={row.url}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="h-32 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <img
                        src={row.url}
                        alt={row.label}
                        loading="lazy"
                        className="h-32 w-full rounded-2xl object-cover"
                      />
                    )
                  ) : null}
                </>
              )}
            </div>
            <div className="mt-4">
              <AdminButton variant="primary" disabled={busy === row.key} onClick={() => void save(row)}>
                {busy === row.key ? "Saving…" : "Save"}
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
