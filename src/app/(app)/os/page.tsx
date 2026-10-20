import Link from "next/link";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { Empty, Flash, Money, PageHeader, Plate, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/data";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
} from "@/lib/domain";
import { formatDate, one, parseDateInput } from "@/lib/format";
import { canEditOrderItems, canSeePrices } from "@/lib/permissions";

export const metadata = { title: "Ordens de serviço" };

const BOARD: (typeof SERVICE_STATUSES)[number][] = [
  "QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "OS_GENERATED",
  "SCHEDULED",
  "IN_PROGRESS",
  "WAITING_PART",
  "READY",
  "DELIVERED",
];

function boardColumns(
  orders: { serviceStatus: string }[],
  filters: { status?: string; payment?: string; q?: string; partner?: boolean; stale?: boolean; from?: Date | null; to?: Date | null },
) {
  const narrowed = Boolean(filters.status || filters.payment || filters.q || filters.partner || filters.stale || filters.from || filters.to);
  const present = new Set(orders.map((order) => order.serviceStatus));
  const columns: string[] = [];
  for (const status of filters.status ? [filters.status] : BOARD) {
    if (!narrowed || present.has(status)) columns.push(status);
  }
  for (const status of present) {
    if (!columns.includes(status)) columns.push(status);
  }
  return columns;
}

export default async function OrdensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = {
    status: one(sp, "status"),
    payment: one(sp, "pagamento"),
    q: one(sp, "q"),
    partner: one(sp, "parceiro") === "1",
    stale: one(sp, "paradas") === "1",
    from: parseDateInput(one(sp, "de")),
    to: parseDateInput(one(sp, "ate"), true),
  };
  const orders = await listOrders(user, filters);
  const board = one(sp, "vista") === "quadro";
  const showPrices = canSeePrices(user.role);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const text = Array.isArray(value) ? value[0] : value;
    if (text && key !== "vista") query.set(key, text);
  }
  const base = query.toString();

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Ordens de serviço"
        description={user.role === "PRODUCTION" ? "Somente as OS atribuídas a você." : "Do orçamento até a entrega."}
        actions={
          <>
            <Link href={base ? `/os?${base}` : "/os"} className={buttonClass(board ? "secondary" : "primary", "sm")}>
              Tabela
            </Link>
            <Link href={`/os?${base ? `${base}&` : ""}vista=quadro`} className={buttonClass(board ? "primary" : "secondary", "sm")}>
              Quadro
            </Link>
            {canEditOrderItems(user.role) ? (
              <Link href="/os/nova" className={buttonClass()}>
                Nova OS
              </Link>
            ) : null}
          </>
        }
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />
      <form className="mb-4 grid gap-2 md:grid-cols-6">
        {board ? <input type="hidden" name="vista" value="quadro" /> : null}
        <input name="q" defaultValue={filters.q} placeholder="Placa, cliente ou número" className="h-10 rounded-md border border-line bg-elevated px-3 text-sm md:col-span-2" />
        <select name="status" defaultValue={filters.status ?? ""} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm">
          <option value="">Situação</option>
          {SERVICE_STATUSES.map((status) => (
            <option key={status} value={status}>{SERVICE_STATUS_LABEL[status]}</option>
          ))}
        </select>
        {showPrices ? (
          <select name="pagamento" defaultValue={filters.payment ?? ""} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm">
            <option value="">Pagamento</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{PAYMENT_STATUS_LABEL[status]}</option>
            ))}
          </select>
        ) : null}
        <input type="date" name="de" defaultValue={one(sp, "de")} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm" />
        <input type="date" name="ate" defaultValue={one(sp, "ate")} className="h-10 rounded-md border border-line bg-elevated px-3 text-sm" />
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="parceiro" value="1" defaultChecked={filters.partner} />
          Parceiros
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="paradas" value="1" defaultChecked={filters.stale} />
          Paradas
        </label>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {orders.length === 0 ? <Empty title="Nenhuma OS com esses filtros" /> : null}

      {!board && orders.length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Número</th>
                <th>Veículo</th>
                <th>Cliente</th>
                <th>Serviço</th>
                {showPrices ? <th>Pagamento</th> : null}
                {showPrices ? <th>Total</th> : null}
                <th>Entrada</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={order.stale ? "stale" : ""}>
                  <td>
                    <Link href={`/os/${order.id}`} className="font-semibold text-link">{order.label}</Link>
                    {order.stale ? <span className="mt-1 block text-[11px] text-warn">Parada</span> : null}
                  </td>
                  <td>
                    <Plate plate={order.vehicle.plate} />
                    <span className="mt-1 block text-xs text-muted">{order.vehicle.brand} {order.vehicle.model}</span>
                  </td>
                  <td>{order.client.name}</td>
                  <td><StatusBadge status={order.serviceStatus} /></td>
                  {showPrices ? <td><PaymentBadge status={order.paymentStatus} /></td> : null}
                  {showPrices ? <td><Money cents={order.totals.totalCents} /></td> : null}
                  <td>{formatDate(order.enteredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {board && orders.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {boardColumns(orders, filters).map((status) => {
            const column = orders.filter((order) => order.serviceStatus === status);
            return (
              <div key={status} className="w-64 shrink-0 rounded-lg border border-line bg-bg">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{SERVICE_STATUS_LABEL[status as keyof typeof SERVICE_STATUS_LABEL] ?? status}</p>
                  <span className="num text-xs text-muted">{column.length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {column.map((order) => (
                    <Link key={order.id} href={`/os/${order.id}`} className={`block rounded-md border border-line bg-card p-3 ${order.stale ? "border-l-warn border-l-4" : ""}`}>
                      <Plate plate={order.vehicle.plate} />
                      <p className="mt-2 text-sm font-medium">{order.vehicle.model}</p>
                      <p className="text-xs text-muted">{order.client.name}</p>
                      {showPrices ? (
                        <p className="mt-2 text-sm"><Money cents={order.totals.totalCents} /></p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
