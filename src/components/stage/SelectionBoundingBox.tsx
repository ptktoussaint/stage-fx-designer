interface SelectionBoundingBoxProps {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function SelectionBoundingBox({ minX, minY, maxX, maxY }: SelectionBoundingBoxProps) {
  const padding = 14;
  return (
    <rect
      x={minX - padding}
      y={minY - padding}
      width={maxX - minX + padding * 2}
      height={maxY - minY + padding * 2}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={1}
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  );
}
