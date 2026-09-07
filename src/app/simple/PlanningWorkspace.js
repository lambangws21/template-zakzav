"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, CloudUpload, Download, Eye, EyeOff, FileText, Focus,
  ImagePlus, Layers, ListOrdered, Lock, LockOpen, PanelLeftClose,
  PanelRightClose, Plus, Ruler, SlidersHorizontal, Target, X,
} from "lucide-react";
import {
  capturePlanningInitial, formatPlanningValue, resolvePlanningRows,
} from "@/lib/planningWorkspace";
import styles from "./PlanningWorkspace.module.css";

function Action({ icon: Icon, children, active, className = "", ...props }) {
  return <button type="button" className={`${styles.button} ${active ? styles.active : ""} ${className}`} {...props}>
    {Icon && <Icon size={16} aria-hidden="true" />}{children}
  </button>;
}

export function PlanningCorrectionControls({ modes, mode, onMode, fields, onApply, canApply, editing }) {
  return <div className={styles.controls}>
    <label>Resection<select value={mode} onChange={(e) => onMode(e.target.value)}>
      {modes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
    </select></label>
    <div className={styles.fieldGrid}>
      {fields.map((field) => <label key={field.label}>{field.label}
        {field.options ? <select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
          {field.options.map((value) => <option key={value}>{value}</option>)}
        </select> : <input type="number" value={field.value} min={field.min} max={field.max} step={field.step || 1}
          onChange={(e) => { if (e.target.value !== "") field.onChange(Number(e.target.value)); }} />}
      </label>)}
    </div>
    <Action icon={Plus} onClick={onApply} disabled={!canApply}>{editing ? "Update guide" : "Buat dari line terpilih"}</Action>
  </div>;
}

export default function PlanningWorkspace({
  enabled, children, procedure, onProcedure, reference, session, onSession,
  measurements, imageName, hasImage, calibrated, tools, actions, analysisTools,
  correctionControls, catalog, selectedImplantId, onSelectImplant, onInsertImplant,
  layers, onSelectLayer, onUpdateLayer, annotations, guides, note, onNote,
  status, zoom, toolLabel, isDark,
}) {
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState(false);
  const [metricEditor, setMetricEditor] = useState(null);
  const [logTab, setLogTab] = useState("measurements");
  const [brand, setBrand] = useState("");
  const [system, setSystem] = useState("");
  const [component, setComponent] = useState("");
  const drag = useRef(null);
  const sheetRef = useRef(null);
  const rows = useMemo(() => resolvePlanningRows(procedure, session, measurements), [procedure, session, measurements]);
  const available = catalog.filter((item) => procedure === "tka" ? item.type === "knee" : item.type !== "knee");
  const brands = [...new Set(available.map((item) => item.brand))];
  const systems = [...new Set(available.filter((item) => !brand || item.brand === brand).map((item) => item.system))];
  const choices = available.filter((item) => (!brand || item.brand === brand) && (!system || item.system === system) && (!component || item.type === component));
  const selectedImplant = choices.find((item) => item.id === selectedImplantId);
  const step = reference.workflow[session.step] || reference.workflow[0];
  const canProceed = hasImage && calibrated && Boolean(session.side);

  useEffect(() => { setBrand(""); setSystem(""); setComponent(""); setMetricEditor(null); }, [procedure]);
  useEffect(() => {
    if (!sheet) return;
    const handler = (event) => { if (event.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", handler);
    sheetRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", handler);
  }, [sheet]);

  if (!enabled) return children;

  const activate = (action) => { setSheet(null); action(); };
  const saveInitial = () => {
    const initial = capturePlanningInitial(rows);
    if (initial) onSession({ ...session, initial });
  };
  const changeStep = (index) => {
    if (index > 0 && !canProceed) return;
    onSession({ ...session, step: index });
  };

  const implantList = <div className={styles.layerList}>
    {layers.length === 0 ? <p className={styles.empty}>Belum ada implant atau potongan.</p> : layers.map((layer) =>
      <div key={layer.id} className={styles.layerRow}>
        <button type="button" className={styles.layerName} onClick={() => activate(() => onSelectLayer(layer.id))}>
          <span>{layer.name}</span><small>{layer.size} / {layer.rotation}</small>
        </button>
        <Action icon={layer.hidden ? EyeOff : Eye} aria-label={`${layer.hidden ? "Tampilkan" : "Sembunyikan"} ${layer.name}`}
          onClick={() => onUpdateLayer(layer.id, { hidden: !layer.hidden })} />
        <Action icon={layer.locked ? Lock : LockOpen} title="Lock scale" aria-label={`${layer.locked ? "Unlock scale" : "Lock scale"} ${layer.name}`}
          onClick={() => onUpdateLayer(layer.id, { locked: !layer.locked })} />
      </div>)}
  </div>;

  const workflow = <>
    <div className={styles.panelHeading}><div><small>{procedure === "tka" ? "TOTAL KNEE ARTHROPLASTY" : "TOTAL HIP ARTHROPLASTY"}</small>
      <h2>{reference.fullLabel}</h2></div>
      <Action icon={PanelLeftClose} className={styles.desktopOnly} onClick={() => setWorkflowOpen(false)} aria-label="Tutup workflow" />
    </div>
    <ol className={styles.steps} aria-label="Planning workflow">
      {reference.workflow.map((item, index) => <li key={item.title}>
        <button type="button" aria-current={session.step === index ? "step" : undefined}
          disabled={index > 0 && !canProceed} onClick={() => changeStep(index)}>
          <span className={styles.stepNumber}>{index + 1}</span><span>{item.title}
            <small>{session.step === index ? "In progress" : index === 0 && canProceed ? "Completed" : index === 1 && session.initial ? "Initial recorded" : "Pending"}</small></span>
          {index === 0 && canProceed && session.step !== index && <Check size={18} />}
          {index > 0 && !canProceed && <Lock size={15} />}
          {session.step === index && <ChevronRight size={14} />}
        </button>
      </li>)}
    </ol>
    <div className={styles.stepContent}>
      <div className={styles.sectionHeading}><span>{session.step + 1} / 6</span><strong>{step.title}</strong></div>
      {session.step === 0 && <>
        <div className={styles.buttonGrid}>
          <Action icon={ImagePlus} onClick={() => activate(actions.upload)}>Upload X-ray</Action>
          <Action icon={CloudUpload} onClick={() => activate(actions.library)}>Buka Drive</Action>
        </div>
        <p className={styles.fileName}>{imageName || "Belum ada gambar"}</p>
        <label className={styles.fieldLabel}>Body side</label>
        <div className={styles.segment} aria-label="Body side">
          {["left", "right"].map((side) => <Action key={side} active={session.side === side} aria-pressed={session.side === side}
            onClick={() => onSession({ ...session, side, initial: session.side === side ? session.initial : null })}>{side === "left" ? "L / Left" : "R / Right"}</Action>)}
        </div>
        <Action icon={Ruler} className={calibrated ? styles.success : styles.warning} disabled={!hasImage}
          onClick={() => activate(actions.calibrate)}>{calibrated ? "Skala terkalibrasi" : "Kalibrasi marker"}</Action>
      </>}
      {session.step === 1 && <>
        <div className={styles.buttonGrid}>{analysisTools.map((item) => <Action key={item.id} icon={item.icon}
          onClick={() => activate(item.action)}>{item.label}</Action>)}</div>
        <Action icon={Target} disabled={!rows.some((row) => row.value !== null)} onClick={saveInitial}>
          {session.initial ? "Rekam ulang Initial" : "Rekam Initial"}
        </Action>
        {session.initial && <p className={styles.saved}><Check size={14} />Initial tersimpan</p>}
      </>}
      {session.step === 2 && <>
        <Action icon={SlidersHorizontal} onClick={() => { setLogTab("measurements"); if (sheet) setSheet("log"); else setLogOpen(true); }}>Correction Settings</Action>
        <div className={styles.buttonGrid}><Action icon={SlidersHorizontal} onClick={() => activate(actions.properties)}>Properties</Action>
          <Action icon={Layers} onClick={() => activate(actions.freeCut)}>Free Cut</Action></div>
        {guides.map((guide) => <div className={styles.logNote} key={guide.id}>{guide.label}<strong>{guide.angle}</strong></div>)}
      </>}
      {session.step === 3 && <div className={styles.controls}>
        <label>Manufacturer<select value={brand} onChange={(e) => { setBrand(e.target.value); setSystem(""); }}>
          <option value="">Semua produsen</option>{brands.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Product<select value={system} onChange={(e) => setSystem(e.target.value)}>
          <option value="">Semua produk</option>{systems.map((value) => <option key={value}>{value}</option>)}</select></label>
        {procedure === "hip" && <label>Component<select value={component} onChange={(e) => setComponent(e.target.value)}>
          <option value="">Cup & Stem</option><option value="cup">Cup</option><option value="stem">Stem</option></select></label>}
        <label>Template / Size<select value={selectedImplant?.id || ""} onChange={(e) => onSelectImplant(e.target.value)}>
          <option value="">Pilih template</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        {selectedImplant && <div className={styles.implantPreview}>
          <img src={selectedImplant.imageSrc} alt={selectedImplant.label} />
          <span>{selectedImplant.system}<strong>Size {selectedImplant.size}</strong></span>
        </div>}
        <Action icon={Plus} disabled={!calibrated || !selectedImplant} onClick={() => activate(onInsertImplant)}>Insert Implant</Action>
        <Action icon={Layers} onClick={() => activate(actions.implantLibrary)}>Library & layer settings</Action>
      </div>}
      {session.step === 4 && implantList}
      {session.step === 5 && <>
        <label className={styles.fieldLabel}>Catatan teknik & rencana<textarea rows={4} value={note} onChange={(e) => onNote(e.target.value)} /></label>
        <div className={styles.buttonGrid}>
          <Action icon={FileText} onClick={() => activate(actions.report)} disabled={!hasImage}>Create Report</Action>
          <Action icon={Download} onClick={actions.saveLocal} disabled={!hasImage}>Save locally</Action>
          <Action icon={CloudUpload} onClick={() => activate(actions.saveCloud)} disabled={!hasImage}>Save to cloud</Action>
          <Action icon={ImagePlus} onClick={actions.snapshot} disabled={!hasImage}>Snapshot PNG</Action>
        </div>
      </>}
    </div>
    <div className={styles.stepFooter}>
      <Action icon={ChevronLeft} aria-label="Langkah sebelumnya" disabled={session.step === 0} onClick={() => changeStep(session.step - 1)} />
      <Action icon={session.step === 5 ? FileText : ArrowRight} disabled={!canProceed}
        onClick={() => session.step === 5 ? activate(actions.report) : changeStep(session.step + 1)}>
        {session.step === 5 ? "Create Report" : "Lanjut"}
      </Action>
    </div>
  </>;

  const log = <>
    <div className={styles.panelHeading}><div><small>{session.side ? `${session.side.toUpperCase()} SIDE` : "BODY SIDE BELUM DIPILIH"}</small><h2>Planning Log</h2></div>
      <Action icon={PanelRightClose} className={styles.desktopOnly} onClick={() => setLogOpen(false)} aria-label="Tutup Planning Log" />
    </div>
    <div className={styles.logBody}>
      <div className={styles.logTabs} role="tablist" aria-label="Planning log sections">
        {[["measurements", "Measurements"], ["implants", "Implants"], ["texts", "Texts"], ["crops", "Crops"]].map(([key, label]) =>
          <button key={key} type="button" role="tab" id={`planning-tab-${key}`} aria-controls="planning-log-content"
            aria-selected={logTab === key} onClick={() => { setLogTab(key); setMetricEditor(null); }}>{label}</button>)}
      </div>
      <div id="planning-log-content" role="tabpanel" aria-labelledby={`planning-tab-${logTab}`}>
      {logTab === "measurements" && <>
      <div className={styles.sectionHeading}><strong>Measurements</strong><span>{rows.filter((r) => r.value !== null).length} / {rows.length}</span></div>
      <table className={styles.measurements}><thead><tr><th>Parameter</th><th>Initial</th><th>Planned</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key}>
          <th><button type="button" title={row.detail} onClick={() => setMetricEditor(metricEditor === row.key ? null : row.key)}
            aria-expanded={metricEditor === row.key}>{row.key}<ChevronDown size={12} /></button></th>
          <td>{formatPlanningValue(session.initial ? row.initial : row.value, row.unit)}</td>
          <td className={row.value !== row.initial && session.initial ? styles.changed : ""}>{formatPlanningValue(session.initial ? row.value : null, row.unit)}</td>
        </tr>)}</tbody>
      </table>
      {metricEditor && (() => {
        const row = rows.find((item) => item.key === metricEditor);
        if (!row) return null;
        return <div className={styles.metricEditor}>
          <strong>{row.key}</strong><p>{row.detail}</p>
          <label>Sumber pengukuran<select value={session.bindings?.[row.key] || ""}
            onChange={(e) => onSession({ ...session, bindings: { ...session.bindings, [row.key]: e.target.value } })}>
            <option value="">Otomatis dari pengukuran berlabel</option>
            {measurements.filter((m) => m.unit === row.unit).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        </div>;
      })()}
      {!session.initial && <Action icon={Target} disabled={!rows.some((r) => r.value !== null)} onClick={saveInitial}>Rekam Initial</Action>}
      <section className={styles.logSection}><h2>{procedure === "tka" ? "Correction Settings" : "Femoral Resection"}</h2>{correctionControls}</section>
      </>}
      {logTab === "implants" && <section className={styles.logSection}><h2>Selected Implants & Fragments</h2>{implantList}
        <Action icon={Plus} disabled={!canProceed} onClick={() => { changeStep(3); if (sheet) setSheet("workflow"); else setWorkflowOpen(true); }}>Insert Implants</Action>
      </section>}
      {logTab === "texts" && <section className={styles.logSection}><h2>Custom Texts</h2>
        {annotations.length ? annotations.map((item) => <p key={item.id} className={styles.logNote}>{item.text}</p>) : <p className={styles.empty}>Belum ada anotasi.</p>}
      </section>}
      {logTab === "crops" && <section className={styles.logSection}><h2>Image Crops & Resections</h2>
        {layers.filter((item) => item.kind === "crop").map((item) => <button type="button" className={styles.cropRow} key={item.id} onClick={() => activate(() => onSelectLayer(item.id))}>{item.name}<span>{item.size}</span></button>)}
        {guides.length ? guides.map((item) => <p key={item.id} className={styles.logNote}>{item.label}<strong>{item.angle}</strong></p>) : <p className={styles.empty}>Belum ada guide reseksi.</p>}
      </section>}
      </div>
    </div>
    <div className={styles.stepFooter}><Action icon={FileText} disabled={!hasImage} onClick={() => activate(actions.report)}>Create Report</Action></div>
  </>;

  const fileTools = tools.filter((item) => ["cloud", "local", "snapshot", "report"].includes(item.id));
  const toolButtons = tools.filter((item) => !fileTools.includes(item)).map((item) => <Action key={item.id} icon={item.icon} title={item.label} aria-label={item.label}
    active={item.active} disabled={item.disabled} onClick={() => activate(item.action)}><span>{item.label}</span></Action>);

  return <div className={`${styles.workspace} ${focus ? styles.focus : ""}`} data-dark={isDark} data-procedure={procedure}>
    <div className={styles.commandBar}>
      <label className={styles.procedure}>
        <img src={`/images/quick-panel/${procedure === "tka" ? "tka" : "hip"}-icon.png`} alt="" />
        <select aria-label="Planning procedure" value={procedure} onChange={(e) => onProcedure(e.target.value)}>
          <option value="tka">Bicondylar Knee / TKA</option><option value="hip">Hip Planning / THA</option>
        </select>
      </label>
      <div className={styles.fileTools}>{fileTools.map((item) => <Action key={item.id} icon={item.icon} title={item.label} aria-label={item.label}
        disabled={item.disabled} onClick={() => activate(item.action)}><span>{item.label}</span></Action>)}</div>
      <Action icon={Focus} onClick={() => { setFocus(!focus); setSheet(null); }} aria-pressed={focus} aria-label="Focus canvas" />
    </div>
    <div className={styles.toolbar}>
      <div className={styles.toolStrip} role="toolbar" aria-label="Planning tools">{toolButtons}</div>
    </div>
    <div className={styles.body} data-left={workflowOpen && !focus} data-right={logOpen && !focus}>
      <aside className={`${styles.workflow} ${styles.desktopPanel}`} hidden={!workflowOpen || focus}>{workflow}</aside>
      <div className={styles.canvas}>
        {children}
        {session.side && <span className={styles.sideMarker}>{session.side === "left" ? "L" : "R"}</span>}
        {!hasImage && <div className={styles.emptyCanvas}>
          <ImagePlus size={32} /><h2>{reference.fullLabel}</h2>
          <Action icon={ImagePlus} onClick={actions.upload}>Upload X-ray</Action>
        </div>}
        <div className={styles.canvasToggles}>
          {!workflowOpen && <Action icon={ListOrdered} className={styles.desktopOnly} onClick={() => setWorkflowOpen(true)}>Workflow</Action>}
          {!logOpen && <Action icon={ClipboardList} className={styles.desktopOnly} onClick={() => setLogOpen(true)}>Planning Log</Action>}
        </div>
        <div className={styles.viewTools}>
          <span>{toolLabel}</span>
          <Action icon={SlidersHorizontal} aria-label="Object settings" onClick={actions.properties} disabled={!hasImage} />
          <Action icon={Focus} aria-label="Fit screen" onClick={actions.fit} disabled={!hasImage} />
          <button type="button" onClick={actions.zoomReset} title="Reset zoom 100%">{zoom}%</button>
        </div>
      </div>
      <aside className={`${styles.log} ${styles.desktopPanel}`} hidden={!logOpen || focus}>{log}</aside>
    </div>
    <div className={styles.mobileNav}>
      <Action icon={ListOrdered} onClick={() => setSheet(sheet === "workflow" ? null : "workflow")} active={sheet === "workflow"}>Workflow</Action>
      <Action icon={Ruler} onClick={() => setSheet(sheet === "tools" ? null : "tools")} active={sheet === "tools"}>Tools</Action>
      <Action icon={ClipboardList} onClick={() => setSheet(sheet === "log" ? null : "log")} active={sheet === "log"}>Log</Action>
      <Action icon={Download} onClick={() => { changeStep(5); setSheet("workflow"); }} disabled={!canProceed}>Export</Action>
    </div>
    <div className={styles.status}><span>{status}</span><span>{layers.length} layer / {measurements.length} ukur</span></div>
    {sheet && !focus && <div className={styles.sheet} ref={sheetRef} tabIndex={-1} role="dialog" aria-label={`Planning ${sheet}`} data-expanded={expanded}>
      <div className={styles.sheetHeader}>
        <button type="button" className={styles.handle} aria-label={expanded ? "Perkecil panel" : "Perbesar panel"} onClick={() => setExpanded(!expanded)}
          onPointerDown={(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerUp={(e) => { if (drag.current === null) return; const dy = e.clientY - drag.current; drag.current = null;
            if (dy > 80) { setSheet(null); } else if (Math.abs(dy) > 25) { setExpanded(dy < 0); } }}
          onPointerCancel={() => { drag.current = null; }}><span /></button>
        <Action icon={X} aria-label="Tutup panel" onClick={() => setSheet(null)} />
      </div>
      <div className={styles.sheetContent}>{sheet === "workflow" ? workflow : sheet === "log" ? log : <>
        <h2>Measurement & Tools</h2><div className={styles.buttonGrid}>{toolButtons}</div>
        <h2>{procedure === "tka" ? "Knee Axis Analysis" : "Pelvic Analysis"}</h2>
        <div className={styles.buttonGrid}>{analysisTools.map((item) => <Action key={item.id} icon={item.icon} onClick={() => activate(item.action)}>{item.label}</Action>)}</div>
      </>}</div>
    </div>}
  </div>;
}
