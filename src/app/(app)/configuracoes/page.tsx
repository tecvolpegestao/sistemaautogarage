import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Flash, PageHeader, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, ROLES } from "@/lib/domain";
import { one } from "@/lib/format";
import { canManageSettings } from "@/lib/permissions";
import { createUser, updateSettings } from "@/server/actions/settings";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canManageSettings(user.role)) redirect("/painel");
  const sp = await searchParams;
  const [settings, users] = await Promise.all([
    getSettings(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Oficina"
        title="Configurações"
        description="Dados que aparecem no documento do cliente e a margem usada no preço sugerido."
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={updateSettings} className="space-y-3 rounded-lg border border-line bg-card p-4">
          <h2 className="display text-lg">Dados da oficina</h2>
          <input name="tradeName" defaultValue={settings.tradeName} placeholder="Nome fantasia" className={inputClass()} />
          <input name="legalName" defaultValue={settings.legalName} placeholder="Razão social" className={inputClass()} />
          <input name="cnpj" defaultValue={settings.cnpj} placeholder="CNPJ em atualização" className={inputClass()} />
          <input name="pixKey" defaultValue={settings.pixKey} placeholder="Chave Pix" className={inputClass()} />
          <input name="phone" defaultValue={settings.phone} placeholder="Telefone" className={inputClass()} />
          <textarea name="address" defaultValue={settings.address} placeholder="Endereço" className={`${inputClass()} h-20 py-2`} />
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Margem sugerida (%)</span>
            <input name="marginPercent" type="number" min={0} max={300} defaultValue={settings.marginPercent} className={inputClass()} />
          </label>
          <p className="text-xs text-muted">Preço sugerido = custo × (1 + margem). O valor continua editável em cada OS.</p>
          <SubmitButton>Salvar configurações</SubmitButton>
        </form>

        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Equipe</h2>
            <ul className="mt-3 divide-y divide-line">
              {users.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{member.name}</span>
                    <span className="block text-xs text-muted">{member.email}</span>
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted">{ROLE_LABEL[member.role as keyof typeof ROLE_LABEL] ?? member.role}</span>
                </li>
              ))}
            </ul>
          </section>
          <form action={createUser} className="space-y-3 rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Novo acesso</h2>
            <input name="name" placeholder="Nome" className={inputClass()} />
            <input name="email" type="email" placeholder="E-mail" className={inputClass()} />
            <select name="role" className={inputClass()} defaultValue="RECEPTION">
              {ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABEL[role]}</option>
              ))}
            </select>
            <input name="password" type="password" placeholder="Senha" className={inputClass()} />
            <SubmitButton variant="secondary">Criar acesso</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
