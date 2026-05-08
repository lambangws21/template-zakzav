"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Trash2,
} from "lucide-react";
import DriveImageWithFallback from "./DriveImageWithFallback";

const SOFT_SURFACE_CLASS =
  "rounded-[24px] border border-white/78 bg-[linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] shadow-[10px_10px_22px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.34)]";
const SOFT_RAISED_CLASS =
  "rounded-[18px] border border-white/82 bg-[linear-gradient(180deg,#fbfdff_0%,#ecf1f6_100%)] shadow-[6px_6px_14px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.28)]";
const SOFT_INSET_CLASS =
  "rounded-[18px] border border-white/82 bg-[linear-gradient(180deg,#eef2f7_0%,#f9fbfd_100%)] shadow-[inset_6px_6px_12px_rgba(71,85,105,0.12),inset_-3px_-3px_8px_rgba(255,255,255,0.26)]";
const SOFT_PRIMARY_BUTTON_CLASS =
  "rounded-[18px] border border-[#d8fff1] bg-[linear-gradient(180deg,#ddfff2_0%,#c5f3e6_100%)] shadow-[8px_8px_18px_rgba(16,185,129,0.12),-2px_-2px_6px_rgba(255,255,255,0.24)]";

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
  return (
    <motion.div
      layout
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

      {templates.length === 0 ? (
        <div
          className={`${SOFT_INSET_CLASS} px-3 py-3 text-[11px] text-slate-500`}
        >
          Belum ada template dari storage.
        </div>
      ) : (
        <div className="max-h-44 space-y-1.5 overflow-y-auto">
          {templates.map((template) => {
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
