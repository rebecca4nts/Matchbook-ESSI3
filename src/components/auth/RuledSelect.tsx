import type { ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface RuledSelectProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}

export function RuledSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: RuledSelectProps) {
  return (
    <label className="block">
      <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2 border-b border-[#1B2530]/25 focus-within:border-[#8C3B2E] transition-colors pb-2">
        {Icon && <Icon size={16} className="text-[#1B2530]/40 shrink-0" />}
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full bg-transparent outline-none text-[15px] text-[#1B2530] disabled:text-[#1B2530]/30"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
