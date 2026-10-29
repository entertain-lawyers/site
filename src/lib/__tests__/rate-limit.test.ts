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
