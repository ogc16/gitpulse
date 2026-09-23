import { describe, expect, it } from "vitest";
import { clamp, round1 } from "../lib/curism";

describe("clamp", () => {
  it("keeps values within default 0..10 range", () => {
    expect(clamp(5)).toBe(5);
    expect(clamp(-1)).toBe(0);
    expect(clamp(12)).toBe(10);
  });

  it("respects a custom min/max range", () => {
    expect(clamp(1.5, 2, 4)).toBe(2);
    expect(clamp(9, 2, 4)).toBe(4);
  });

  it("handles boundary values without mutation", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(10)).toBe(10);
  });
});

describe("round1", () => {
  it("rounds to one decimal place", () => {
    expect(round1(3.14159)).toBe(3.1);
    expect(round1(56.55)).toBe(56.6);
  });

  it("keeps integers intact", () => {
    expect(round1(4)).toBe(4);
    expect(round1(0)).toBe(0);
  });
});