interface CharacterCounterProps {
  current: number;
  max: number;
}

export default function CharacterCounter({ current, max }: CharacterCounterProps) {
  const remaining = max - current;
  const percentage = (current / max) * 100;
  const isAtLimit = remaining <= 0;
  const isNearLimit = percentage >= 90;

  return (
    <div className="mt-1 flex items-center justify-end gap-2">
      {isAtLimit && (
        <span className="text-xs font-medium text-rose-400 animate-pulse">
          Character limit reached
        </span>
      )}
      {!isAtLimit && isNearLimit && (
        <span className="text-xs font-medium text-amber-400">
          {remaining} character{remaining === 1 ? "" : "s"} remaining
        </span>
      )}
      <span
        className={`text-xs tabular-nums ${
          isAtLimit
            ? "font-semibold text-rose-400"
            : isNearLimit
              ? "font-medium text-amber-400"
              : "text-slate-500"
        }`}
      >
        {current} / {max}
      </span>
    </div>
  );
}
