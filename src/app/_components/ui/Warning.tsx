interface WarningProps {
  message: string;
}

export function Warning({ message }: WarningProps) {
  return (
    <div className="items-cente mt-2 flex p-1 align-bottom">
      <p className="mt-1 text-[10px] text-red-800">{message}</p>
    </div>
  );
}
