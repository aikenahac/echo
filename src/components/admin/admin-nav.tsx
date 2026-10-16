"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Code,
  House,
  CreditCard,
  LifeBuoy,
  Flag,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navItems: {
  title: string;
  href: string;
  icon: typeof Users;
  adminOnly?: boolean;
}[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Reviews",
    href: "/admin/content/reviews",
    icon: MessageSquare,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: Flag,
  },
  {
    title: "Books",
    href: "/admin/content/books",
    icon: BookOpen,
  },
  {
    title: "Support",
    href: "/admin/support",
    icon: LifeBuoy,
    adminOnly: true,
  },
  {
    title: "API Playground",
    href: "/admin/api-playground",
    icon: Code,
  },
];

export function AdminNav({
  isAdmin,
  openSupportCount,
  openReportsCount,
}: {
  isAdmin: boolean;
  openSupportCount: number;
  openReportsCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen border-r bg-muted/10 p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Manage your application</p>
        </div>

        <Separator />

        <div className="space-y-1">
          {navItems
            .filter((item) => isAdmin || !item.adminOnly)
            .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
                {item.href === "/admin/reports" && openReportsCount > 0 ? (
                  <span
                    className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                    aria-label={`${openReportsCount} open reports`}
                  >
                    {openReportsCount}
                  </span>
                ) : null}
                {item.href === "/admin/support" && openSupportCount > 0 ? (
                  <span
                    className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                    aria-label={`${openSupportCount} open tickets`}
                  >
                    {openSupportCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <Separator />

        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <House className="h-4 w-4" />
          Back to App
        </Link>
      </div>
    </nav>
  );
}
