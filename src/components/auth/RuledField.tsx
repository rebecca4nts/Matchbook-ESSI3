import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface RuledFieldProps {
  label: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  icon?: LucideIcon;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  trailing?: ReactNode;
}

export function RuledField({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  trailing,
}: RuledFieldProps) {
  return (
    <label className="block">
      <span className="block text-[13px] text-[#5C6B4F] mb-1.5 font-medium tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2 border-b border-[#1B2530]/25 focus-within:border-[#8C3B2E] transition-colors pb-2">
        {Icon && <Icon size={16} className="text-[#1B2530]/40 shrink-0" />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[15px] text-[#1B2530] placeholder:text-[#1B2530]/30"
        />
        {trailing}
      </div>
    </label>
  );
}
