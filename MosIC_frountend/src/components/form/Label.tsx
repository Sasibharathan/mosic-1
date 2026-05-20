import type { LabelHTMLAttributes } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={`mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    />
  );
}

