import { useCallback, useEffect, useState } from "react";
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
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/60">
        Games on {stationName} ({games.length})
      </p>

      <div className="mt-3 space-y-2">
        {games.map((g, i) => (
          <div
            key={g.id}
            className={cn(
              "grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_1fr_auto]",
              !g.is_active && "opacity-50",
            )}
          >
            <AdminInput label="Name" value={g.name} onChange={(v) => void patch(g.id, { name: v })} />
            <AdminInput
              label="Image link"
              value={g.image_url ?? ""}
              onChange={(v) => void patch(g.id, { image_url: v.trim() || null })}
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
          <p className="text-xs text-white/50">No games yet — add the first one below.</p>
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
