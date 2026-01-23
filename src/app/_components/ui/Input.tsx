"use client";

interface InputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export function Input({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  className = "",
}: InputProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-gray-300 px-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-700 focus:ring-1 focus:ring-blue-400 focus:outline-none"
      />
    </div>
  );
}
