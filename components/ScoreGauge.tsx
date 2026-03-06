type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
};

export default function ScoreGauge({
  score,
  size = 88,
  strokeWidth = 8,
  showLabel = true,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // hue: 0 (red) → 60 (yellow) → 120 (green) as score 0 → 100
  const hue = (clamped / 100) * 120;
  // desaturate and darken slightly for readability
  const saturation = clamped < 10 ? 70 : 80;
  const lightness = clamped < 10 ? 45 : clamped > 90 ? 38 : 42;
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ color, fontSize: size < 72 ? 14 : 18 }}
          >
            {clamped}
          </span>
          {size >= 72 && (
            <span className="text-xs text-gray-400 leading-none mt-0.5">/ 100</span>
          )}
        </div>
      )}
    </div>
  );
}
