"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Mood = { date: string; score: number; note: string; updatedAt: string };

const MOODS = [
  { score: 1, emoji: "😭", label: "최악", color: "bg-rose-500" },
  { score: 2, emoji: "😕", label: "별로", color: "bg-orange-400" },
  { score: 3, emoji: "😐", label: "보통", color: "bg-amber-300" },
  { score: 4, emoji: "🙂", label: "좋음", color: "bg-lime-400" },
  { score: 5, emoji: "🥰", label: "최고", color: "bg-emerald-500" },
];

// 백엔드(mood-tracker-backend) 주소. .env.local 의 NEXT_PUBLIC_API_URL 로 바꿀 수 있음
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const fmt = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

export default function MoodApp() {
  const [today, setToday] = useState("");
  const [selected, setSelected] = useState("");
  const [view, setView] = useState({ y: 0, m: 0 }); // 달력에 보이는 달 (m: 0~11)
  const [moods, setMoods] = useState<Mood[]>([]);
  const [score, setScore] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMoods = useCallback(async (): Promise<Mood[]> => {
    const res = await fetch(`${API}/api/moods?limit=1000`);
    return res.json();
  }, []);

  // 입력 폼을 특정 날짜의 기록으로 채움 (기록이 없으면 비움)
  const fillForm = useCallback((m?: Mood) => {
    setScore(m?.score ?? 0);
    setNote(m?.note ?? "");
    setError("");
  }, []);

  useEffect(() => {
    // 날짜는 사용자의 로컬 시간 기준 (서버/클라 불일치 방지를 위해 마운트 후 계산)
    (async () => {
      const list = await fetchMoods();
      const now = new Date();
      const t = toDateStr(now);
      setMoods(list);
      setToday(t);
      setSelected(t);
      setView({ y: now.getFullYear(), m: now.getMonth() });
      fillForm(list.find((m) => m.date === t));
    })();
  }, [fetchMoods, fillForm]);

  const load = useCallback(async () => setMoods(await fetchMoods()), [fetchMoods]);

  const byDate = useMemo(() => new Map(moods.map((m) => [m.date, m])), [moods]);
  const selectedMood = byDate.get(selected);

  function selectDate(date: string) {
    setSelected(date);
    fillForm(byDate.get(date));
  }

  async function save() {
    if (!score) return setError("기분을 골라주세요.");
    setError("");
    setSaving(true);
    const res = await fetch(`${API}/api/moods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, score, note }),
    }).catch(() => null);
    setSaving(false);
    if (!res) return setError("서버에 연결할 수 없어요.");
    if (!res.ok) return setError((await res.json()).error ?? "저장에 실패했어요.");
    await load();
  }

  async function remove(date: string) {
    await fetch(`${API}/api/moods?date=${date}`, { method: "DELETE" });
    if (date === selected) fillForm();
    await load();
  }

  function moveMonth(delta: number) {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  // 달력 칸: 앞쪽 빈 칸 + 1일~말일
  const cells = useMemo(() => {
    if (!today) return [];
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
  }, [view, today]);

  const isCurrentMonth = today === "" || keyOf(view.y, view.m, 1).slice(0, 7) >= today.slice(0, 7);

  // 최근 14일 막대 차트
  const recent = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(`${today}T00:00:00`);
      d.setDate(d.getDate() - (13 - i));
      const key = toDateStr(d);
      return { key, day: d.getDate(), mood: byDate.get(key) };
    });
  }, [byDate, today]);

  const avg = moods.length
    ? (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1)
    : "-";

  const isToday = selected === today;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">오늘 기분 기록기</h1>
      <p className="mt-1 text-sm text-zinc-500">달력에서 날짜를 눌러 지난 날의 기분도 기록해요.</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-background/80 p-4 backdrop-blur-sm dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => moveMonth(-1)}
            aria-label="이전 달"
            className="rounded-lg px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            ‹
          </button>
          <span className="font-semibold">{today && `${view.y}년 ${view.m + 1}월`}</span>
          <button
            onClick={() => moveMonth(1)}
            disabled={isCurrentMonth}
            aria-label="다음 달"
            className="rounded-lg px-3 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-900"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const key = keyOf(view.y, view.m, day);
            const mood = byDate.get(key);
            const future = key > today;
            return (
              <button
                key={key}
                disabled={future}
                onClick={() => selectDate(key)}
                aria-label={fmt(key)}
                aria-pressed={key === selected}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 text-xs transition disabled:opacity-25 ${
                  key === selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : key === today
                      ? "border-zinc-400"
                      : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <span className="text-zinc-500">{day}</span>
                <span className="text-base leading-none">{mood ? MOODS[mood.score - 1].emoji : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-background/80 p-5 backdrop-blur-sm dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            {selected && fmt(selected)}
            {isToday && <span className="ml-2 text-xs font-normal text-blue-500">오늘</span>}
          </h2>
          {!isToday && today && (
            <button
              onClick={() => {
                selectDate(today);
                setView({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
              }}
              className="text-xs text-blue-500 hover:underline">
              오늘로 돌아가기
            </button>
          )}
        </div>

        <div className="flex justify-between gap-2">
          {MOODS.map((m) => (
            <button
              key={m.score}
              onClick={() => setScore(m.score)}
              aria-pressed={score === m.score}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-3 transition ${
                score === m.score
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs">{m.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="한 줄 메모 (선택)"
          className="mt-4 w-full resize-none rounded-xl border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
        />

        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

        <button
          onClick={save}
          disabled={saving || !selected}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {selectedMood ? "기록 수정하기" : "기록하기"}
        </button>
      </section>

      <section className="mt-8 rounded-2xl bg-background/80 p-5 backdrop-blur-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">최근 14일</h2>
          <span className="text-sm text-zinc-500">
            전체 평균 {avg} · 총 {moods.length}일 기록
          </span>
        </div>
        <div className="mt-3 flex h-28 items-end gap-1">
          {recent.map(({ key, day, mood }) => (
            <div key={key} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end">
                <div
                  title={mood ? `${fmt(key)} ${MOODS[mood.score - 1].label}` : fmt(key)}
                  className={`w-full rounded-t ${mood ? MOODS[mood.score - 1].color : "bg-zinc-200 dark:bg-zinc-800"}`}
                  style={{ height: mood ? `${mood.score * 20}%` : "6%" }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-background/80 p-5 backdrop-blur-sm">
        <h2 className="font-semibold">기록</h2>
        {moods.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">아직 기록이 없어요. 오늘의 첫 기분을 남겨보세요!</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {moods.map((m) => (
              <li key={m.date} className="flex items-start gap-3 py-3">
                <span className="text-2xl">{MOODS[m.score - 1].emoji}</span>
                <button
                  onClick={() => {
                    selectDate(m.date);
                    setView({ y: Number(m.date.slice(0, 4)), m: Number(m.date.slice(5, 7)) - 1 });
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium">
                    {m.date.slice(0, 4)}년 {fmt(m.date)} · {MOODS[m.score - 1].label}
                  </p>
                  {m.note && <p className="mt-0.5 break-words text-sm text-zinc-500">{m.note}</p>}
                </button>
                <button
                  onClick={() => remove(m.date)}
                  className="text-xs text-zinc-400 hover:text-rose-500"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
