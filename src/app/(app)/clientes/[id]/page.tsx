import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Flash, Money, PageHeader, Plate, buttonClass, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getClient } from "@/lib/data";
import { CLIENT_TYPE_LABEL, type ClientType } from "@/lib/domain";
import { formatDate, formatPhone, one, whatsappHref } from "@/lib/format";
import { canManageClients, canViewClients } from "@/lib/permissions";
import { createVehicle, updateClient } from "@/server/actions/clients";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Cliente ${id.slice(0, 4)}` };
}

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canViewClients(user.role)) redirect("/painel");
  const { id } = await params;
  const sp = await searchParams;
  const client = await getClient(id, user);
  if (!client) notFound();
  const editable = canManageClients(user.role);
  const type = (client.type === "PARTNER" ? "PARTNER" : "INDIVIDUAL") as ClientType;

  return (
    <div>
      <PageHeader
        eyebrow={CLIENT_TYPE_LABEL[type]}
        title={client.name}
        description={formatPhone(client.phone)}
        actions={
          <>
            <a className={buttonClass("secondary")} href={whatsappHref(client.phone)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {editable ? (
              <Link className={buttonClass()} href={`/os/nova?cliente=${client.id}`}>
                Nova OS
              </Link>
            ) : null}
          </>
        }
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Veículos</p>
          <p className="display mt-1 text-3xl">{client.vehicles.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Já gasto</p>
          <p className="mt-1 text-2xl font-semibold"><Money cents={client.spentCents} /></p>
        </div>
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Em aberto</p>
          <p className="mt-1 text-2xl font-semibold"><Money cents={client.openCents} /></p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="display mb-3 text-lg">Veículos</h2>
            {client.vehicles.length === 0 ? <p className="text-sm text-muted">Nenhum veículo ainda.</p> : null}
            <div className="grid gap-2">
              {client.vehicles.map((vehicle) => (
                <Link key={vehicle.id} href={`/veiculos/${vehicle.id}`} className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-3">
                  <span>
                    <Plate plate={vehicle.plate} />
                    <span className="ml-2">{vehicle.brand} {vehicle.model}</span>
                  </span>
                  <span className="text-sm text-muted">{[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}</span>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="display mb-3 text-lg">Histórico</h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Veículo</th>
                    <th>Entrada</th>
                    <th>Serviço</th>
                    {client.orders.some((order) => order.showPrices) ? <th>Pagamento</th> : null}
                    {client.orders.some((order) => order.showPrices) ? <th>Total</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {client.orders.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="font-semibold text-link" href={`/os/${order.id}`}>{order.label}</Link></td>
                      <td><Plate plate={order.vehicle.plate} /></td>
                      <td>{formatDate(order.enteredAt)}</td>
                      <td><StatusBadge status={order.serviceStatus} /></td>
                      {order.showPrices ? <td><PaymentBadge status={order.paymentStatus} /></td> : null}
                      {order.showPrices ? <td><Money cents={order.totals.totalCents} /></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {editable ? (
          <div className="space-y-4">
            <form action={updateClient} className="space-y-3 rounded-lg border border-line bg-card p-4">
              <h2 className="display text-lg">Dados</h2>
              <input type="hidden" name="id" value={client.id} />
              <input name="name" defaultValue={client.name} className={inputClass()} />
              <input name="phone" defaultValue={formatPhone(client.phone)} className={inputClass()} />
              <input name="email" defaultValue={client.email} placeholder="E-mail" className={inputClass()} />
              <input name="document" defaultValue={client.document} placeholder="CPF ou CNPJ" className={inputClass()} />
              <select name="type" defaultValue={client.type} className={inputClass()}>
                <option value="INDIVIDUAL">Particular</option>
                <option value="PARTNER">Parceiro</option>
              </select>
              <textarea name="notes" defaultValue={client.notes} className={`${inputClass()} h-20 py-2`} placeholder="Observações" />
              <SubmitButton>Salvar cliente</SubmitButton>
            </form>
            <form action={createVehicle} className="space-y-3 rounded-lg border border-line bg-card p-4">
              <h2 className="display text-lg">Novo veículo</h2>
              <input type="hidden" name="clientId" value={client.id} />
              <input name="plate" placeholder="Placa" className={inputClass()} />
              <input name="brand" placeholder="Marca" className={inputClass()} />
              <input name="model" placeholder="Modelo" className={inputClass()} />
              <input name="year" placeholder="Ano" className={inputClass()} />
              <input name="color" placeholder="Cor" className={inputClass()} />
              <SubmitButton variant="secondary">Adicionar veículo</SubmitButton>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
