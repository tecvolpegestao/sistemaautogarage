"use client";

import { useActionState, useState } from "react";
import { login } from "@/server/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/domain";

const DEMOS: { role: Role; email: string; name: string }[] = [
  { role: "OWNER", email: "victor@autogarage.com", name: "Victor" },
  { role: "RECEPTION", email: "ana@autogarage.com", name: "Ana" },
  { role: "PRODUCTION", email: "diego@autogarage.com", name: "Diego" },
  { role: "FINANCE", email: "paula@autogarage.com", name: "Paula" },
];

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 w-full rounded-md px-3 text-sm outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 w-full rounded-md px-3 text-sm outline-none"
        />
      </label>
      {state?.error ? <p className="text-sm text-[#FF8A8E]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-md bg-[#FDC307] text-sm font-semibold text-[#0A0A0A] hover:bg-[#FFD23F] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <div className="border-t border-[#2E2E2E] pt-4">
        <p className="text-xs text-[#A3A3A3]">Acesso de demonstração. Senha: oficina</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword("oficina");
              }}
              className="rounded-md border border-[#2E2E2E] px-2 py-2 text-left hover:border-[#FDC307]"
            >
              <span className="block text-sm font-semibold">{demo.name}</span>
              <span className="block text-[11px] text-[#A3A3A3]">{ROLE_LABEL[demo.role]}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
