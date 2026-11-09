// Legacy preview arithmetic, retained for old snapshots and explicit review.
// Official tutorial-v1 crawlers use ten slots and the rules in tutorial.ts.
export function calculateMaxHealthSegments(baseSegments: number, constitution: number,): number {
  if (
    !Number.isInteger(baseSegments) ||
    baseSegments < 1 ||
    baseSegments > 10_000
  ) {
    throw new RangeError(
      'Base health segments must be an integer from 1 to 10000.',
    );
  }

  if (
    !Number.isInteger(constitution) ||
    constitution < 0 ||
    constitution > 10_000
  ) {
    throw new RangeError(
      'Constitution must be an integer from 0 to 10000.',
    );
  }

  const constitutionModifier = Math.floor((constitution - 10) / 2);

  return Math.max(1, baseSegments + constitutionModifier);
}

export function adjustHealthSegments(
  currentSegments: number,
  maximumSegments: number,
  adjustment: number,
): number {
  if (!Number.isSafeInteger(maximumSegments) || maximumSegments < 1) {
    throw new RangeError('Maximum health must be a positive safe integer.');
  }

  if (
    !Number.isSafeInteger(currentSegments) ||
    currentSegments < 0 ||
    currentSegments > maximumSegments
  ) {
    throw new RangeError(
      'Current health must be an integer between zero and maximum health.',
    );
  }

  if (!Number.isSafeInteger(adjustment)) {
    throw new RangeError('Health adjustment must be a safe integer.');
  }

  return Math.min(
    maximumSegments,
    Math.max(0, currentSegments + adjustment),
  );
}
