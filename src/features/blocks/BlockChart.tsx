import { useId } from "react";
import * as styles from "./blocks.css";

type Point = { block: number; value: number };

export function BlockChart({
  label,
  points,
  unit,
}: {
  label: string;
  points: Point[];
  unit: string;
}) {
  const titleId = useId();
  if (!points.length)
    return <p className={styles.chartEmpty}>Waiting for consecutive blocks</p>;
  const maximum = Math.max(1, ...points.map((point) => point.value));
  const step = 300 / points.length;
  return (
    <svg
      viewBox="0 0 300 80"
      className={styles.chart}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {label}:{" "}
        {points
          .map((point) => `block ${point.block}: ${point.value} ${unit}`)
          .join(", ")}
      </title>
      <line x1="0" y1="65" x2="300" y2="65" className={styles.chartAxis} />
      {points.map((point, index) => {
        const height = Math.max(2, (point.value / maximum) * 50);
        return (
          <rect
            key={point.block}
            x={index * step + 2}
            y={65 - height}
            width={Math.max(1, step - 5)}
            height={height}
            className={styles.chartBar}
          >
            <title>
              #{point.block}: {point.value} {unit}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
