import Link from "next/link";
import { redirect } from "next/navigation";
import { Empty, Flash, Money, PageHeader, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listClients } from "@/lib/data";
import { CLIENT_TYPE_LABEL } from "@/lib/domain";
import { formatPhone, one } from "@/lib/format";
import { canManageClients, canViewClients } from "@/lib/permissions";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canViewClients(user.role)) redirect("/painel");
  const sp = await searchParams;
  const q = one(sp, "q") ?? "";
  const type = one(sp, "tipo") ?? "";
  const open = one(sp, "aberto") === "1";
  const clients = await listClients(user, { q, type, open });

  return (
    <div>
      <PageHeader
        eyebrow="Cadastro"
        title="Clientes"
        description="Quem traz o carro, e o que ainda está em aberto."
        actions={
          canManageClients(user.role) ? (
            <Link href="/clientes/novo" className={buttonClass()}>
              Novo cliente
            </Link>
          ) : null
        }
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nome, telefone ou placa" className="h-10 min-w-56 flex-1 rounded-md border border-line bg-elevated px-3 text-sm" />
        <select name="tipo" defaultValue={type} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm">
          <option value="">Todos os tipos</option>
          <option value="INDIVIDUAL">Particular</option>
          <option value="PARTNER">Parceiro</option>
        </select>
        <label className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm">
          <input type="checkbox" name="aberto" value="1" defaultChecked={open} />
          Com valor em aberto
        </label>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>
      {clients.length === 0 ? (
        <Empty title="Nenhum cliente encontrado" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Tipo</th>
                <th>Veículos</th>
                {clients.some((client) => client.openCents != null) ? <th>Em aberto</th> : null}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/clientes/${client.id}`} className="font-semibold text-link">
                      {client.name}
                    </Link>
                  </td>
                  <td className="num">{formatPhone(client.phone)}</td>
                  <td>{CLIENT_TYPE_LABEL[client.type as "INDIVIDUAL"] ?? client.type}</td>
                  <td className="num">{client.vehicles.length}</td>
                  {client.openCents != null ? (
                    <td>
                      <Money cents={client.openCents} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
