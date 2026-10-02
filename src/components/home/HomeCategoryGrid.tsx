import { BookOpen, Landmark, Newspaper, Briefcase, ScrollText, MessageSquare } from "lucide-react";
import { HomeCategoryCard } from "./HomeCategoryCard";

export function HomeCategoryGrid() {
  const categories = [
    {
      title: "Law Notes",
      subtitle: "Comprehensive Materials",
      href: "/study?type=LAW_NOTE",
      icon: BookOpen,
    },
    {
      title: "Precedent Case Laws",
      subtitle: "Supreme Court Decisions",
      href: "/study?type=CASE_LAW",
      icon: Landmark,
    },
    {
      title: "News",
      subtitle: "Read Latest Insights",
      href: "/news",
      icon: Newspaper,
    },
    {
      title: "Old Questions",
      subtitle: "Practice Past Exams",
      href: "/study?type=OLD_QUESTION",
      icon: Briefcase,
    },
    {
      title: "Historical Facts",
      subtitle: "Discover History",
      href: "/historical-facts",
      icon: ScrollText,
    },
    {
      title: "Blogs",
      subtitle: "Opinion & Others",
      href: "/blogs",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
      {categories.map((category) => (
        <HomeCategoryCard key={category.title} {...category} />
      ))}
    </div>
  );
}
