import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSettings, listClientOptions, listMechanics } from "@/lib/data";
import { one } from "@/lib/format";
import { canEditOrderItems, canSeeCosts } from "@/lib/permissions";

export const metadata = { title: "Nova OS" };

export default async function NovaOsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!canEditOrderItems(user.role)) redirect("/os");
  const sp = await searchParams;
  const [clients, mechanics, settings] = await Promise.all([listClientOptions(), listMechanics(), getSettings()]);
  return (
    <div>
      <PageHeader eyebrow="Operação" title="Nova OS" description="Registre o carro que chegou e monte o orçamento." />
      <OrderForm
        mode="create"
        clients={clients}
        mechanics={mechanics}
        marginPercent={settings.marginPercent}
        showCosts={canSeeCosts(user.role)}
        initialClientId={one(sp, "cliente") ?? ""}
        initialVehicleId={one(sp, "veiculo") ?? ""}
      />
    </div>
  );
}
