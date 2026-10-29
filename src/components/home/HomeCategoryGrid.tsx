import { BookOpen, Landmark, Newspaper, Briefcase, ScrollText, MessageSquare, Scale, Calculator, Users, Gavel } from "lucide-react";
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
      title: "OLD QUESTIONS",
      subtitle: "Practice Past Exams",
      href: "/study?type=OLD_QUESTION",
      icon: Briefcase,
    },
    {
      title: "COURT FEE CALCULATOR",
      subtitle: "Estimate court fees",
      href: "/calculator",
      icon: Calculator,
    },
    {
      title: "CONSULT A LAWYER",
      subtitle: "Get legal guidance",
      href: "/consultation",
      icon: Users,
    },
    {
      title: "ACTS AND LAWS",
      subtitle: "Browse Nepal's acts and laws",
      href: "/resources",
      icon: Gavel,
    },
    {
      title: "NEWS",
      subtitle: "Read Latest Insights",
      href: "/news",
      icon: Newspaper,
    },
    {
      title: (
        <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
          <span>HISTORICAL FACTS</span>
          <div className="flex items-center gap-2 my-1.5 opacity-60">
            <div className="w-6 h-[1px] bg-navy dark:bg-white" />
            <Scale className="w-4 h-4" />
            <div className="w-6 h-[1px] bg-navy dark:bg-white" />
          </div>
          <span>LEGAL PERSONALITIES</span>
        </div>
      ),
      subtitle: "",
      href: "/historical-facts",
      icon: ScrollText,
    },
    {
      title: "BLOG, OPINION, OTHERS",
      subtitle: "Legal insights and opinions",
      href: "/blogs",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
      {categories.map((category, idx) => (
        <HomeCategoryCard key={typeof category.title === 'string' ? category.title : idx} {...category} />
      ))}
    </div>
  );
}
