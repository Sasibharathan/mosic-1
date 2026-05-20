import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

export default function TextArea({
  value,
  onChange,
  className = "",
  rows = 4,
  ...props
}: TextAreaProps) {
  return (
    <textarea
      {...props}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs outline-none transition-colors focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 ${className}`}
    />
  );
}

