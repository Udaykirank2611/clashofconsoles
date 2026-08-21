import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput } from "./primitives";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameRow {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Independent game library for a single console. */
export function StationGamesPanel({
  stationId,
  branchId,
  stationName,
}: {
  stationId: string;
  branchId: string;
  stationName: string;
}) {
  const [games, setGames] = useState<GameRow[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  /** Text being typed, kept local so a save round-trip never eats keystrokes. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("station_games")
      .select("id, name, image_url, sort_order, is_active")
      .eq("station_id", stationId)
      .order("sort_order");
    setGames((data ?? []) as GameRow[]);
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      for (const t of Object.values(timers.current)) window.clearTimeout(t);
    },
    [],
  );

  /** Types instantly, saves ~600ms after the admin stops typing. */
  const typeField = (id: string, field: "name" | "image_url", value: string) => {
    const key = `${id}:${field}`;
    setDrafts((d) => ({ ...d, [key]: value }));
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      const payload =
        field === "name" ? { name: value.trim() } : { image_url: value.trim() || null };
      if (field === "name" && !value.trim()) return;
      const { error } = await supabase.from("station_games").update(payload).eq("id", id);
      if (error) toast.error("Could not save this change.");
      setGames((rows) => rows.map((r) => (r.id === id ? { ...r, ...payload } : r)));
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
    }, 600) as unknown as number;
  };

  const add = async () => {
    const clean = name.trim();
    if (!clean) {
      toast.error("Give the game a name first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("station_games").insert({
      station_id: stationId,
      branch_id: branchId,
      name: clean,
      image_url: image.trim() || null,
      sort_order: (games.at(-1)?.sort_order ?? 0) + 1,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add this game.");
      return;
    }
    setName("");
    setImage("");
    toast.success(`${clean} added to ${stationName}.`);
    void load();
  };

  const patch = async (id: string, payload: Partial<GameRow>) => {
    const { error } = await supabase.from("station_games").update(payload).eq("id", id);
    if (error) toast.error("Could not save this change.");
    void load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = games[index];
    const b = games[index + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("station_games").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("station_games").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    void load();
  };

  const remove = async (g: GameRow) => {
    const { error } = await supabase.from("station_games").delete().eq("id", g.id);
    if (error) {
      toast.error("Could not remove this game.");
      return;
    }
    toast.success(`${g.name} removed.`);
    void load();
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        Games on {stationName} ({games.length})
      </p>

      <div className="mt-3 space-y-2">
        {games.map((g, i) => (
          <div
            key={g.id}
            className={cn(
              "grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_auto]",
              !g.is_active && "opacity-50",
            )}
          >
            <AdminInput
              label="Name"
              value={drafts[`${g.id}:name`] ?? g.name}
              onChange={(v) => typeField(g.id, "name", v)}
            />
            <AdminInput
              label="Image link"
              value={drafts[`${g.id}:image_url`] ?? g.image_url ?? ""}
              onChange={(v) => typeField(g.id, "image_url", v)}
              placeholder="https://…"
            />
            <div className="flex items-end gap-1.5">
              <AdminButton variant="ghost" onClick={() => void move(i, -1)}>
                <ArrowUp className="size-3.5" />
                <span className="sr-only">Move up</span>
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => void move(i, 1)}>
                <ArrowDown className="size-3.5" />
                <span className="sr-only">Move down</span>
              </AdminButton>
              <AdminButton
                variant={g.is_active ? "primary" : "ghost"}
                onClick={() => void patch(g.id, { is_active: !g.is_active })}
              >
                {g.is_active ? "Active" : "Hidden"}
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => void remove(g)}>
                <Trash2 className="size-3.5" />
                <span className="sr-only">Remove game</span>
              </AdminButton>
            </div>
          </div>
        ))}
        {!games.length ? (
          <p className="text-xs text-muted-foreground">No games yet — add the first one below.</p>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <AdminInput label="New game" value={name} onChange={setName} placeholder="EA FC 25" />
        <AdminInput label="Image link" value={image} onChange={setImage} placeholder="https://…" />
        <div className="flex items-end">
          <AdminButton variant="primary" disabled={busy} onClick={() => void add()}>
            <Plus className="size-3.5" /> Add game
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
