"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, LayoutDashboard } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50">
      {[
        { href: "/chat", icon: MessageCircle, label: "Chat" },
        { href: "/overview", icon: LayoutDashboard, label: "Overview" },
      ].map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            pathname.startsWith(href) ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
