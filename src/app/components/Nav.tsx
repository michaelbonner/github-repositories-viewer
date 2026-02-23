"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const Nav = () => {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="flex gap-6 items-center px-4 py-3 mx-auto max-w-7xl sm:px-8">
        <Link
          href="/"
          className={`text-sm font-medium hover:text-gray-900 ${
            pathname === "/" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          Home
        </Link>
        <Link
          href="/dashboards"
          className={`text-sm font-medium hover:text-gray-900 ${
            pathname.startsWith("/dashboards")
              ? "text-gray-900"
              : "text-gray-500"
          }`}
        >
          Dashboards
        </Link>
      </div>
    </nav>
  );
};
