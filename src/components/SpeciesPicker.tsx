"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FAMILY_GROUPS } from "@/lib/constants";

export type SpeciesOption = {
  id: number;
  common_name: string;
  scientific_name: string;
  japanese_name: string | null;
  family_group: string;
  is_protected: boolean;
  is_native_tw: boolean;
};

export function SpeciesPicker({
  name = "species_id",
  initial = null,
  required = false,
  onSelect,
}: {
  name?: string;
  initial?: SpeciesOption | null;
  required?: boolean;
  onSelect?: (s: SpeciesOption | null) => void;
}) {
  const [selected, setSelected] = useState<SpeciesOption | null>(initial);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<SpeciesOption[]>([]);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      const supabase = createClient();
      let query = supabase
        .from("species")
        .select("id, common_name, scientific_name, japanese_name, family_group, is_protected, is_native_tw")
        .order("common_name")
        .limit(12);
      const term = q.trim().toLowerCase().replace(/[%_,()]/g, " ");
      if (term) query = query.ilike("search_text", `%${term}%`);
      const { data } = await query;
      if (my === seq.current) setOptions(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  function pick(s: SpeciesOption | null) {
    setSelected(s);
    setOpen(false);
    setQ("");
    onSelect?.(s);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {selected.common_name}
              {selected.is_protected && <span className="chip chip-danger ml-2">保育類</span>}
            </div>
            <div className="sci truncate text-xs text-sub">{selected.scientific_name}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => pick(null)}>
            更換
          </button>
        </div>
      ) : (
        <input
          className="input"
          placeholder="輸入俗名、學名或日文名搜尋"
          value={q}
          required={required}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label="搜尋物種"
          autoComplete="off"
        />
      )}
      {open && !selected && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-sub">找不到符合的物種，可到「物種」頁提報新增</li>}
          {options.map((s) => (
            <li key={s.id}>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-wash" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                <div className="text-sm">
                  {s.common_name}
                  <span className="ml-2 text-xs text-faint">{FAMILY_GROUPS[s.family_group as keyof typeof FAMILY_GROUPS]}</span>
                  {s.is_protected && <span className="chip chip-danger ml-2">保育類</span>}
                </div>
                <div className="text-xs text-sub">
                  <span className="sci">{s.scientific_name}</span>
                  {s.japanese_name && <span className="ml-2">{s.japanese_name}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
