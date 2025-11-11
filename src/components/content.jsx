import React, { useEffect, useMemo, useState } from "react";
import "./content.css";
import TaskList from "./taskList";
import Calendar from "./calendar";
import Gantt from "./gantt";

function normalizeView(v) {
  const key = String(v || "").toLowerCase();
  return ["tasks", "calendar", "gantt"].includes(key) ? key : "tasks";
}

function initialView() {
  const fromHash = normalizeView(window.location.hash.replace("#", ""));
  if (fromHash !== "tasks") return fromHash;

  try {
    const saved = normalizeView(localStorage.getItem("pm.lastView"));
    return saved;
  } catch {
  }
  return "tasks";
}

export default function Content() {
  const [view, setView] = useState(() => initialView());

  useEffect(() => {
    const nextHash = `#${view}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", nextHash);
    }
    try {
      localStorage.setItem("pm.lastView", view);
    } catch {
    }
  }, [view]);

  const body = useMemo(() => {
    switch (view) {
      case "calendar":
        return <Calendar/>;
      case "gantt":
        return <Gantt/>;
      case "tasks":
      default:
        return <TaskList/>;
    }
  }, [view]);

  return (
    <section className="content">
      <div className="content__tabs" role="tablist" aria-label="Views">
        <button
          role="tab"
          aria-selected={view === "tasks"}
          className={`content__tab ${view === "tasks" ? "content__tab--active" : ""}`}
          onClick={() => setView("tasks")}
        >
          Tasks
        </button>
        <button
          role="tab"
          aria-selected={view === "calendar"}
          className={`content__tab ${view === "calendar" ? "content__tab--active" : ""}`}
          onClick={() => setView("calendar")}
        >
          Calendar
        </button>
        <button
          role="tab"
          aria-selected={view === "gantt"}
          className={`content__tab ${view === "gantt" ? "content__tab--active" : ""}`}
          onClick={() => setView("gantt")}
        >
          Gantt
        </button>
      </div>

      <div className="content__body" role="tabpanel">
        {body}
      </div>
    </section>
  );
}
