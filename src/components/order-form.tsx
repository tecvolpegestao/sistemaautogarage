"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { suggestPriceCents } from "@/lib/domain";
import { formatMoneyInput, formatPhone, formatPlate, parseMoney } from "@/lib/format";
import type { SaveOrderInput } from "@/lib/order-input";
import { saveOrder } from "@/server/actions/orders";
import { Field, buttonClass, inputClass } from "@/components/ui";

type VehicleOption = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string;
};

type ClientOption = {
  id: string;
  name: string;
  phone: string;
  type: string;
  vehicles: VehicleOption[];
};

type ServiceLine = { id: string; description: string; price: string; mechanicId: string };
type PartLine = {
  id: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  priceTouched: boolean;
};

const emptyService = (): ServiceLine => ({ id: "", description: "", price: "", mechanicId: "" });
const emptyPart = (): PartLine => ({
  id: "",
  description: "",
  quantity: "1",
  unitCost: "",
  unitPrice: "",
  priceTouched: false,
});

export function OrderForm({
  mode,
  orderId,
  clients,
  mechanics,
  marginPercent,
  showCosts,
  initialClientId = "",
  initialVehicleId = "",
  initial,
}: {
  mode: "create" | "edit";
  orderId?: string;
  clients: ClientOption[];
  mechanics: { id: string; name: string }[];
  marginPercent: number;
  showCosts: boolean;
  initialClientId?: string;
  initialVehicleId?: string;
  initial?: {
    mileage: string;
    problemReport: string;
    notes: string;
    discount: string;
    clientLabel: string;
    vehicleLabel: string;
    services: ServiceLine[];
    parts: Omit<PartLine, "priceTouched">[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState(initialClientId);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [newClient, setNewClient] = useState<{ name: string; phone: string; email: string; type: "INDIVIDUAL" | "PARTNER" }>({
    name: "",
    phone: "",
    email: "",
    type: "INDIVIDUAL",
  });
  const [newVehicle, setNewVehicle] = useState({ plate: "", brand: "", model: "", year: "", color: "" });
  const [mileage, setMileage] = useState(initial?.mileage ?? "");
  const [problemReport, setProblemReport] = useState(initial?.problemReport ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [discount, setDiscount] = useState(initial?.discount ?? "");
  const [services, setServices] = useState<ServiceLine[]>(initial?.services.length ? initial.services : [emptyService()]);
  const [parts, setParts] = useState<PartLine[]>(
    initial?.parts.length ? initial.parts.map((part) => ({ ...part, priceTouched: true })) : [emptyPart()],
  );

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const plate = clientQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!q) return clients;
    return clients.filter((client) => {
      const hay = `${client.name} ${formatPhone(client.phone)}`.toLowerCase();
      const plateHit = plate ? client.vehicles.some((vehicle) => vehicle.plate.includes(plate)) : false;
      return hay.includes(q) || plateHit;
    });
  }, [clientQuery, clients]);

  const selected = clients.find((client) => client.id === clientId);
  const vehicles = selected?.vehicles ?? [];

  const labor = services.reduce((sum, line) => sum + (parseMoney(line.price) ?? 0), 0);
  const partsTotal = parts.reduce((sum, line) => {
    const qty = Number(line.quantity.replace(",", ".")) || 0;
    return sum + Math.round(qty * (parseMoney(line.unitPrice) ?? 0));
  }, 0);
  const cost = parts.reduce((sum, line) => {
    const qty = Number(line.quantity.replace(",", ".")) || 0;
    return sum + Math.round(qty * (parseMoney(line.unitCost) ?? 0));
  }, 0);
  const discountCents = parseMoney(discount) ?? 0;
  const total = Math.max(0, labor + partsTotal - discountCents);

  function submit(intent: SaveOrderInput["intent"]) {
    setError(null);
    const payload: SaveOrderInput = {
      orderId,
      mileage,
      problemReport,
      notes,
      discount,
      services: services.map(({ id, description, price, mechanicId }) => ({ id, description, price, mechanicId })),
      parts: parts.map(({ id, description, quantity, unitCost, unitPrice }) => ({
        id,
        description,
        quantity,
        unitCost,
        unitPrice,
      })),
      intent,
    };
    if (mode === "create") {
      if (clientId === "new") payload.newClient = newClient;
      else payload.clientId = clientId;
      if (vehicleId === "new" || clientId === "new") payload.newVehicle = newVehicle;
      else payload.vehicleId = vehicleId;
    }
    startTransition(async () => {
      const result = await saveOrder(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const message = intent === "approval" ? "Orçamento enviado para aprovação." : "Orçamento salvo.";
      router.push(`/os/${result.id}?ok=${encodeURIComponent(message)}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {mode === "edit" ? (
          <section className="rounded-lg border border-line bg-card p-4">
            <p className="text-sm text-muted">Cliente</p>
            <p className="font-semibold">{initial?.clientLabel}</p>
            <p className="mt-3 text-sm text-muted">Veículo</p>
            <p className="font-semibold">{initial?.vehicleLabel}</p>
          </section>
        ) : (
          <section className="space-y-4 rounded-lg border border-line bg-card p-4">
            <Field label="Cliente">
              <input
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value)}
                placeholder="Buscar por nome, telefone ou placa"
                className={inputClass()}
              />
            </Field>
            <select
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setVehicleId("");
              }}
              className={inputClass()}
            >
              <option value="">Selecione</option>
              <option value="new">Cadastrar agora</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {formatPhone(client.phone)}
                </option>
              ))}
            </select>
            {clientId === "new" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome">
                  <input className={inputClass()} value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} />
                </Field>
                <Field label="Telefone">
                  <input className={inputClass()} value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} />
                </Field>
                <Field label="E-mail">
                  <input className={inputClass()} value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} />
                </Field>
                <Field label="Tipo">
                  <select
                    className={inputClass()}
                    value={newClient.type}
                    onChange={(event) =>
                      setNewClient({ ...newClient, type: event.target.value === "PARTNER" ? "PARTNER" : "INDIVIDUAL" })
                    }
                  >
                    <option value="INDIVIDUAL">Particular</option>
                    <option value="PARTNER">Parceiro</option>
                  </select>
                </Field>
              </div>
            ) : null}

            {clientId && clientId !== "new" ? (
              <Field label="Veículo">
                <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className={inputClass()}>
                  <option value="">Selecione</option>
                  <option value="new">Cadastrar veículo agora</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {formatPlate(vehicle.plate)} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {clientId === "new" || vehicleId === "new" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Placa">
                  <input className={inputClass()} value={newVehicle.plate} onChange={(event) => setNewVehicle({ ...newVehicle, plate: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Marca">
                  <input className={inputClass()} value={newVehicle.brand} onChange={(event) => setNewVehicle({ ...newVehicle, brand: event.target.value })} />
                </Field>
                <Field label="Modelo">
                  <input className={inputClass()} value={newVehicle.model} onChange={(event) => setNewVehicle({ ...newVehicle, model: event.target.value })} />
                </Field>
                <Field label="Ano">
                  <input className={inputClass()} value={newVehicle.year} onChange={(event) => setNewVehicle({ ...newVehicle, year: event.target.value })} />
                </Field>
                <Field label="Cor">
                  <input className={inputClass()} value={newVehicle.color} onChange={(event) => setNewVehicle({ ...newVehicle, color: event.target.value })} />
                </Field>
              </div>
            ) : null}
          </section>
        )}

        <section className="grid gap-4 rounded-lg border border-line bg-card p-4 sm:grid-cols-2">
          <Field label="Quilometragem de entrada">
            <input className={inputClass()} inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Relato do problema">
              <textarea className={`${inputClass()} h-24 py-2`} value={problemReport} onChange={(event) => setProblemReport(event.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observações">
              <textarea className={`${inputClass()} h-20 py-2`} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-lg">Mão de obra</h2>
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setServices([...services, emptyService()])}>
              Adicionar serviço
            </button>
          </div>
          <div className="space-y-3">
            {services.map((line, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_140px_160px_auto]">
                <input
                  className={inputClass()}
                  placeholder="Descrição"
                  value={line.description}
                  onChange={(event) => setServices(services.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))}
                />
                <input
                  className={`${inputClass()} num`}
                  placeholder="Valor"
                  value={line.price}
                  onChange={(event) => setServices(services.map((item, i) => (i === index ? { ...item, price: event.target.value } : item)))}
                />
                <select
                  className={inputClass()}
                  value={line.mechanicId}
                  onChange={(event) => setServices(services.map((item, i) => (i === index ? { ...item, mechanicId: event.target.value } : item)))}
                >
                  <option value="">Sem mecânico</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.name}
                    </option>
                  ))}
                </select>
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setServices(services.filter((_, i) => i !== index))}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-lg">Peças</h2>
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setParts([...parts, emptyPart()])}>
              Adicionar peça
            </button>
          </div>
          <div className="space-y-3">
            {parts.map((line, index) => (
              <div key={index} className={`grid gap-2 ${showCosts ? "md:grid-cols-[minmax(0,1.3fr)_90px_120px_120px_auto]" : "md:grid-cols-[minmax(0,1.4fr)_90px_140px_auto]"}`}>
                <input
                  className={inputClass()}
                  placeholder="Descrição"
                  value={line.description}
                  onChange={(event) => setParts(parts.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))}
                />
                <input
                  className={`${inputClass()} num`}
                  placeholder="Qtd"
                  value={line.quantity}
                  onChange={(event) => setParts(parts.map((item, i) => (i === index ? { ...item, quantity: event.target.value } : item)))}
                />
                {showCosts ? (
                  <input
                    className={`${inputClass()} num`}
                    placeholder="Custo"
                    value={line.unitCost}
                    onChange={(event) => {
                      const value = event.target.value;
                      setParts(
                        parts.map((item, i) => {
                          if (i !== index) return item;
                          const next = { ...item, unitCost: value };
                          if (!item.priceTouched) {
                            const cost = parseMoney(value) ?? 0;
                            next.unitPrice = cost ? formatMoneyInput(suggestPriceCents(cost, marginPercent)) : "";
                          }
                          return next;
                        }),
                      );
                    }}
                  />
                ) : null}
                <input
                  className={`${inputClass()} num`}
                  placeholder="Preço"
                  value={line.unitPrice}
                  onChange={(event) =>
                    setParts(parts.map((item, i) => (i === index ? { ...item, unitPrice: event.target.value, priceTouched: true } : item)))
                  }
                />
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setParts(parts.filter((_, i) => i !== index))}>
                  Remover
                </button>
              </div>
            ))}
          </div>
          {showCosts ? (
            <p className="mt-3 text-xs text-muted">O preço sugerido usa a margem de {marginPercent}%. Dá para alterar na hora.</p>
          ) : (
            <p className="mt-3 text-xs text-muted">O custo da peça fica com o dono. Aqui entra só o valor cobrado.</p>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-line bg-card p-4 lg:sticky lg:top-6">
        <h2 className="display text-lg">Totais</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Mão de obra</dt><dd className="num">{formatMoneyInput(labor)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Peças</dt><dd className="num">{formatMoneyInput(partsTotal)}</dd></div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Desconto</dt>
            <input className={`${inputClass()} num max-w-32`} value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt><dd className="num">{formatMoneyInput(total)}</dd>
          </div>
          {showCosts ? (
            <div className="flex justify-between text-muted">
              <dt>Custo das peças</dt><dd className="num">{formatMoneyInput(cost)}</dd>
            </div>
          ) : null}
        </dl>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-4 flex flex-col gap-2">
          {mode === "create" || initial ? (
            <button type="button" disabled={pending} className={buttonClass("secondary")} onClick={() => submit(mode === "edit" ? "save" : "draft")}>
              {pending ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Salvar rascunho"}
            </button>
          ) : null}
          {mode === "create" ? (
            <button type="button" disabled={pending} className={buttonClass("primary")} onClick={() => submit("approval")}>
              Enviar para aprovação
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
