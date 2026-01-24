interface TooltipProps {
  text: string;
  visible: boolean;
  position?: "top" | "right" | "bottom" | "left";
  delay?: number;
}

export function Tooltip({
  text,
  visible,
  position = "right",
  delay = 400,
}: TooltipProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
  };

  return (
    <div
      className={`pointer-events-none absolute rounded bg-gray-700 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg transition-opacity duration-100 ${positionClasses[position]}`}
      style={{
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${delay}ms` : "0ms",
      }}
    >
      {text}
    </div>
  );
}
