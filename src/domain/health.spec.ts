import { describe, expect, it } from 'vitest';
import {
  adjustHealthSegments,
  calculateMaxHealthSegments,
} from './health';

describe('calculateMaxHealthSegments', () => {
  it.each([
    [10, 10, 10],
    [10, 14, 12],
    [10, 9, 9],
    [10, 7, 8],
    [1, 0, 1],
  ])(
    'base %i and Constitution %i produce %i segments',
    (baseSegments, constitution, expected) => {
      expect(
        calculateMaxHealthSegments(baseSegments, constitution),
      ).toBe(expected);
    },
  );

  it.each([
    [0, 10],
    [10_001, 10],
    [10, -1],
    [10, 10_001],
    [10, 9.5],
  ])(
    'rejects invalid inputs: base %i, Constitution %i',
    (baseSegments, constitution) => {
      expect(() =>
        calculateMaxHealthSegments(baseSegments, constitution),
      ).toThrow(RangeError);
    },
  );
});
describe('adjustHealthSegments', () => {
  it.each([
    [10, 10, -3, 7],
    [7, 10, 2, 9],
    [2, 10, -5, 0],
    [9, 10, 5, 10],
    [7, 10, 0, 7],
  ])(
    'adjusts %i of %i segments by %i to produce %i',
    (current, maximum, adjustment, expected) => {
      expect(
        adjustHealthSegments(current, maximum, adjustment),
      ).toBe(expected);
    },
  );

  it.each([
    [-1, 10, 1],
    [11, 10, -1],
    [0, 0, 1],
    [5, 10, 1.5],
    [5, 10, Number.NaN],
  ])(
    'rejects invalid health inputs: %s, %s, %s',
    (current, maximum, adjustment) => {
      expect(() =>
        adjustHealthSegments(current, maximum, adjustment),
      ).toThrow(RangeError);
    },
  );
});