import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaFor } from "@/lib/queries";
import { EVENT_TYPES, SPECIMEN_STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Gallery } from "@/components/Gallery";
import { LineChart } from "@/components/LineChart";
import { RichText } from "@/components/RichText";
import { UserLink } from "@/components/ui";
import { deleteRecord, deleteSpecimen } from "../actions";
import { RecordForm } from "../RecordForms";

export const metadata: Metadata = { title: "飼育個體", robots: { index: false } };

type Mini = { id: number; label: string; sex: string } | null;

export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = Number(id) || 0;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("specimens")
    .select("*, species(id, common_name, scientific_name), owner:profiles!specimens_owner_id_fkey(id, username, avatar_path)")
    .eq("id", sid)
    .maybeSingle();
  if (!s || !s.owner) notFound();
  const session = await getSession();
  const mine = session?.userId === s.owner_id;

  const parentIds = [s.sire_id, s.dam_id].filter((x): x is number => !!x);
  const [{ data: ms }, { data: bottles }, { data: events }, media, { data: parents }, { data: offspring }] = await Promise.all([
    supabase.from("specimen_measurements").select("*").eq("specimen_id", sid).order("measured_on"),
    supabase.from("bottle_changes").select("*").eq("specimen_id", sid).order("changed_on", { ascending: false }),
    supabase.from("specimen_events").select("*").eq("specimen_id", sid).order("occurred_on", { ascending: false }),
    mediaFor("specimen", [sid]),
    parentIds.length ? supabase.from("specimens").select("id, label, sex, sire_id, dam_id").in("id", parentIds) : Promise.resolve({ data: [] }),
    supabase.from("specimens").select("id, label, sex").or(`sire_id.eq.${sid},dam_id.eq.${sid}`).order("label").limit(100),
  ]);
  const sire = parents?.find((p) => p.id === s.sire_id) ?? null;
  const dam = parents?.find((p) => p.id === s.dam_id) ?? null;
  const grandIds = [sire?.sire_id, sire?.dam_id, dam?.sire_id, dam?.dam_id].filter((x): x is number => !!x);
  const { data: grands } = grandIds.length ? await supabase.from("specimens").select("id, label, sex").in("id", grandIds) : { data: [] };
  const g = (gid?: number | null): Mini => grands?.find((x) => x.id === gid) ?? null;

  const weights = (ms ?? []).filter((m) => m.weight_g != null).map((m) => ({ date: m.measured_on, value: Number(m.weight_g) }));
  const heads = (ms ?? []).filter((m) => m.head_width_mm != null).map((m) => ({ date: m.measured_on, value: Number(m.head_width_mm) }));
  const peak = weights.length ? Math.max(...weights.map((w) => w.value)) : null;

  const Del = ({ kind, rid }: { kind: string; rid: number }) =>
    mine ? (
      <form action={deleteRecord}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={rid} />
        <input type="hidden" name="specimen_id" value={sid} />
        <button className="px-1 text-xs text-faint hover:text-danger" aria-label="刪除這筆紀錄">
          刪除
        </button>
      </form>
    ) : null;

  const facts: [string, string | null][] = [
    ["階段", SPECIMEN_STAGES[s.stage as keyof typeof SPECIMEN_STAGES]],
    ["性別", s.sex === "male" ? "♂ 公" : s.sex === "female" ? "♀ 母" : "不明"],
    ["累代", s.generation],
    ["產地", s.origin],
    ["血統", s.bloodline_name],
    ["孵化日", s.hatched_on && formatDate(s.hatched_on)],
    ["羽化日", s.emerged_on && formatDate(s.emerged_on)],
    ["成蟲尺寸", s.final_size_mm ? `${s.final_size_mm} mm` : null],
    ["最大體重", peak ? `${peak} g` : null],
    ["死亡日", s.died_on && formatDate(s.died_on)],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="page-title truncate">{s.label}</h1>
            {s.species && (
              <Link href={`/species/${s.species.id}`} className="text-sm text-sub">
                {s.species.common_name} <span className="sci">{s.species.scientific_name}</span>
              </Link>
            )}
          </div>
          <span className={`chip shrink-0 ${s.visibility === "public" ? "chip-accent" : ""}`}>{s.visibility === "public" ? "公開" : "只有我看得到"}</span>
        </div>
        {!mine && (
          <p className="mt-1 text-sm text-sub">
            飼育者 <UserLink user={s.owner} size={20} className="text-ink" />
          </p>
        )}
        {mine && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/breeding/${sid}/edit`} className="btn btn-sm">
              編輯
            </Link>
            <Link href={`/posts/new?species=${s.species_id}`} className="btn btn-sm">
              寫成文章
            </Link>
            {s.stage !== "dead" && (
              <Link href={`/market/new?specimen=${sid}`} className="btn btn-sm">
                帶入上架
              </Link>
            )}
            <ConfirmForm action={deleteSpecimen} message="確定刪除這隻個體與所有紀錄？無法復原。" className="ml-auto">
              <input type="hidden" name="id" value={sid} />
              <button className="btn btn-sm btn-danger">刪除</button>
            </ConfirmForm>
          </div>
        )}
      </header>

      <Gallery media={media.get(sid) ?? []} />

      <dl className="grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line py-2">
              <dt className="text-sub">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
      </dl>
      {s.notes && <RichText text={s.notes} className="text-sm" />}

      <section>
        <h2 className="mb-2 font-semibold">成長紀錄</h2>
        <div className="space-y-4">
          {weights.length > 0 && <LineChart points={weights} unit="g" label="體重" />}
          {heads.length > 0 && <LineChart points={heads} unit="mm" label="頭幅" height={140} />}
        </div>
        {(ms ?? []).length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-sub">
                <th className="py-1.5 font-normal">日期</th>
                <th className="font-normal">體重 g</th>
                <th className="font-normal">頭幅 mm</th>
                <th className="font-normal">備註</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...(ms ?? [])].reverse().map((m) => (
                <tr key={m.id} className="border-b border-line">
                  <td className="py-1.5">{formatDate(m.measured_on)}</td>
                  <td>{m.weight_g ?? "—"}</td>
                  <td>{m.head_width_mm ?? "—"}</td>
                  <td className="text-sub">{m.note}</td>
                  <td className="text-right">
                    <Del kind="measurement" rid={m.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!ms?.length && <p className="text-sm text-sub">還沒有量測紀錄。</p>}
        {mine && (
          <div className="mt-3">
            <RecordForm specimenId={sid} kind="measurement" />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">換瓶紀錄</h2>
        {bottles?.length ? (
          <ul className="divide-y divide-line text-sm">
            {bottles.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-medium">{formatDate(b.changed_on)}</span>
                  <span className="ml-2 text-sub">
                    {[b.substrate, b.volume_ml && `${b.volume_ml} ml`, b.note].filter(Boolean).join("・")}
                  </span>
                  {b.next_due_on && <div className="text-xs text-sub">下次預定 {formatDate(b.next_due_on)}</div>}
                </div>
                <Del kind="bottle" rid={b.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">還沒有換瓶紀錄。</p>
        )}
        {mine && (
          <div className="mt-3">
            <RecordForm specimenId={sid} kind="bottle" />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">事件</h2>
        {events?.length ? (
          <ul className="divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <span className="chip chip-accent mr-2">{EVENT_TYPES[e.event_type as keyof typeof EVENT_TYPES]}</span>
                  {formatDate(e.occurred_on)}
                  {e.note && <span className="ml-2 text-sub">{e.note}</span>}
                </div>
                <Del kind="event" rid={e.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">還沒有事件。</p>
        )}
        {mine && (
          <div className="mt-3">
            <RecordForm specimenId={sid} kind="event" />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">血統</h2>
        <div className="overflow-x-auto">
          <div className="grid min-w-[420px] grid-cols-3 items-center gap-2 text-sm">
            <div className="space-y-2">
              <Node n={g(sire?.sire_id)} role="祖父" />
              <Node n={g(sire?.dam_id)} role="祖母" />
              <Node n={g(dam?.sire_id)} role="外祖父" />
              <Node n={g(dam?.dam_id)} role="外祖母" />
            </div>
            <div className="space-y-10">
              <Node n={sire} role="父本 ♂" />
              <Node n={dam} role="母本 ♀" />
            </div>
            <Node n={{ id: sid, label: s.label, sex: s.sex }} role="本個體" current />
          </div>
        </div>
        <p className="mt-1 text-xs text-sub">只顯示你看得到的個體（自己的，或對方設為公開的）。</p>
        {!!offspring?.length && (
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-medium">子代（{offspring.length}）</h3>
            <div className="flex flex-wrap gap-2">
              {offspring.map((o) => (
                <Link key={o.id} href={`/breeding/${o.id}`} className="chip min-h-8 px-3">
                  {o.label} {o.sex === "male" ? "♂" : o.sex === "female" ? "♀" : ""}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Node({ n, role, current }: { n: Mini; role: string; current?: boolean }) {
  const cls = `block rounded-lg border px-2.5 py-1.5 ${current ? "border-accent bg-accent-wash" : "border-line"}`;
  const inner = (
    <>
      <span className="block text-[11px] text-sub">{role}</span>
      <span className="block truncate font-medium">{n ? n.label : "未記錄"}</span>
    </>
  );
  return n && !current ? (
    <Link href={`/breeding/${n.id}`} className={`${cls} hover:bg-wash`}>
      {inner}
    </Link>
  ) : (
    <div className={`${cls} ${n ? "" : "text-faint"}`}>{inner}</div>
  );
}
