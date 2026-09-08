"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Ruler, PencilLine, SlidersHorizontal, ImagePlus } from "lucide-react";
import styles from "./PlanningWorkspace.module.css";

const GROUPS = [
  { id: "setup", label: "Image", icon: ImagePlus, tools: ["upload", "calibration"] },
  { id: "measure", label: "Measure", icon: Ruler, tools: ["ruler", "line", "angle", "interline", "circle"] },
  { id: "annotate", label: "Annotate", icon: PencilLine, tools: ["text", "cut"] },
  { id: "canvas", label: "Canvas", icon: SlidersHorizontal, tools: ["move", "pan", "flip", "delete"] },
];

export default function PlanningToolGroups({ tools, onAction }) {
  const [open, setOpen] = useState(null);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(null);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      root.current?.querySelector('[aria-expanded="true"]')?.focus();
      setOpen(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const run = (item) => { setOpen(null); onAction(item.action); };
  return <div ref={root} className={styles.toolGroups} role="group" aria-label="Planning tools">
    {GROUPS.map((group) => {
      const Icon = group.icon;
      const items = tools.filter((item) => group.tools.includes(item.id));
      return <div className={styles.toolGroup} key={group.id}>
        <button type="button" className={`${styles.button} ${items.some((item) => item.active) ? styles.active : ""}`}
          aria-expanded={open === group.id} aria-controls={`planning-tools-${group.id}`}
          onClick={() => setOpen(open === group.id ? null : group.id)}>
          <Icon size={17} /><span>{group.label}</span><ChevronDown size={14} className={styles.groupChevron} />
        </button>
        {open === group.id && <div id={`planning-tools-${group.id}`} className={styles.toolPopover} role="group" aria-label={`${group.label} tools`}>
          {items.map((item) => {
            const ToolIcon = item.icon;
            return <button type="button" key={item.id} disabled={item.disabled} aria-pressed={Boolean(item.active)}
              className={`${styles.button} ${item.active ? styles.active : ""}`} onClick={() => run(item)}>
              <ToolIcon size={17} /><span>{item.label}</span>
            </button>;
          })}
        </div>}
      </div>;
    })}
    <div className={styles.historyTools}>
      {tools.filter((item) => ["undo", "redo"].includes(item.id)).map((item) => {
        const Icon = item.icon;
        return <button key={item.id} type="button" className={styles.button} disabled={item.disabled}
          title={item.label} aria-label={item.label} onClick={() => run(item)}><Icon size={17} /></button>;
      })}
    </div>
  </div>;
}
