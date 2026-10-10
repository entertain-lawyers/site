import { BookOpen, Landmark, Newspaper, Briefcase, ScrollText, MessageSquare } from "lucide-react";
import { HomeCategoryCard } from "./HomeCategoryCard";

export function HomeCategoryGrid() {
  const categories = [
    {
      title: "LAW NOTES",
      subtitle: "Comprehensive Materials",
      href: "/study?type=LAW_NOTE",
      icon: BookOpen,
    },
    {
      title: "PRECEDENT / CASE LAWS",
      subtitle: "Supreme Court Decisions",
      href: "/study?type=CASE_LAW",
      icon: Landmark,
    },
    {
      title: "NEWS",
      subtitle: "Read Latest Insights",
      href: "/news",
      icon: Newspaper,
    },
    {
      title: "OLD QUESTIONS",
      subtitle: "Practice Past Exams",
      href: "/study?type=OLD_QUESTION",
      icon: Briefcase,
    },
    {
      title: (
        <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
          <span>HISTORICAL FACTS</span>
          <span className="text-[15px] sm:text-[17px] leading-none my-0.5">&</span>
          <span>LEGAL PERSONALITIES</span>
        </div>
      ),
      subtitle: "",
      href: "/historical-facts",
      icon: ScrollText,
    },
    {
      title: (
        <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
          <span>BLOG, OPINION</span>
          <span className="text-[15px] sm:text-[17px] leading-none my-0.5">&</span>
          <span>OTHERS</span>
        </div>
      ),
      subtitle: "",
      href: "/blogs",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
      {categories.map((category) => (
        <HomeCategoryCard key={category.href} {...category} />
      ))}
    </div>
  );
}
