"use client";

type RadarAxis = {
  label: string;
  value: number; // 0-100
  color?: string;
};

type Props = {
  axes: RadarAxis[];
  playerColor?: string;
  avgColor?: string;
  avgAxes?: RadarAxis[];
  size?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export function PlayerRadarChart({ axes, avgAxes, playerColor = "#E63946", avgColor = "rgba(255,255,255,0.15)", size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  // Start from top (-π/2)
  const startAngle = -Math.PI / 2;

  // Generate polygon points for a given set of values (0-100)
  const polygonPoints = (vals: number[]) => {
    return vals
      .map((val, i) => {
        const angle = startAngle + i * angleStep;
        const r = (val / 100) * radius;
        const p = polarToCartesian(cx, cy, r, angle);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  };

  // Grid circles (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Axis end points
  const axisPoints = axes.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return polarToCartesian(cx, cy, radius, angle);
  });

  // Label positions (slightly outside radius)
  const labelPoints = axes.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return polarToCartesian(cx, cy, radius + 22, angle);
  });

  const playerVals = axes.map((a) => Math.max(0, Math.min(100, a.value)));
  const avgVals = avgAxes ? avgAxes.map((a) => Math.max(0, Math.min(100, a.value))) : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      {/* Grid circles */}
      {gridLevels.map((lvl, gi) => (
        <circle
          key={gi}
          cx={cx}
          cy={cy}
          r={radius * lvl}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Grid percentage labels (inner) */}
      {gridLevels.slice(0, 3).map((lvl, gi) => (
        <text
          key={gi}
          x={cx + 4}
          y={cy - radius * lvl + 4}
          fill="rgba(255,255,255,0.3)"
          fontSize="8"
          fontFamily="monospace"
        >
          {(lvl * 100).toFixed(0)}
        </text>
      ))}

      {/* Axis lines */}
      {axisPoints.map((pt, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Community average polygon */}
      {avgVals && (
        <polygon
          points={polygonPoints(avgVals)}
          fill={avgColor}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
      )}

      {/* Player polygon */}
      <polygon
        points={polygonPoints(playerVals)}
        fill={`${playerColor}33`}
        stroke={playerColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Player dots */}
      {playerVals.map((val, i) => {
        const angle = startAngle + i * angleStep;
        const r = (val / 100) * radius;
        const pt = polarToCartesian(cx, cy, r, angle);
        return (
          <circle key={i} cx={pt.x} cy={pt.y} r={4} fill={playerColor} />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const lp = labelPoints[i];
        const angle = startAngle + i * angleStep;
        // Adjust text-anchor based on angle
        let anchor: "start" | "middle" | "end" = "middle";
        if (Math.cos(angle) > 0.1) anchor = "start";
        if (Math.cos(angle) < -0.1) anchor = "end";

        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y + 4}
            textAnchor={anchor}
            fill="rgba(255,255,255,0.75)"
            fontSize="10"
            fontWeight="600"
            fontFamily="inherit"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
