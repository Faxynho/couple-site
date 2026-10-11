import { expect, test } from "vitest";
import { isExperimental } from "../lib/experimental";

test("recurso experimental só aparece quando o backend o lista (jogo normal sempre vazio)", () => {
  expect(isExperimental({ experimentalFeatures: ["mundo-novo"] }, "mundo-novo")).toBe(true);
  expect(isExperimental({ experimentalFeatures: [] }, "mundo-novo")).toBe(false);
  expect(isExperimental({}, "mundo-novo")).toBe(false);
  expect(isExperimental(null, "mundo-novo")).toBe(false);
});
