import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/order-actions";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { Flash, Money, PageHeader, Plate, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder, listMechanics } from "@/lib/data";
import {
  APPROVAL_CHANNEL_LABEL,
  PAYMENT_METHOD_LABEL,
  type ApprovalChannel,
  type PaymentMethod,
} from "@/lib/domain";
import { formatDate, formatDateTime, formatPhone, formatQty, one, whatsappHref } from "@/lib/format";

const FLOW = ["QUOTE", "AWAITING_APPROVAL", "APPROVED", "OS_GENERATED", "SCHEDULED", "IN_PROGRESS", "READY", "DELIVERED"] as const;
const FLOW_LABEL = ["Orçamento", "Aprovação", "Aprovado", "OS", "Agenda", "Execução", "Pronto", "Entregue"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id };
}

export default async function OsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const order = await getOrder(id, user);
  if (!order) notFound();
  const mechanics = await listMechanics();
  const step = FLOW.indexOf(order.serviceStatus as (typeof FLOW)[number]);
  const channel = order.approvalChannel && order.approvalChannel in APPROVAL_CHANNEL_LABEL
    ? APPROVAL_CHANNEL_LABEL[order.approvalChannel as ApprovalChannel]
    : null;

  return (
    <div>
      <PageHeader
        eyebrow={formatDate(order.enteredAt)}
        title={order.label}
        description={`${order.client.name} · ${order.vehicle.brand} ${order.vehicle.model}`}
        actions={
          <>
            <Plate plate={order.vehicle.plate} />
            <StatusBadge status={order.serviceStatus} />
            {order.showPrices ? <PaymentBadge status={order.paymentStatus} /> : null}
            {order.showPrices ? (
              <Link href={`/imprimir/${order.id}`} className={buttonClass("secondary")}>
                Documento
              </Link>
            ) : null}
          </>
        }
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />

      {order.serviceStatus === "CANCELLED" || order.serviceStatus === "REFUSED" ? (
        <p className="mb-4 rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">
          {order.serviceStatus === "CANCELLED" ? `Cancelada. ${order.cancelReason ?? ""}` : "Orçamento recusado."}
        </p>
      ) : (
        <ol className="mb-6 flex gap-2 overflow-x-auto text-xs">
          {FLOW_LABEL.map((label, index) => (
            <li key={label} className={`whitespace-nowrap rounded-md border px-2 py-1 ${index === step ? "border-brand text-ink" : index < step ? "border-line text-muted" : "border-line text-muted/70"}`}>
              {label}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Cliente</p>
                <Link href={`/clientes/${order.client.id}`} className="font-semibold text-link">{order.client.name}</Link>
                <p className="text-sm text-muted">{formatPhone(order.client.phone)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Veículo</p>
                <Link href={`/veiculos/${order.vehicle.id}`} className="font-semibold text-link">
                  {order.vehicle.brand} {order.vehicle.model}
                </Link>
                <p className="text-sm text-muted">
                  {order.mileageIn != null ? `${order.mileageIn.toLocaleString("pt-BR")} km` : "Km não informada"}
                </p>
              </div>
              <a className={buttonClass("secondary", "sm")} href={whatsappHref(order.client.phone)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
            {order.problemReport ? <p className="mt-4 text-sm">{order.problemReport}</p> : null}
            {order.notes ? <p className="mt-2 text-sm text-muted">{order.notes}</p> : null}
            {order.mechanic ? (
              <p className="mt-3 text-sm text-muted">
                Execução: {order.mechanic.name}
                {order.scheduledAt ? ` · ${formatDateTime(order.scheduledAt)}` : ""}
              </p>
            ) : null}
            {channel ? <p className="mt-1 text-sm text-muted">Aprovado por {channel} em {formatDateTime(order.approvalAt)}</p> : null}
          </section>

          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Mão de obra</h2>
            <ul className="mt-2 divide-y divide-line">
              {order.services.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {item.description}
                    {item.mechanicName ? <span className="block text-xs text-muted">{item.mechanicName}</span> : null}
                  </span>
                  {item.priceCents != null ? <Money cents={item.priceCents} /> : null}
                </li>
              ))}
              {order.services.length === 0 ? <li className="py-2 text-sm text-muted">Nenhum serviço.</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Peças</h2>
            <ul className="mt-2 divide-y divide-line">
              {order.parts.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {formatQty(item.quantity)}× {item.description}
                    {item.missingCost ? <span className="block text-xs text-warn">Custo não informado</span> : null}
                    {item.unitCostCents != null ? (
                      <span className="block text-xs text-muted">Custo unitário <Money cents={item.unitCostCents} /></span>
                    ) : null}
                  </span>
                  {item.unitPriceCents != null ? <Money cents={Math.round(item.quantity * item.unitPriceCents)} /> : null}
                </li>
              ))}
              {order.parts.length === 0 ? <li className="py-2 text-sm text-muted">Nenhuma peça.</li> : null}
            </ul>
          </section>

          {order.showPrices ? (
            <section className="rounded-lg border border-line bg-card p-4">
              <h2 className="display text-lg">Valores</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Mão de obra</dt><dd><Money cents={order.totals.laborCents} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">Peças</dt><dd><Money cents={order.totals.partsCents} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd><Money cents={order.totals.discountCents} /></dd></div>
                <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total cobrado</dt><dd><Money cents={order.totals.totalCents} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">Recebido</dt><dd><Money cents={order.totals.paidCents} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">Saldo</dt><dd><Money cents={order.totals.balanceCents} /></dd></div>
              </dl>
            </section>
          ) : null}

          {order.showCosts ? (
            <section className="rounded-lg border border-line bg-card p-4">
              <h2 className="display text-lg">Resultado da OS</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Custo das peças</dt><dd><Money cents={order.totals.costCents} /></dd></div>
                <div className="flex justify-between font-semibold"><dt>Lucro</dt><dd><Money cents={order.totals.profitCents} /></dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted">O lucro é o valor cobrado menos o custo das peças. O custo do mecânico ainda não entra nesta conta.</p>
            </section>
          ) : null}

          {order.payments.length ? (
            <section className="rounded-lg border border-line bg-card p-4">
              <h2 className="display text-lg">Pagamentos</h2>
              <ul className="mt-2 divide-y divide-line">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {formatDate(payment.paidAt)} · {PAYMENT_METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}
                      {payment.method === "CARD" ? ` ${payment.installments}x` : ""}
                      <span className="block text-xs text-muted">{payment.createdBy}{payment.notes ? ` · ${payment.notes}` : ""}</span>
                    </span>
                    <Money cents={payment.amountCents} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="display mb-3 text-lg">Ações</h2>
            <OrderActions order={order} role={user.role} mechanics={mechanics} />
          </section>
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Linha do tempo</h2>
            <ol className="mt-3 space-y-3">
              {order.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <p>{event.message}</p>
                  <p className="text-xs text-muted">{event.userName ?? "Sistema"} · {formatDateTime(event.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
