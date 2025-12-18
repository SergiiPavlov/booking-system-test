export function isOverlapping(
  aStart: Date,
  aDurationMin: number,
  bStart: Date,
  bDurationMin: number
): boolean {
  const aEnd = new Date(aStart.getTime() + aDurationMin * 60_000);
  const bEnd = new Date(bStart.getTime() + bDurationMin * 60_000);
  return aStart < bEnd && aEnd > bStart;
}
