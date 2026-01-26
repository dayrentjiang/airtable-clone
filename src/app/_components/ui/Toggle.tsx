interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: "sm" | "md";
}

export function Toggle({ enabled, onChange, size = "sm" }: ToggleProps) {
  const sizeClasses = {
    sm: {
      container: "h-2.5 w-4.5",
      dot: "h-1.5 w-1.5",
      translate: enabled ? "translate-x-2.5" : "translate-x-0.5",
    },
    md: {
      container: "h-6 w-11",
      dot: "h-5 w-5",
      translate: enabled ? "translate-x-5" : "translate-x-0.5",
    },
  };

  const classes = sizeClasses[size];

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${classes.container} items-center rounded-full transition-colors ${
        enabled ? "bg-green-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block ${classes.dot} transform rounded-full bg-white transition-transform ${classes.translate}`}
      />
    </button>
  );
}
