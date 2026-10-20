import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, inputClass } from "@/components/ui";
import type { OrderView } from "@/lib/data";
import {
  APPROVAL_CHANNELS,
  APPROVAL_CHANNEL_LABEL,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/domain";
import { formatMoneyInput, toDateTimeLocal } from "@/lib/format";
import {
  canApprove,
  canDeliver,
  canEditOrderItems,
  canOperateProduction,
  canRegisterPayment,
  canSchedule,
} from "@/lib/permissions";
import type { Role } from "@/lib/domain";
import {
  approveOrder,
  cancelOrder,
  completeOrder,
  deliverOrder,
  generateOrder,
  refuseOrder,
  resumeOrder,
  scheduleOrder,
  sendForApproval,
  startOrder,
  waitForPart,
} from "@/server/actions/orders";
import { registerPayment } from "@/server/actions/payments";

export function OrderActions({
  order,
  role,
  mechanics,
}: {
  order: OrderView;
  role: Role;
  mechanics: { id: string; name: string }[];
}) {
  const editable = canEditOrderItems(role) && ["QUOTE", "AWAITING_APPROVAL", "APPROVED", "OS_GENERATED", "SCHEDULED"].includes(order.serviceStatus);
  const closed = order.serviceStatus === "CANCELLED" || order.serviceStatus === "REFUSED";

  return (
    <div className="space-y-4">
      {editable ? (
        <Link href={`/os/${order.id}/editar`} className={buttonClass("secondary")}>
          Editar itens
        </Link>
      ) : null}

      {order.serviceStatus === "QUOTE" && canApprove(role) ? (
        <form action={sendForApproval}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton>Enviar para aprovação</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "AWAITING_APPROVAL" && canApprove(role) ? (
        <form action={approveOrder} className="space-y-2 rounded-lg border border-line bg-card p-3">
          <input type="hidden" name="orderId" value={order.id} />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Como o cliente aprovou</p>
          <select name="channel" className={inputClass()} defaultValue="WHATSAPP">
            {APPROVAL_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>{APPROVAL_CHANNEL_LABEL[channel]}</option>
            ))}
          </select>
          <SubmitButton>Registrar aprovação</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "AWAITING_APPROVAL" && canApprove(role) ? (
        <form action={refuseOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton variant="danger">Recusar orçamento</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "APPROVED" && canApprove(role) ? (
        <form action={generateOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton>Gerar OS</SubmitButton>
        </form>
      ) : null}

      {(order.serviceStatus === "OS_GENERATED" || order.serviceStatus === "SCHEDULED") && canSchedule(role) ? (
        <form action={scheduleOrder} className="space-y-2 rounded-lg border border-line bg-card p-3">
          <input type="hidden" name="orderId" value={order.id} />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {order.serviceStatus === "SCHEDULED" ? "Reagendar execução" : "Agendar execução"}
          </p>
          <input type="datetime-local" name="scheduledAt" required defaultValue={toDateTimeLocal(order.scheduledAt)} className={inputClass()} />
          <select name="mechanicId" required defaultValue={order.mechanic?.id ?? ""} className={inputClass()}>
            <option value="">Responsável</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>{mechanic.name}</option>
            ))}
          </select>
          <SubmitButton variant="secondary">{order.serviceStatus === "SCHEDULED" ? "Reagendar" : "Agendar"}</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "SCHEDULED" && canOperateProduction(role) ? (
        <form action={startOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton>Iniciar execução</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "IN_PROGRESS" && canOperateProduction(role) ? (
        <div className="flex flex-col gap-2">
          <form action={waitForPart}>
            <input type="hidden" name="orderId" value={order.id} />
            <SubmitButton variant="secondary">Aguardando peça</SubmitButton>
          </form>
          <form action={completeOrder}>
            <input type="hidden" name="orderId" value={order.id} />
            <SubmitButton>Concluir execução</SubmitButton>
          </form>
        </div>
      ) : null}

      {order.serviceStatus === "WAITING_PART" && canOperateProduction(role) ? (
        <form action={resumeOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton>Retomar execução</SubmitButton>
        </form>
      ) : null}

      {order.serviceStatus === "READY" && canDeliver(role) ? (
        <form action={deliverOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton>Marcar como entregue</SubmitButton>
        </form>
      ) : null}

      {!closed && canRegisterPayment(role) && order.showPrices && (order.totals.balanceCents ?? 0) > 0 && order.serviceStatus !== "QUOTE" ? (
        <form action={registerPayment} className="space-y-2 rounded-lg border border-line bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Registrar pagamento</p>
          <p className="text-xs text-muted">Saldo {formatMoneyInput(order.totals.balanceCents ?? 0)}</p>
          <input name="orderId" type="hidden" value={order.id} />
          <input name="amount" placeholder="Valor" className={`${inputClass()} num`} />
          <input type="date" name="paidAt" className={inputClass()} />
          <select name="method" className={inputClass()} defaultValue="PIX">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{PAYMENT_METHOD_LABEL[method]}</option>
            ))}
          </select>
          <input name="installments" type="number" min={1} max={12} defaultValue={1} className={inputClass()} placeholder="Parcelas no cartão" />
          <input name="notes" placeholder="Observação" className={inputClass()} />
          <SubmitButton>Registrar pagamento</SubmitButton>
        </form>
      ) : null}

      {!closed && canApprove(role) ? (
        <form action={cancelOrder} className="space-y-2">
          <input type="hidden" name="orderId" value={order.id} />
          <textarea name="reason" required minLength={3} placeholder="Motivo do cancelamento" className={`${inputClass()} h-20 py-2`} />
          {order.payments.length ? (
            <p className="text-xs text-warn">Esta OS tem pagamento. O cancelamento pede motivo e o histórico fica guardado.</p>
          ) : null}
          <SubmitButton variant="danger">Cancelar OS</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
