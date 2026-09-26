"use client";

import { Pencil } from "lucide-react";

export default function LayerNameInput({ layer, defaultName, onRename }) {
  const name = layer.name || defaultName;

  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block text-[10px] font-semibold text-[var(--soft-text)]">
        Nama layer
      </span>
      <span className="relative block">
        <input
          key={`${layer.id}:${name}`}
          type="text"
          defaultValue={name}
          maxLength={120}
          onBlur={(event) => {
            const nextName = event.target.value.trim();
            if (nextName && nextName !== name) onRename(nextName);
            else event.target.value = name;
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.currentTarget.value = name;
              event.currentTarget.blur();
            } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="h-10 w-full min-w-0 rounded-md border border-[var(--soft-border)] py-1.5 pl-2 pr-8 text-base font-semibold text-[var(--soft-text-hi)] outline-none [background:var(--soft-inset-bg)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:h-9 sm:text-xs"
        />
        <Pencil aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-500" />
      </span>
    </label>
  );
}
