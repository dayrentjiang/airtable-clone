"use client";

interface AuthButtonProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

export function AuthButton({
  onClick,
  icon,
  children,
  variant = "outline",
  type = "button",
  disabled = false,
  className = "",
}: AuthButtonProps) {
  const baseStyles =
    "w-full h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-[#166EE1] hover:bg-[#1259B8] text-white font-semibold disabled:bg-[#166EE1]/50",
    outline:
      "border border-gray-200 hover:border-gray-300 text-gray-700 shadow-xs disabled:opacity-50",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
