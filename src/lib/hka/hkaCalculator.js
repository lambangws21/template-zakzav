import { angleBetweenLines } from "./geometry";

export function calculateFullLengthHKA({
  femoralHead,
  kneeCenter,
  ankleCenter,
  side = "right",
}) {
  const rawAngle = angleBetweenLines(
    femoralHead,
    kneeCenter,
    kneeCenter,
    ankleCenter,
  );
  if (rawAngle === null) return null;

  const deviation = rawAngle;

  return {
    absoluteDeviation: Number(deviation.toFixed(2)),
    side,
  };
}

export function classifyAlignment(value, direction) {
  if (value === null || Number.isNaN(value)) return "Belum lengkap";
  if (value < 3) return "Neutral / hampir netral";
  if (direction === "varus") return `Varus ±${value.toFixed(1)}°`;
  if (direction === "valgus") return `Valgus ±${value.toFixed(1)}°`;
  return `Deviasi ±${value.toFixed(1)}°`;
}
