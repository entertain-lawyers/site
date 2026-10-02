import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdsClient from "./AdsClient";

export const metadata = {
  title: "Manage Advertisements | Admin",
};

export default async function AdminAdsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const ads = await prisma.advertisement.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-6 md:p-5 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy dark:text-white tracking-tight">Advertisements</h1>
          <p className="text-text-secondary mt-2">Manage the advertisement banner on the homepage. Only one ad can be active at a time.</p>
        </div>
      </div>

      <AdsClient ads={ads} />
    </div>
  );
}
