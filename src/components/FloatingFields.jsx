"use client";

export function FloatingInputField({
  value,
  onChange,
  label,
  required = false,
  containerClass = "",
  inputClassName = "",
  labelClassName = "",
  ...inputProps
}) {
  return (
    <div className={`relative ${containerClass}`}>
      <input
        value={value}
        onChange={onChange}
        placeholder=" "
        className={`peer h-12 w-full rounded-xl border border-indigo-200 bg-white px-4 pb-1 pt-5 text-sm text-slate-900 outline-none placeholder-transparent transition focus:border-indigo-400 ${inputClassName}`}
        {...inputProps}
      />
      <span
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded bg-white px-1 text-sm text-slate-500 transition-all duration-150 peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-indigo-600 peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:font-semibold peer-[&:not(:placeholder-shown)]:text-indigo-600 ${labelClassName}`}
      >
        {label}
        {required ? " *" : ""}
      </span>
    </div>
  );
}

export function FloatingTextareaField({
  value,
  onChange,
  label,
  required = false,
  rows = 3,
  containerClass = "",
  textareaClassName = "",
  labelClassName = "",
  ...textareaProps
}) {
  return (
    <div className={`relative ${containerClass}`}>
      <textarea
        value={value}
        onChange={onChange}
        placeholder=" "
        rows={rows}
        className={`peer w-full rounded-xl border border-indigo-200 bg-white px-4 pb-2 pt-6 text-sm text-slate-900 outline-none placeholder-transparent transition focus:border-indigo-400 ${textareaClassName}`}
        {...textareaProps}
      />
      <span
        className={`pointer-events-none absolute left-3 top-4 rounded bg-white px-1 text-[11px] font-semibold text-indigo-600 ${labelClassName}`}
      >
        {label}
        {required ? " *" : ""}
      </span>
    </div>
  );
}

export function FloatingSelectField({
  value,
  onChange,
  label,
  required = false,
  containerClass = "",
  selectClassName = "",
  labelClassName = "",
  children,
  ...selectProps
}) {
  return (
    <div className={`relative ${containerClass}`}>
      <select
        value={value}
        onChange={onChange}
        className={`h-12 w-full rounded-xl border border-indigo-200 bg-white px-4 pb-1 pt-5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 ${selectClassName}`}
        {...selectProps}
      >
        {children}
      </select>
      <span
        className={`pointer-events-none absolute left-3 top-0 rounded bg-white px-1 text-[11px] font-semibold text-indigo-600 ${labelClassName}`}
      >
        {label}
        {required ? " *" : ""}
      </span>
    </div>
  );
}
