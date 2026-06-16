/** Star rating — read-only display, or interactive (click to set) when onChange given. */
import { StarIcon } from "./icons";

export function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "transition hover:scale-110" : "cursor-default"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <StarIcon filled={n <= Math.round(value)} width={size} height={size} />
        </button>
      ))}
    </div>
  );
}
