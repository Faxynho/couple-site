import { describe, expect, it } from "vitest";
import { formatIdleNumber } from "@/lib/formatIdleNumber";

describe("formatIdleNumber", () => {
  it("usa sufixos consistentes para a economia idle", () => {
    expect(formatIdleNumber(999)).toBe("999");
    expect(formatIdleNumber(1_000)).toBe("1K");
    expect(formatIdleNumber(1_500_000)).toBe("1,5M");
    expect(formatIdleNumber(1_000_000_000)).toBe("1B");
    expect(formatIdleNumber(1_000_000_000_000)).toBe("1T");
  });
});
