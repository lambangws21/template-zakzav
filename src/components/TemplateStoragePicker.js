"use client";

import { CheckCircle2, Image as ImageIcon, Layers, Plus, RefreshCw, Trash2 } from "lucide-react";
import DriveImageWithFallback from "./DriveImageWithFallback";

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
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
        <span>Library: {templates.length}</span>
        <span>Source: {sourceLabel}</span>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onRefreshTemplates}
          disabled={refreshDisabled}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Sync template dari Appwrite"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync
        </button>
        <button
          type="button"
          onClick={onUseSelectedTemplate}
          disabled={!selectedTemplateId}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Gunakan template terpilih ke canvas"
        >
          <Layers className="h-3.5 w-3.5" />
          Gunakan
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-2 text-[11px] text-slate-500">
          Belum ada template dari storage.
        </div>
      ) : (
        <div className="max-h-44 space-y-1.5 overflow-y-auto">
          {templates.map((template) => {
            const isSelected = String(template.id) === String(selectedTemplateId);
            return (
              <div
                key={template.id}
                className={`rounded-md border bg-white p-1.5 ${
                  isSelected ? "border-cyan-400 ring-1 ring-cyan-300" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className="flex w-full items-center gap-2 text-left"
                  title={template.name}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
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
                    <div className="text-[10px] text-slate-500">
                      {template.sourceWidth && template.sourceHeight
                        ? `${template.sourceWidth}x${template.sourceHeight}`
                        : "size: auto"}
                    </div>
                  </div>
                  {isSelected ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : null}
                </button>

                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[10px] text-slate-700"
                    title="Tambahkan template ini ke canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Layer
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveTemplate(template.id)}
                    className="inline-flex h-7 items-center gap-1 rounded border border-rose-300 bg-white px-2 text-[10px] text-rose-700"
                    title="Hapus template dari library lokal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
