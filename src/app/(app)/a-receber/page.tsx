import Link from "next/link";
import { redirect } from "next/navigation";
import { Empty, Money, PageHeader, Plate, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listReceivables } from "@/lib/data";
import { daysSince, formatDate, whatsappHref } from "@/lib/format";
import { canViewFinance } from "@/lib/permissions";

export const metadata = { title: "A receber" };

export default async function AReceberPage() {
  const user = await requireUser();
  if (!canViewFinance(user.role)) redirect("/painel");
  const groups = await listReceivables();
  const total = groups.reduce((sum, group) => sum + group.totalCents, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="A receber"
        description="Carros já entregues que ainda não foram pagos."
        actions={<div className="text-2xl font-semibold"><Money cents={total} /></div>}
      />
      {groups.length === 0 ? <Empty title="Nada em aberto nas entregas" /> : null}
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.client} className="rounded-lg border border-line bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{group.client}</h2>
                <p className="text-sm text-muted">Saldo <Money cents={group.totalCents} /></p>
              </div>
              <a className={buttonClass("secondary", "sm")} href={whatsappHref(group.phone, `Olá, ${group.client}. Passando para alinhar o pagamento dos serviços da Autogarage.`)} target="_blank" rel="noreferrer">
                Cobrar no WhatsApp
              </a>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Veículo</th>
                    <th>Entrega</th>
                    <th>Dias</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.id}>
                      <td><Link className="font-semibold text-link" href={`/os/${row.id}`}>{row.label}</Link></td>
                      <td><Plate plate={row.plate} /> <span className="text-sm text-muted">{row.model}</span></td>
                      <td>{formatDate(row.deliveredAt)}</td>
                      <td className="num">{row.deliveredAt ? daysSince(row.deliveredAt) : "—"}</td>
                      <td><Money cents={row.balanceCents} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
