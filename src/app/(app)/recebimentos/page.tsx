import Link from "next/link";
import { redirect } from "next/navigation";
import { Empty, Money, PageHeader, Plate, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listPayments } from "@/lib/data";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, documentLabel, isServiceStatus } from "@/lib/domain";
import { formatDate, one, parseDateInput } from "@/lib/format";
import { canViewFinance } from "@/lib/permissions";

export const metadata = { title: "Recebimentos" };

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canViewFinance(user.role)) redirect("/painel");
  const sp = await searchParams;
  const data = await listPayments({
    method: one(sp, "forma"),
    from: parseDateInput(one(sp, "de")),
    to: parseDateInput(one(sp, "ate"), true),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Recebimentos"
        description="O que já entrou, com a OS de origem."
        actions={
          <div className="rounded-lg border border-line bg-card px-4 py-2 text-sm">
            Total <span className="ml-2 text-base font-semibold"><Money cents={data.totalCents} /></span>
          </div>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="forma" defaultValue={one(sp, "forma") ?? ""} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm">
          <option value="">Todas as formas</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>{PAYMENT_METHOD_LABEL[method]}</option>
          ))}
        </select>
        <input type="date" name="de" defaultValue={one(sp, "de")} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm" />
        <input type="date" name="ate" defaultValue={one(sp, "ate")} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm" />
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>
      {data.payments.length === 0 ? (
        <Empty title="Nenhum recebimento no período" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Cliente</th>
                <th>Forma</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.paidAt)}</td>
                  <td>
                    <Link className="font-semibold text-link" href={`/os/${payment.orderId}`}>
                      {isServiceStatus(payment.orderStatus) ? documentLabel(payment.orderStatus, payment.orderNumber) : payment.orderNumber}
                    </Link>
                    <span className="mt-1 block"><Plate plate={payment.plate} /></span>
                  </td>
                  <td>
                    {payment.client}
                    {payment.notes ? <span className="block text-xs text-muted">{payment.notes}</span> : null}
                  </td>
                  <td>
                    {PAYMENT_METHOD_LABEL[payment.method as keyof typeof PAYMENT_METHOD_LABEL] ?? payment.method}
                    {payment.method === "CARD" ? ` ${payment.installments}x` : ""}
                    <span className="block text-xs text-muted">{payment.createdBy}</span>
                  </td>
                  <td><Money cents={payment.amountCents} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
