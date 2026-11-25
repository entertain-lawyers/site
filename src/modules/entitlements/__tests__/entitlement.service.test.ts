import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn(), findMany: vi.fn() },
    resource: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAccessibleResourceIds } from "../entitlement.service";
import type { Mock } from "vitest";

const mock = (fn: unknown) => fn as Mock;

describe("getAccessibleResourceIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates anonymous visitors without querying Prisma", async () => {
    const ids = await getAccessibleResourceIds(undefined, [
      { id: "r-other-free", type: "OTHER", isPremium: false },
      { id: "r-note-free", type: "LAW_NOTE", isPremium: false },
      { id: "r-case-free", type: "CASE_LAW", isPremium: false },
      { id: "r-other-premium", type: "OTHER", isPremium: true },
    ]);

    expect([...ids]).toEqual(["r-other-free"]);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.entitlement.findFirst).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("allows free published resources for signed-in users without querying premium entitlements", async () => {
    const ids = await getAccessibleResourceIds("user-1", [
      { id: "r-free", type: "LAW_NOTE", isPremium: false, status: "PUBLISHED" },
      { id: "r-draft", type: "LAW_NOTE", isPremium: false, status: "DRAFT" },
    ]);

    expect([...ids]).toEqual(["r-free"]);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("grants ADMIN and EDITOR users access to all published premium resources in a single batch check", async () => {
    mock(prisma.user.findUnique).mockResolvedValue({ role: "EDITOR" });
    mock(prisma.entitlement.findFirst).mockResolvedValue(null);

    const ids = await getAccessibleResourceIds("editor-1", [
      { id: "r-1", type: "LAW_NOTE", isPremium: true },
      { id: "r-2", type: "CASE_LAW", isPremium: true },
    ]);

    expect([...ids]).toEqual(["r-1", "r-2"]);
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("grants active subscription holders access to all premium resources", async () => {
    mock(prisma.user.findUnique).mockResolvedValue({ role: "USER" });
    mock(prisma.entitlement.findFirst).mockResolvedValue({ id: "sub-ent-1" });

    const ids = await getAccessibleResourceIds("sub-user", [
      { id: "r-p1", type: "LAW_NOTE", isPremium: true },
      { id: "r-p2", type: "OLD_QUESTION", isPremium: true },
    ]);

    expect([...ids]).toEqual(["r-p1", "r-p2"]);
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("grants standard users access only to purchased premium resources and free resources", async () => {
    mock(prisma.user.findUnique).mockResolvedValue({ role: "USER" });
    mock(prisma.entitlement.findFirst).mockResolvedValue(null);
    mock(prisma.entitlement.findMany).mockResolvedValue([{ resourceId: "r-bought" }]);

    const ids = await getAccessibleResourceIds("student-1", [
      { id: "r-free", type: "LAW_NOTE", isPremium: false },
      { id: "r-bought", type: "LAW_NOTE", isPremium: true },
      { id: "r-locked", type: "CASE_LAW", isPremium: true },
    ]);

    expect([...ids]).toEqual(["r-free", "r-bought"]);
    expect(prisma.entitlement.findMany).toHaveBeenCalledTimes(1);
  });
});
