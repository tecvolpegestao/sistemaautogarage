"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { logout } from "@/server/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/domain";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard, roles: ["OWNER", "RECEPTION", "PRODUCTION", "FINANCE"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["OWNER", "RECEPTION", "FINANCE"] },
  { href: "/os", label: "Ordens de serviço", icon: ClipboardList, roles: ["OWNER", "RECEPTION", "PRODUCTION", "FINANCE"] },
  { href: "/recebimentos", label: "Recebimentos", icon: Wallet, roles: ["OWNER", "RECEPTION", "FINANCE"] },
  { href: "/a-receber", label: "A receber", icon: CircleDollarSign, roles: ["OWNER", "RECEPTION", "FINANCE"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["OWNER"] },
];

export function Shell({
  user,
  children,
}: {
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ag-theme", next);
  }

  const items = NAV.filter((item) => item.roles.includes(user.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0A0A0A] text-[#F5F5F5]">
      <div className="border-b border-[#2E2E2E] px-5 py-5">
        <img src="/brand/logo-yellow.png" alt="Autogarage" className="h-8 w-auto" />
        <p className="display mt-3 text-[11px] text-[#A3A3A3]">Oficina</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-[#1E1E1E] text-[#FDC307]" : "text-[#F5F5F5] hover:bg-[#141414]"}`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#2E2E2E] p-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="mb-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#A3A3A3] hover:bg-[#141414] hover:text-[#F5F5F5]"
        >
          <Sun size={16} className="when-dark" />
          <Moon size={16} className="when-light" />
          <span className="when-dark">Tema claro</span>
          <span className="when-light">Tema escuro</span>
        </button>
        <div className="px-3 pb-3">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-[#A3A3A3]">{ROLE_LABEL[user.role]}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#A3A3A3] hover:bg-[#141414] hover:text-[#F5F5F5]">
            <LogOut size={16} />
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[#2E2E2E] md:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[80vw]">{sidebar}</div>
        </div>
      ) : null}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#2E2E2E] bg-[#0A0A0A] px-4 text-[#F5F5F5] md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-md p-2">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <img src="/brand/logo-yellow.png" alt="Autogarage" className="h-6 w-auto" />
          <span className="w-8" />
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
