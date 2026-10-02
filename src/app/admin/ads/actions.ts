"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function toggleAd(id: string, isActive: boolean) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) throw new Error("Unauthorized");

  // If we are activating an ad, deactivate all others first to ensure only one is active at a time (if that's the rule, though multiple could be active in different slots. Let's assume only one active at a time for the homepage slot).
  if (isActive) {
    await prisma.advertisement.updateMany({
      data: { isActive: false }
    });
  }

  await prisma.advertisement.update({
    where: { id },
    data: { isActive }
  });

  revalidatePath("/");
  revalidatePath("/admin/ads");
}

export async function deleteAd(id: string) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) throw new Error("Unauthorized");

  await prisma.advertisement.delete({
    where: { id }
  });
  revalidatePath("/admin/ads");
}

export async function createAd(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== Role.ADMIN) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const mediaUrl = formData.get("mediaUrl") as string;
  const linkUrl = formData.get("linkUrl") as string;
  const mediaType = formData.get("mediaType") as string;

  await prisma.advertisement.create({
    data: {
      title,
      mediaUrl,
      linkUrl: linkUrl || null,
      mediaType,
      isActive: false
    }
  });

  revalidatePath("/admin/ads");
}
