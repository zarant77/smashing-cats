export function normalizeSnapshotTick(snapshotTick: number | undefined): number | undefined {
  if (snapshotTick === undefined || !Number.isFinite(snapshotTick)) {
    return undefined;
  }

  return Math.max(0, Math.floor(snapshotTick));
}

export function normalizeInputSeq(inputSeq: number | undefined, fallback: number): number {
  if (inputSeq === undefined || !Number.isFinite(inputSeq)) {
    return fallback;
  }

  return Math.max(fallback, Math.floor(inputSeq));
}
