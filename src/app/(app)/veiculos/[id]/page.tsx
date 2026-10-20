import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Flash, Money, PageHeader, Plate, buttonClass, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getVehicle } from "@/lib/data";
import { formatDate, one } from "@/lib/format";
import { canManageClients, canViewClients } from "@/lib/permissions";
import { updateVehicle } from "@/server/actions/clients";

export const metadata = { title: "Veículo" };

export default async function VeiculoPage({
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
  const vehicle = await getVehicle(id, user);
  if (!vehicle) notFound();
  const editable = canManageClients(user.role);

  return (
    <div>
      <PageHeader
        eyebrow={vehicle.client.name}
        title={`${vehicle.brand} ${vehicle.model}`}
        description={[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
        actions={
          <>
            <Plate plate={vehicle.plate} />
            {editable ? (
              <Link className={buttonClass()} href={`/os/nova?cliente=${vehicle.clientId}&veiculo=${vehicle.id}`}>
                Nova OS
              </Link>
            ) : null}
          </>
        }
      />
      <Flash ok={one(sp, "ok")} erro={one(sp, "erro")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="display mb-3 text-lg">Entradas</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Entrada</th>
                  <th>Km</th>
                  <th>Serviço</th>
                  {vehicle.orders.some((order) => order.showPrices) ? <th>Pagamento</th> : null}
                  {vehicle.orders.some((order) => order.showPrices) ? <th>Total</th> : null}
                </tr>
              </thead>
              <tbody>
                {vehicle.orders.map((order) => (
                  <tr key={order.id}>
                    <td><Link className="font-semibold text-link" href={`/os/${order.id}`}>{order.label}</Link></td>
                    <td>{formatDate(order.enteredAt)}</td>
                    <td className="num">{order.mileageIn?.toLocaleString("pt-BR") ?? "—"}</td>
                    <td><StatusBadge status={order.serviceStatus} /></td>
                    {order.showPrices ? <td><PaymentBadge status={order.paymentStatus} /></td> : null}
                    {order.showPrices ? <td><Money cents={order.totals.totalCents} /></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {editable ? (
          <form action={updateVehicle} className="space-y-3 rounded-lg border border-line bg-card p-4">
            <h2 className="display text-lg">Dados do carro</h2>
            <input type="hidden" name="id" value={vehicle.id} />
            <input name="plate" defaultValue={vehicle.plate} className={inputClass()} />
            <input name="brand" defaultValue={vehicle.brand} className={inputClass()} />
            <input name="model" defaultValue={vehicle.model} className={inputClass()} />
            <input name="year" defaultValue={vehicle.year ?? ""} className={inputClass()} />
            <input name="color" defaultValue={vehicle.color} className={inputClass()} />
            <p className="text-xs text-muted">
              Cliente: <Link className="text-link" href={`/clientes/${vehicle.clientId}`}>{vehicle.client.name}</Link>
            </p>
            <SubmitButton>Salvar veículo</SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
