// Detection signals for job analysis
import type { DetectionSignal } from '../../types';

export function createSignal(
  id: string,
  name: string,
  weight: number,
  value: number,
  description: string
): DetectionSignal {
  return {
    id,
    name,
    weight,
    value,
    normalizedValue: Math.min(Math.max(value, 0), 1),
    description,
  };
}

export function calculateConfidence(signals: DetectionSignal[]): number {
  if (signals.length === 0) return 0;

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = signals.reduce((sum, s) => sum + s.normalizedValue * s.weight, 0);

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
