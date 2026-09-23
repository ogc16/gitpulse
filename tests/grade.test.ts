import { describe, expect, it } from "vitest";
import { gradeColor, gradeFor, CURISM_LABELS, CURISM_ORDER } from "../lib/curism";

describe("gradeFor", () => {
  it("assigns S+ at or above 89.1", () => {
    expect(gradeFor(89.1)).toBe("S+");
    expect(gradeFor(100)).toBe("S+");
  });

  it("assigns S between 73.4 and 89.09", () => {
    expect(gradeFor(73.4)).toBe("S");
    expect(gradeFor(89)).toBe("S");
  });

  it("assigns A between 58.9 and 73.39", () => {
    expect(gradeFor(58.9)).toBe("A");
    expect(gradeFor(73.3)).toBe("A");
  });

  it("assigns B between 50.1 and 58.89", () => {
    expect(gradeFor(50.1)).toBe("B");
    expect(gradeFor(58.8)).toBe("B");
  });

  it("assigns C below 50.1", () => {
    expect(gradeFor(50)).toBe("C");
    expect(gradeFor(0)).toBe("C");
    expect(gradeFor(34.4)).toBe("C");
  });
});

describe("gradeColor", () => {
  it("returns distinct class strings per grade", () => {
    const grades = ["S+", "S", "A", "B", "C"];
    const colors = grades.map(gradeColor);
    expect(new Set(colors).size).toBe(grades.length);
  });

  it("falls back to slate for unknown grades", () => {
    expect(gradeColor("F")).toBe(gradeColor("C"));
  });
});

describe("CURISM labels and order", () => {
  it("labels all six keys", () => {
    expect(Object.keys(CURISM_LABELS).sort()).toEqual(["C", "I", "M", "R", "S", "U"]);
    expect(CURISM_LABELS.S).toBe("Security");
    expect(CURISM_LABELS.U).toBe("Uniqueness");
  });

  it("keeps the C-U-R-I-S-M display order", () => {
    expect(CURISM_ORDER).toEqual(["C", "U", "R", "I", "S", "M"]);
  });
});