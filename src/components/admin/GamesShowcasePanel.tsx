import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel } from "./primitives";
import {
  SECTION_ACCENTS,
  useGameShowcase,
  type GameSection,
  type GameSectionItem,
} from "@/lib/game-showcase";
import { cn } from "@/lib/utils";

const box =
  "w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-xs outline-none focus:border-pink/60";

/**
 * Curated games shown on the public /games page — sections like "Top 10" with
 * the titles inside them. Independent of station game libraries.
 */
export function GamesShowcasePanel() {
  const { sections, loading, refresh } = useGameShowcase({ includeHidden: true });
  const [busy, setBusy] = useState(false);

  const addSection = async () => {
    setBusy(true);
    const { error } = await supabase.from("game_sections").insert({
      title: "New section",
      subtitle: "",
      accent: "pink",
      sort_order: sections.length + 1,
    } as never);
    setBusy(false);
    if (error) { toast.error("Could not add the section."); return; }
    toast.success("Section added.");
    void refresh();
  };

  if (loading) {
    return (
      <Panel>
        <p className="py-10 text-center text-sm text-muted-foreground">Loading games showcase…</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Games showcase"
        action={
          <AdminButton variant="primary" onClick={() => void addSection()} disabled={busy}>
            <Plus className="size-3.5" /> Add section
          </AdminButton>
        }
      >
        <p className="text-xs text-muted-foreground">
          These sections power the public <strong>Games</strong> page only — they are separate from
          the game lists attached to each station. Reorder with the sort number; hide a section to
          take it off the site without deleting it.
        </p>
      </Panel>

      {sections.map((section) => (
        <SectionEditor key={section.id} section={section} onChanged={refresh} />
      ))}

      {!sections.length ? (
        <Panel>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sections yet — add one to start curating the games page.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

function SectionEditor({ section, onChanged }: { section: GameSection; onChanged: () => void }) {
  const [draft, setDraft] = useState({
    title: section.title,
    subtitle: section.subtitle,
    accent: section.accent,
    sort_order: section.sort_order,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("game_sections")
      .update({ ...draft, sort_order: Number(draft.sort_order) || 0 } as never)
      .eq("id", section.id);
    setSaving(false);
    if (error) { toast.error("Could not save the section."); return; }
    toast.success("Section saved.");
    onChanged();
  };

  const toggle = async () => {
    const { error } = await supabase
      .from("game_sections")
      .update({ is_active: !section.is_active } as never)
      .eq("id", section.id);
    if (error) { toast.error("Could not update visibility."); return; }
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${section.title}" and all its games?`)) return;
    const { error } = await supabase.from("game_sections").delete().eq("id", section.id);
    if (error) { toast.error("Could not delete the section."); return; }
    toast.success("Section deleted.");
    onChanged();
  };

  const addGame = async () => {
    const { error } = await supabase.from("game_section_items").insert({
      section_id: section.id,
      name: "New game",
      platform: "PS5",
      badge: "",
      sort_order: section.items.length + 1,
    } as never);
    if (error) { toast.error("Could not add the game."); return; }
    onChanged();
  };

  return (
    <Panel
      className={cn(!section.is_active && "opacity-60")}
      title={section.title || "Untitled section"}
      action={
        <div className="flex items-center gap-1.5">
          <AdminButton onClick={() => void toggle()}>
            {section.is_active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {section.is_active ? "Visible" : "Hidden"}
          </AdminButton>
          <AdminButton onClick={() => void remove()}>
            <Trash2 className="size-3.5" />
          </AdminButton>
        </div>
      }
    >
      <div className="grid gap-2 sm:grid-cols-8">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Section title"
          className={cn(box, "sm:col-span-3")}
        />
        <input
          value={draft.subtitle}
          onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
          placeholder="Subtitle"
          className={cn(box, "sm:col-span-3")}
        />
        <select
          value={draft.accent}
          onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
          className={box}
        >
          {SECTION_ACCENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
            inputMode="numeric"
            className={box}
          />
          <AdminButton variant="primary" onClick={() => void save()} disabled={saving}>
            Save
          </AdminButton>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {section.items.map((item) => (
          <ItemRow key={item.id} item={item} onChanged={onChanged} />
        ))}
        <AdminButton onClick={() => void addGame()}>
          <Plus className="size-3.5" /> Add game
        </AdminButton>
      </div>
    </Panel>
  );
}

function ItemRow({ item, onChanged }: { item: GameSectionItem; onChanged: () => void }) {
  const [draft, setDraft] = useState({
    name: item.name,
    platform: item.platform,
    badge: item.badge,
    image_url: item.image_url ?? "",
    sort_order: item.sort_order,
  });
  const dirty =
    draft.name !== item.name ||
    draft.platform !== item.platform ||
    draft.badge !== item.badge ||
    draft.image_url !== (item.image_url ?? "") ||
    Number(draft.sort_order) !== item.sort_order;

  const save = async () => {
    const { error } = await supabase
      .from("game_section_items")
      .update({
        name: draft.name,
        platform: draft.platform,
        badge: draft.badge,
        image_url: draft.image_url || null,
        sort_order: Number(draft.sort_order) || 0,
      } as never)
      .eq("id", item.id);
    if (error) { toast.error("Could not save the game."); return; }
    toast.success("Game saved.");
    onChanged();
  };

  const remove = async () => {
    const { error } = await supabase.from("game_section_items").delete().eq("id", item.id);
    if (error) { toast.error("Could not delete the game."); return; }
    onChanged();
  };

  return (
    <div className="grid items-center gap-2 rounded-2xl border border-border bg-surface/40 p-2 sm:grid-cols-[auto_2fr_1fr_1fr_2fr_auto_auto]">
      <GripVertical className="hidden size-4 text-muted-foreground sm:block" />
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="Game name"
        className={box}
      />
      <input
        value={draft.platform}
        onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
        placeholder="Platform"
        className={box}
      />
      <input
        value={draft.badge}
        onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
        placeholder="Badge (#1, Co-op…)"
        className={box}
      />
      <input
        value={draft.image_url}
        onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
        placeholder="Cover image URL (optional)"
        className={box}
      />
      <input
        value={draft.sort_order}
        onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
        inputMode="numeric"
        className={cn(box, "w-16")}
      />
      <div className="flex gap-1.5">
        <AdminButton variant={dirty ? "primary" : "ghost"} onClick={() => void save()}>
          Save
        </AdminButton>
        <AdminButton onClick={() => void remove()}>
          <Trash2 className="size-3.5" />
        </AdminButton>
      </div>
    </div>
  );
}
