import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder, getSettings, listClientOptions, listMechanics } from "@/lib/data";
import { canEditItems } from "@/lib/domain";
import { formatMoneyInput, formatPlate, formatQty } from "@/lib/format";
import { canEditOrderItems, canSeeCosts } from "@/lib/permissions";

export const metadata = { title: "Editar OS" };

export default async function EditarOsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canEditOrderItems(user.role)) redirect("/os");
  const { id } = await params;
  const order = await getOrder(id, user);
  if (!order) notFound();
  if (!canEditItems(order.serviceStatus)) redirect(`/os/${id}?erro=` + encodeURIComponent("Os itens só podem ser editados antes da execução."));
  const [clients, mechanics, settings] = await Promise.all([listClientOptions(), listMechanics(), getSettings()]);

  return (
    <div>
      <PageHeader eyebrow={order.label} title="Editar itens" description="Depois da aprovação, a alteração fica registrada na linha do tempo." />
      <OrderForm
        mode="edit"
        orderId={order.id}
        clients={clients}
        mechanics={mechanics}
        marginPercent={settings.marginPercent}
        showCosts={canSeeCosts(user.role)}
        initial={{
          mileage: order.mileageIn?.toString() ?? "",
          problemReport: order.problemReport,
          notes: order.notes,
          discount: order.totals.discountCents ? formatMoneyInput(order.totals.discountCents) : "",
          clientLabel: order.client.name,
          vehicleLabel: `${formatPlate(order.vehicle.plate)} · ${order.vehicle.brand} ${order.vehicle.model}`,
          services: order.services.map((item) => ({
            id: item.id,
            description: item.description,
            price: item.priceCents != null ? formatMoneyInput(item.priceCents) : "",
            mechanicId: item.mechanicId ?? "",
          })),
          parts: order.parts.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: formatQty(item.quantity),
            unitCost: item.unitCostCents != null ? formatMoneyInput(item.unitCostCents) : "",
            unitPrice: item.unitPriceCents != null ? formatMoneyInput(item.unitPriceCents) : "",
          })),
        }}
      />
    </div>
  );
}
