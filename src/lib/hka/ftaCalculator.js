import { angleBetweenLines } from "./geometry";

export function predictHKAAFromFTA(fta) {
  if (fta === null || Number.isNaN(fta)) return null;
  return Number((-2.182 + fta * 0.995).toFixed(2));
}

export function calculateFTA({
  femurMidshaft10cm,
  femoralNotch,
  tibiaMidshaft4cm,
  tibiaMidshaft10cm,
}) {
  const fta = angleBetweenLines(
    femurMidshaft10cm,
    femoralNotch,
    tibiaMidshaft4cm,
    tibiaMidshaft10cm,
  );

  if (fta === null) return null;
  return Number(fta.toFixed(2));
}
