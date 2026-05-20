type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
};

export default function Checkbox({
  checked,
  onChange,
  className = "",
  disabled,
}: CheckboxProps) {
  return (
    <label
      className={`inline-flex select-none items-center ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 bg-white shadow-theme-xs transition-colors peer-checked:border-brand-500 peer-checked:bg-brand-500 dark:border-gray-700 dark:bg-gray-900">
        <svg
          className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16.666 5L7.5 14.167 3.333 10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

