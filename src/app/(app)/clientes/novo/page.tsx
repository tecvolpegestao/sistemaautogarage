import { redirect } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { canManageClients } from "@/lib/permissions";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  const user = await requireUser();
  if (!canManageClients(user.role)) redirect("/clientes");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Cadastro" title="Novo cliente" />
      <ClientForm />
    </div>
  );
}
