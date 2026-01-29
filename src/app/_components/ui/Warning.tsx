interface WarningProps {
  message: string;
}

export function Warning({ message }: WarningProps) {
  return <p className="mt-2 text-xs text-red-600">{message}</p>;
}
