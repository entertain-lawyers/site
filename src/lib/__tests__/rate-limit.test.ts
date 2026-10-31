import { beforeEach, describe, expect, it, vi } from "vitest";

// `rate-limit.ts` reads the parsed env at call time, so the mock exposes a
// mutable object and each test sets the flags it needs.
const state = vi.hoisted(() => ({
  env: {
    NODE_ENV: "production",
    RATE_LIMITING_ENABLED: "false",
    UPSTASH_REDIS_REST_URL: "https://dummy.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "dummy",
  },
}));

vi.mock("@/env", () => ({ env: state.env }));

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    state.env.RATE_LIMITING_ENABLED = "false";
  });

  it("limits in memory when RATE_LIMITING_ENABLED is off", async () => {
    const key = `disabled-${Date.now()}-${Math.random()}`;

    const first = await rateLimit(key, 2, 60);
    const second = await rateLimit(key, 2, 60);
    const third = await rateLimit(key, 2, 60);

    expect([first.success, second.success, third.success]).toEqual([true, true, false]);
  });

  it("falls back to per-process limiting when enabled without Upstash", async () => {
    state.env.RATE_LIMITING_ENABLED = "true";
    const key = `enabled-${Date.now()}-${Math.random()}`;

    const first = await rateLimit(key, 2, 60);
    const second = await rateLimit(key, 2, 60);
    const third = await rateLimit(key, 2, 60);

    expect([first.success, second.success, third.success]).toEqual([true, true, false]);
  });
});

describe("rateLimit in-memory cleanup (regression)", () => {
  it("does not reset a long-window counter when a short-window caller cleans up", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0); // force cleanup on every call
    try {
      const loginKey = `login:account:${Date.now()}-${Math.random()}`;
      for (let i = 0; i < 3; i++) {
        expect((await rateLimit(loginKey, 3, 900)).success).toBe(true);
      }

      // A 60-second limiter (e.g. page-view beacons) runs its cleanup pass.
      await rateLimit(`page-view:${Date.now()}`, 60, 60);

      expect((await rateLimit(loginKey, 3, 900)).success).toBe(false);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("keeps separate budgets for the same identifier under different windows", async () => {
    const key = `shared-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(key, 1, 60)).success).toBe(true);
    expect((await rateLimit(key, 1, 900)).success).toBe(true);
    expect((await rateLimit(key, 1, 60)).success).toBe(false);
  });

  it("starts a fresh budget once the window has passed", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-30T10:00:05Z"));
      const key = `expiry-${Math.random()}`;
      expect((await rateLimit(key, 1, 60)).success).toBe(true);
      expect((await rateLimit(key, 1, 60)).success).toBe(false);

      vi.setSystemTime(new Date("2026-10-30T10:01:05Z"));
      expect((await rateLimit(key, 1, 60)).success).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
