"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import DriveImageWithFallback from "./media/DriveImageWithFallback";
import {
  SOFT_SURFACE_CLASS,
  SOFT_RAISED_CLASS,
  SOFT_INSET_CLASS,
  SOFT_PRIMARY_BUTTON_CLASS,
  PANEL_VARIANTS,
} from "@/lib/uiTokens";

const TEMPLATE_GROUPS = [
  { key: "all", label: "Semua" },
  { key: "femoral", label: "Femoral" },
  { key: "tibial", label: "Tibia" },
];

function getTemplateGroup(template) {
  const signature = [
    template?.id,
    template?.name,
    template?.label,
    template?.category,
    template?.system,
    template?.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(tibial|tibia)\b|(?:^|[-_])tib(?:[-_]|$)/.test(signature)) {
    return "tibial";
  }
  if (/\b(femoral|femur)\b|(?:^|[-_])fem(?:[-_]|$)/.test(signature)) {
    return "femoral";
  }
  return "other";
}

export default function TemplateStoragePicker({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onUseTemplate,
  onUseSelectedTemplate,
  onRemoveTemplate,
  onRefreshTemplates,
  refreshDisabled,
  syncing,
  sourceLabel,
  compact = false,
}) {
  const [activeGroup, setActiveGroup] = useState("all");
  const groupCounts = useMemo(
    () =>
      templates.reduce(
        (result, template) => {
          const group = getTemplateGroup(template);
          result.all += 1;
          if (group === "femoral" || group === "tibial") result[group] += 1;
          return result;
        },
        { all: 0, femoral: 0, tibial: 0 },
      ),
    [templates],
  );
  const visibleTemplates = useMemo(
    () =>
      activeGroup === "all"
        ? templates
        : templates.filter(
            (template) => getTemplateGroup(template) === activeGroup,
          ),
    [activeGroup, templates],
  );

  const selectGroup = (group) => {
    setActiveGroup(group);
    if (group === "all") return;
    const selectedStillVisible = templates.some(
      (template) =>
        String(template.id) === String(selectedTemplateId) &&
        getTemplateGroup(template) === group,
    );
    if (selectedStillVisible) return;
    const firstTemplate = templates.find(
      (template) => getTemplateGroup(template) === group,
    );
    if (firstTemplate) onSelectTemplate(firstTemplate.id);
  };

  return (
    <motion.div
      layout
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex flex-col gap-2 p-3 ${SOFT_SURFACE_CLASS}`}
    >
      <div className="flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-slate-600" />
        <span className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
          {compact ? "Template" : "Template Library"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
        <span>Library: {templates.length}</span>
        <span
          className={`${compact ? "max-w-[110px]" : "max-w-[170px]"} truncate`}
        >
          Source: {sourceLabel}
        </span>
      </div>

      <div
        className={`grid gap-1.5 ${compact ? "grid-cols-1" : "grid-cols-2"}`}
      >
        <button
          type="button"
          onClick={onRefreshTemplates}
          disabled={refreshDisabled}
          className={`inline-flex h-8 items-center gap-1 px-3 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 ${SOFT_RAISED_CLASS}`}
          title="Sync template dari Appwrite"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
          />
          {compact ? "Sync" : "Sync"}
        </button>
        <button
          type="button"
          onClick={onUseSelectedTemplate}
          disabled={!selectedTemplateId}
          className={`inline-flex h-8 items-center gap-1 px-3 text-[11px] text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${SOFT_PRIMARY_BUTTON_CLASS}`}
          title="Gunakan template terpilih ke canvas"
        >
          <Layers className="h-3.5 w-3.5" />
          {compact ? "Pakai" : "Gunakan"}
        </button>
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-md border border-slate-200 bg-slate-100/70 p-1"
        role="tablist"
        aria-label="Kelompok template"
      >
        {TEMPLATE_GROUPS.map((group) => {
          const active = activeGroup === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => selectGroup(group.key)}
              className={`min-h-8 rounded px-1.5 text-[9px] font-black transition ${
                active
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white/80 hover:text-slate-800"
              }`}
              role="tab"
              aria-selected={active}
            >
              {group.label}
              <small className="ml-1 opacity-60">
                {groupCounts[group.key] || 0}
              </small>
            </button>
          );
        })}
      </div>

      {templates.length === 0 ? (
        <div
          className={`${SOFT_INSET_CLASS} px-3 py-3 text-[11px] text-slate-500`}
        >
          Belum ada template dari storage.
        </div>
      ) : (
        <div className="max-h-44 space-y-1.5 overflow-y-auto">
          {visibleTemplates.length === 0 ? (
            <div
              className={`${SOFT_INSET_CLASS} px-3 py-3 text-center text-[10px] text-slate-500`}
            >
              Belum ada template{" "}
              {activeGroup === "tibial" ? "Tibia" : "Femoral"}.
            </div>
          ) : null}
          {visibleTemplates.map((template) => {
            const isSelected =
              String(template.id) === String(selectedTemplateId);
            return (
              <div
                key={template.id}
                className={`p-2 ${
                  isSelected
                    ? `${SOFT_SURFACE_CLASS} ring-1 ring-rose-300`
                    : SOFT_SURFACE_CLASS
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className="flex w-full items-center gap-2 text-left"
                  title={template.name}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden ${SOFT_SURFACE_CLASS}`}
                  >
                    {template.imageSrc ? (
                      <DriveImageWithFallback
                        src={template.imageSrc}
                        driveId={template.driveId}
                        alt={template.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium text-slate-700">
                      {template.name || "Untitled Template"}
                    </div>
                    {!compact ? (
                      <div className="text-[10px] text-slate-500">
                        {template.sourceWidth && template.sourceHeight
                          ? `${template.sourceWidth}x${template.sourceHeight}`
                          : "size: auto"}
                      </div>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-rose-500" />
                  ) : null}
                </button>

                <div
                  className={`mt-1 grid gap-1 ${compact ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  <button
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    className={`inline-flex h-8 items-center gap-1 px-2 text-[10px] text-slate-800 ${SOFT_PRIMARY_BUTTON_CLASS}`}
                    title="Tambahkan template ini ke canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {compact ? "Pakai" : "Layer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveTemplate(template.id)}
                    className={`inline-flex h-8 items-center gap-1 px-2 text-[10px] text-rose-600 ${SOFT_RAISED_CLASS}`}
                    title="Hapus template dari library lokal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {compact ? "Hapus" : "Hapus"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
