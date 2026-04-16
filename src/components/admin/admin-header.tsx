"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AdminHeaderProps {
  email: string;
  isSuperAdmin: boolean;
}

export function AdminHeader({ email, isSuperAdmin }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { href: "/admin", label: "Produtos" },
    { href: "/admin/settings", label: "Configurações" },
    ...(isSuperAdmin ? [{ href: "/admin/users", label: "Usuários" }] : []),
  ];

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">{email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
