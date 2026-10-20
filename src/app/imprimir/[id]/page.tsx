import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintToolbar } from "@/components/print-toolbar";
import { requireUser } from "@/lib/auth";
import { getOrder, getSettings } from "@/lib/data";
import { buildWhatsappSummary } from "@/lib/domain";
import { formatMoney, formatPhone, formatPlate, formatQty } from "@/lib/format";
import { canSeePrices } from "@/lib/permissions";

export const metadata = { title: "Documento" };

export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canSeePrices(user.role)) redirect("/os");
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrder(id, user), getSettings()]);
  if (!order || order.totals.totalCents == null) notFound();

  const summary = buildWhatsappSummary({
    tradeName: settings.tradeName,
    label: order.label,
    clientName: order.client.name,
    vehicle: `${order.vehicle.brand} ${order.vehicle.model} ${order.vehicle.color} · ${formatPlate(order.vehicle.plate)}`,
    mileageIn: order.mileageIn,
    services: order.services.flatMap((item) => (item.priceCents == null ? [] : [{ description: item.description, priceCents: item.priceCents }])),
    parts: order.parts.flatMap((item) => (item.unitPriceCents == null ? [] : [{ description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents }])),
    discountCents: order.totals.discountCents ?? 0,
    totalCents: order.totals.totalCents,
    pixKey: settings.pixKey,
  });

  return (
    <main className="min-h-screen bg-[#E0E0E0] px-4 py-6 text-[#0A0A0A]">
      <div className="no-print mx-auto mb-4 flex max-w-[800px] items-center justify-between gap-3">
        <Link href={`/os/${order.id}`} className="text-sm font-semibold text-[#7A5900] underline">
          Voltar para a OS
        </Link>
        <PrintToolbar text={summary} filename={`${order.label.replace(/\s+/g, "-")}.jpg`} />
      </div>
      <article id="documento" className="print-doc shadow-none">
        <img src="/brand/logo-black.png" alt="Autogarage" className="h-12 w-auto" />
        <p className="mt-4 text-sm">{settings.legalName}</p>
        {settings.cnpj ? <p className="text-sm">CNPJ {settings.cnpj}</p> : null}
        {settings.address ? <p className="text-sm">{settings.address}</p> : null}
        {settings.phone ? <p className="text-sm">{settings.phone}</p> : null}
        <h1 className="display mt-6 text-3xl">{order.label}</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#595959]">Cliente</p>
            <p className="font-semibold">{order.client.name}</p>
            <p>{formatPhone(order.client.phone)}</p>
          </div>
          <div>
            <p className="text-[#595959]">Veículo</p>
            <p className="font-semibold">{formatPlate(order.vehicle.plate)}</p>
            <p>{order.vehicle.brand} {order.vehicle.model} {order.vehicle.year ?? ""} {order.vehicle.color}</p>
            {order.mileageIn != null ? <p>{order.mileageIn.toLocaleString("pt-BR")} km</p> : null}
          </div>
        </div>
        {order.problemReport ? <p className="mt-4 text-sm">{order.problemReport}</p> : null}
        <table className="mt-6">
          <thead>
            <tr>
              <th>Item</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {order.services.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.priceCents != null ? formatMoney(item.priceCents) : ""}</td>
              </tr>
            ))}
            {order.parts.map((item) => (
              <tr key={item.id}>
                <td>{formatQty(item.quantity)}× {item.description}</td>
                <td>{item.unitPriceCents != null ? formatMoney(Math.round(item.quantity * item.unitPriceCents)) : ""}</td>
              </tr>
            ))}
            {(order.totals.discountCents ?? 0) > 0 ? (
              <tr>
                <td>Desconto</td>
                <td>- {formatMoney(order.totals.discountCents ?? 0)}</td>
              </tr>
            ) : null}
            <tr>
              <td className="font-semibold">Total</td>
              <td className="font-semibold">{formatMoney(order.totals.totalCents)}</td>
            </tr>
          </tbody>
        </table>
        {settings.pixKey ? <p className="mt-6 text-sm">Chave Pix: {settings.pixKey}</p> : <p className="mt-6 text-sm">Chave Pix: a configurar</p>}
        <div className="mt-16 grid grid-cols-2 gap-10 text-sm">
          <div className="border-t border-[#0A0A0A] pt-2">Assinatura do cliente</div>
          <div className="border-t border-[#0A0A0A] pt-2">{settings.tradeName}</div>
        </div>
      </article>
    </main>
  );
}
