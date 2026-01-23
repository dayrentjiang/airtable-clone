interface DividerProps {
  text?: string;
}

export function Divider({ text }: DividerProps) {
  return (
    <div className="my-5 flex items-center">
      <div className="flex-1 border-t border-gray-200" />
      {text && <span className="px-4 text-sm text-gray-500">{text}</span>}
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}
