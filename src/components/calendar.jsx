import React, { useEffect, useMemo, useState } from "react";
import "./calendar.css";

const API_BASE = process.env.SERVER_API || "";

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfCalendarGrid(d) {
  const first = startOfMonth(d);
  const day = (first.getDay() + 6) % 7;
  return addDays(first, -day);
}
function endOfCalendarGrid(d) {
  const last = endOfMonth(d);
  const day = (last.getDay() + 6) % 7;
  return addDays(last, 6 - day);
}

function normalizeEvents(payload) {
  const toYmd = (v) => (v ? String(v).slice(0, 10) : "");
  const parseOne = (e, i) => {
    const id = e.id ?? e._id ?? `evt-${i}`;
    const title = e.title || e.name || e.summary || e.task || "Untitled";
    const start = toYmd(e.start || e.startDate || e.from || e.date || e.when || e.dueDate || e.due || e.end);
    const end = toYmd(e.end || e.endDate || e.to || e.dueDate || e.due || start);
    if (!start || Number.isNaN(Date.parse(start))) return null;
    const endOk = end && !Number.isNaN(Date.parse(end)) ? end : start;
    return { id, title, start, end: endOk };
  };

  if (Array.isArray(payload)) {
    return payload.map(parseOne).filter(Boolean);
  }
  const list = [];
  for (const v of Object.values(payload || {})) {
    if (Array.isArray(v)) list.push(...v);
  }
  return list.map(parseOne).filter(Boolean);
}

function tasksToEvents(tasks) {
  const toYmd = (v) => (v ? String(v).slice(0, 10) : "");
  return (Array.isArray(tasks) ? tasks : [])
    .map((t, i) => {
      const start = toYmd(t.startDate || t.start || t.from || t.date);
      const end = toYmd(t.dueDate || t.due || t.end || t.to || start);
      if (!start || Number.isNaN(Date.parse(start))) return null;
      const endOk = end && !Number.isNaN(Date.parse(end)) ? end : start;
      const title = t.title || t.task || t.name || "Task";
      const id = t.id ? `t-${t.id}` : `t-${i}`;
      return { id, title, start, end: endOk };
    })
    .filter(Boolean);
}

export default function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return { month: new Date(today.getFullYear(), today.getMonth(), 1) };
  });

  const gridStart = useMemo(() => startOfCalendarGrid(cursor.month), [cursor.month]);
  const gridEnd = useMemo(() => endOfCalendarGrid(cursor.month), [cursor.month]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState("");

  useEffect(() => {
    let alive = true;

    async function fetchEvents() {
      setLoading(true);
      setErrText("");
      try {
        // Primary: /api/events with a month-wide buffer (gridStart/gridEnd)
        const qs = new URLSearchParams({ from: ymd(gridStart), to: ymd(gridEnd) });
        const resp = await fetch(`${API_BASE}/api/events?${qs.toString()}`, { credentials: "include" });
        if (!resp.ok) throw new Error(`GET /api/events failed: ${resp.status}`);
        const data = await resp.json();
        if (!alive) return;
        setEvents(normalizeEvents(data));
      } catch (e1) {
        // Fallback once: fetch tasks and synthesize events
        try {
          const resp = await fetch(`${API_BASE}/api/tasks`, { credentials: "include" });
          if (!resp.ok) throw new Error(`GET /api/tasks failed: ${resp.status}`);
          const tasks = await resp.json();
          if (!alive) return;
          setEvents(tasksToEvents(tasks));
        } catch (e2) {
          if (!alive) return;
          setErrText(e2?.message || e1?.message || "Failed to load calendar data.");
          setEvents([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchEvents();
    return () => { alive = false; };
  }, [gridStart, gridEnd]);

  const days = useMemo(() => {
    const out = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }, [gridStart, gridEnd]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const s = new Date(e.start);
      const t = new Date(e.end);
      const from = s < gridStart ? new Date(gridStart) : s;
      const to = t > gridEnd ? new Date(gridEnd) : t;

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.title > b.title ? 1 : -1));
    }
    return map;
  }, [events, gridStart, gridEnd]);

  function monthLabel(d) {
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function prevMonth() {
    setCursor((c) => ({ month: new Date(c.month.getFullYear(), c.month.getMonth() - 1, 1) }));
  }
  function nextMonth() {
    setCursor((c) => ({ month: new Date(c.month.getFullYear(), c.month.getMonth() + 1, 1) }));
  }
  function thisMonth() {
    const t = new Date();
    setCursor({ month: new Date(t.getFullYear(), t.getMonth(), 1) });
  }

  const todayStr = ymd(new Date());

  return (
    <section className="cal">
      <div className="cal__toolbar">
        <button className="cal__btn" onClick={prevMonth}>‹ Month</button>
        <button className="cal__btn cal__btn--today" onClick={thisMonth}>Today</button>
        <button className="cal__btn" onClick={nextMonth}>Month ›</button>
        <div className="cal__title">{monthLabel(cursor.month)}</div>
        {loading && <span className="cal__status">Loading…</span>}
        {errText && <span className="cal__status cal__status--err">{errText}</span>}
      </div>

      <div className="cal__weekdays">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((w) => (
          <div key={w} className="cal__weekday">{w}</div>
        ))}
      </div>

      <div className="cal__grid">
        {days.map((d, i) => {
          const ds = ymd(d);
          const isOut = d.getMonth() !== cursor.month.getMonth();
          const isToday = ds === todayStr;
          const items = byDate.get(ds) || [];
          return (
            <div
              key={i}
              className={`cal__cell ${isOut ? "cal__cell--out" : ""} ${isToday ? "cal__cell--today" : ""}`}
              aria-label={d.toDateString()}
              title={d.toDateString()}
            >
              <div className="cal__date">{d.getDate()}</div>
              <div className="cal__events">
                {items.slice(0, 3).map((e) => (
                  <div key={e.id} className="cal__event" title={e.title}>
                    {e.title}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="cal__more">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
