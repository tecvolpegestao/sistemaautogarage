import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { computeTotals } from "../src/lib/domain";

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 11) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour + 3, 15, 0, 0);
  return date;
}

async function main() {
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.partItem.deleteMany();
  await prisma.serviceItem.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const passwordHash = await bcrypt.hash("oficina", 10);
  const [victor, ana, diego, paula] = await Promise.all([
    prisma.user.create({ data: { name: "Victor", email: "victor@autogarage.com", passwordHash, role: "OWNER" } }),
    prisma.user.create({ data: { name: "Ana", email: "ana@autogarage.com", passwordHash, role: "RECEPTION" } }),
    prisma.user.create({ data: { name: "Diego", email: "diego@autogarage.com", passwordHash, role: "PRODUCTION" } }),
    prisma.user.create({ data: { name: "Paula", email: "paula@autogarage.com", passwordHash, role: "FINANCE" } }),
  ]);

  await prisma.setting.create({
    data: {
      id: "default",
      legalName: "Autogarage",
      tradeName: "Autogarage",
      cnpj: "",
      pixKey: "",
      phone: "",
      address: "Endereço em atualização — mudança de local",
      marginPercent: 40,
    },
  });

  const carPrime = await prisma.client.create({
    data: { name: "Car Prime", phone: "11988880001", type: "PARTNER", email: "contato@carprime.com.br" },
  });
  const frota = await prisma.client.create({
    data: { name: "Frota Norte", phone: "11988880002", type: "PARTNER" },
  });
  const marcos = await prisma.client.create({
    data: { name: "Marcos Almeida", phone: "11988880003", type: "INDIVIDUAL" },
  });
  const juliana = await prisma.client.create({
    data: { name: "Juliana Costa", phone: "11988880004", type: "INDIVIDUAL" },
  });
  const rafael = await prisma.client.create({
    data: { name: "Rafael Mendes", phone: "11988880005", type: "INDIVIDUAL" },
  });
  const fernanda = await prisma.client.create({
    data: { name: "Fernanda Lima", phone: "11988880006", type: "INDIVIDUAL" },
  });
  const paulo = await prisma.client.create({
    data: { name: "Paulo Henrique", phone: "11988880007", type: "INDIVIDUAL" },
  });

  const kwid = await prisma.vehicle.create({
    data: { clientId: carPrime.id, plate: "QWE1A23", brand: "Renault", model: "Kwid", year: 2023, color: "Branco" },
  });
  const peugeot = await prisma.vehicle.create({
    data: { clientId: carPrime.id, plate: "RTY2B34", brand: "Peugeot", model: "208", year: 2022, color: "Cinza" },
  });
  const hb20 = await prisma.vehicle.create({
    data: { clientId: carPrime.id, plate: "UIO3C45", brand: "Hyundai", model: "HB20", year: 2021, color: "Prata" },
  });
  const onixFrota = await prisma.vehicle.create({
    data: { clientId: frota.id, plate: "ASD4D56", brand: "Chevrolet", model: "Onix", year: 2020, color: "Branco" },
  });
  const civic = await prisma.vehicle.create({
    data: { clientId: marcos.id, plate: "FGH5E67", brand: "Honda", model: "Civic", year: 2019, color: "Preto" },
  });
  const corolla = await prisma.vehicle.create({
    data: { clientId: juliana.id, plate: "JKL6F78", brand: "Toyota", model: "Corolla", year: 2021, color: "Prata" },
  });
  const toro = await prisma.vehicle.create({
    data: { clientId: rafael.id, plate: "MNB7G89", brand: "Fiat", model: "Toro", year: 2022, color: "Vermelha" },
  });
  const polo = await prisma.vehicle.create({
    data: { clientId: fernanda.id, plate: "VCX8H90", brand: "Volkswagen", model: "Polo", year: 2020, color: "Branco" },
  });
  const onixPaulo = await prisma.vehicle.create({
    data: { clientId: paulo.id, plate: "ZAQ9J12", brand: "Chevrolet", model: "Onix", year: 2018, color: "Preto" },
  });

  async function makeOrder(input: {
    number: number;
    clientId: string;
    vehicleId: string;
    mileageIn?: number;
    problemReport: string;
    notes?: string;
    status: string;
    discountCents?: number;
    enteredAt: Date;
    updatedAt?: Date;
    approvalAt?: Date;
    approvalChannel?: string;
    scheduledAt?: Date;
    mechanicId?: string;
    readyAt?: Date;
    deliveredAt?: Date;
    services: { description: string; priceCents: number; mechanicId?: string }[];
    parts?: { description: string; quantity: number; unitCostCents: number; unitPriceCents: number }[];
    payments?: { amountCents: number; paidAt: Date; method: string; installments?: number; createdById: string }[];
    events: { message: string; createdAt: Date; userName: string }[];
  }) {
    const parts = input.parts ?? [];
    const payments = input.payments ?? [];
    const totals = computeTotals({
      services: input.services,
      parts,
      discountCents: input.discountCents ?? 0,
      paidCents: payments.reduce((sum, payment) => sum + payment.amountCents, 0),
    });
    return prisma.serviceOrder.create({
      data: {
        number: input.number,
        clientId: input.clientId,
        vehicleId: input.vehicleId,
        mileageIn: input.mileageIn,
        problemReport: input.problemReport,
        notes: input.notes ?? "",
        serviceStatus: input.status,
        paymentStatus: totals.paymentStatus,
        discountCents: input.discountCents ?? 0,
        enteredAt: input.enteredAt,
        updatedAt: input.updatedAt ?? input.enteredAt,
        approvalAt: input.approvalAt,
        approvalChannel: input.approvalChannel,
        scheduledAt: input.scheduledAt,
        mechanicId: input.mechanicId,
        readyAt: input.readyAt,
        deliveredAt: input.deliveredAt,
        services: { create: input.services },
        parts: { create: parts },
        payments: {
          create: payments.map((payment) => ({ ...payment, installments: payment.installments ?? 1 })),
        },
        events: {
          create: input.events.map((event) => ({ ...event, type: "SEED", userId: victor.id })),
        },
      },
    });
  }

  await makeOrder({
    number: 1,
    clientId: carPrime.id,
    vehicleId: kwid.id,
    mileageIn: 45210,
    problemReport: "Barulho na caixa de câmbio e dificuldade para engatar a marcha.",
    status: "DELIVERED",
    enteredAt: daysAgo(12),
    updatedAt: daysAgo(6),
    approvalAt: daysAgo(12),
    approvalChannel: "WHATSAPP",
    mechanicId: diego.id,
    readyAt: daysAgo(7),
    deliveredAt: daysAgo(6),
    services: [
      { description: "Desmontagem e montagem da caixa de câmbio", priceCents: 40000 },
      { description: "Reparo na caixa de câmbio", priceCents: 60000 },
    ],
    parts: [{ description: "Óleo de câmbio", quantity: 2, unitCostCents: 4500, unitPriceCents: 8800 }],
    events: [{ message: "Veículo entregue, pagamento em aberto com a loja", createdAt: daysAgo(6), userName: ana.name }],
  });

  await makeOrder({
    number: 2,
    clientId: carPrime.id,
    vehicleId: peugeot.id,
    mileageIn: 38110,
    problemReport: "Batida na traseira e amortecedores estourados.",
    status: "READY",
    enteredAt: daysAgo(2),
    approvalAt: daysAgo(2),
    approvalChannel: "WHATSAPP",
    mechanicId: diego.id,
    readyAt: daysAgo(0),
    services: [{ description: "Substituição dos amortecedores traseiros", priceCents: 20000 }],
    events: [{ message: "Execução concluída. Carro pronto para entrega.", createdAt: daysAgo(0), userName: diego.name }],
  });

  await makeOrder({
    number: 3,
    clientId: carPrime.id,
    vehicleId: hb20.id,
    mileageIn: 62340,
    problemReport: "Revisão dos 60 mil e troca de óleo.",
    status: "IN_PROGRESS",
    enteredAt: daysAgo(1),
    approvalAt: daysAgo(1),
    approvalChannel: "IN_PERSON",
    scheduledAt: daysAgo(0),
    mechanicId: diego.id,
    services: [{ description: "Revisão dos 60 mil", priceCents: 28000, mechanicId: diego.id }],
    parts: [
      { description: "Óleo de motor 5W30", quantity: 4, unitCostCents: 2200, unitPriceCents: 4500 },
      { description: "Filtro de óleo", quantity: 1, unitCostCents: 1800, unitPriceCents: 3500 },
    ],
    events: [{ message: "Execução iniciada", createdAt: daysAgo(0), userName: diego.name }],
  });

  await makeOrder({
    number: 4,
    clientId: frota.id,
    vehicleId: onixFrota.id,
    mileageIn: 80400,
    problemReport: "Disco de freio dianteiro empenado. Peça encomendada.",
    status: "WAITING_PART",
    enteredAt: daysAgo(4),
    approvalAt: daysAgo(4),
    approvalChannel: "PHONE",
    scheduledAt: daysAgo(3),
    mechanicId: diego.id,
    services: [{ description: "Substituição dos discos dianteiros", priceCents: 25000 }],
    parts: [{ description: "Par de discos de freio", quantity: 1, unitCostCents: 18000, unitPriceCents: 32000 }],
    events: [{ message: "Aguardando peça do fornecedor", createdAt: daysAgo(3), userName: diego.name }],
  });

  await makeOrder({
    number: 5,
    clientId: rafael.id,
    vehicleId: toro.id,
    mileageIn: 51020,
    problemReport: "Vazamento de óleo e revisão atrasada. Serviço parado.",
    status: "IN_PROGRESS",
    enteredAt: daysAgo(16),
    updatedAt: daysAgo(12),
    approvalAt: daysAgo(16),
    approvalChannel: "IN_PERSON",
    scheduledAt: daysAgo(15),
    mechanicId: diego.id,
    services: [{ description: "Revisão e correção de vazamento", priceCents: 35000 }],
    parts: [
      { description: "Filtro de óleo", quantity: 1, unitCostCents: 3500, unitPriceCents: 8000 },
      { description: "Óleo de motor", quantity: 4, unitCostCents: 2200, unitPriceCents: 4500 },
    ],
    payments: [{ amountCents: 20000, paidAt: daysAgo(14), method: "PIX", createdById: ana.id }],
    events: [{ message: "Entrada recebida. Execução sem atualização desde então.", createdAt: daysAgo(12), userName: ana.name }],
  });

  await makeOrder({
    number: 6,
    clientId: marcos.id,
    vehicleId: civic.id,
    mileageIn: 97200,
    problemReport: "Pastilha acabando e volante vibrando na frenagem.",
    status: "AWAITING_APPROVAL",
    enteredAt: daysAgo(0),
    services: [{ description: "Substituição de pastilhas e discos dianteiros", priceCents: 32000 }],
    parts: [
      { description: "Jogo de pastilhas", quantity: 1, unitCostCents: 9000, unitPriceCents: 16000 },
      { description: "Par de discos", quantity: 1, unitCostCents: 22000, unitPriceCents: 34000 },
    ],
    events: [{ message: "Orçamento enviado para aprovação", createdAt: daysAgo(0), userName: ana.name }],
  });

  await makeOrder({
    number: 7,
    clientId: juliana.id,
    vehicleId: corolla.id,
    mileageIn: 41000,
    problemReport: "Ar-condicionado sem gelar.",
    status: "SCHEDULED",
    enteredAt: daysAgo(1),
    approvalAt: daysAgo(1),
    approvalChannel: "WHATSAPP",
    scheduledAt: daysAgo(-1),
    mechanicId: diego.id,
    services: [{ description: "Carga de gás e diagnóstico do ar-condicionado", priceCents: 28000 }],
    events: [{ message: "Execução agendada", createdAt: daysAgo(1), userName: ana.name }],
  });

  await makeOrder({
    number: 8,
    clientId: fernanda.id,
    vehicleId: polo.id,
    mileageIn: 33800,
    problemReport: "Troca de óleo e filtros.",
    status: "DELIVERED",
    enteredAt: daysAgo(8),
    updatedAt: daysAgo(2),
    approvalAt: daysAgo(8),
    approvalChannel: "IN_PERSON",
    mechanicId: diego.id,
    readyAt: daysAgo(3),
    deliveredAt: daysAgo(2),
    services: [{ description: "Troca de óleo e filtros", priceCents: 12000 }],
    parts: [
      { description: "Óleo de motor", quantity: 4, unitCostCents: 2200, unitPriceCents: 4000 },
      { description: "Filtro de óleo", quantity: 1, unitCostCents: 1500, unitPriceCents: 2800 },
      { description: "Filtro de ar", quantity: 1, unitCostCents: 2500, unitPriceCents: 4500 },
    ],
    payments: [{ amountCents: 35300, paidAt: daysAgo(0), method: "CARD", installments: 3, createdById: ana.id }],
    events: [{ message: "Pago no cartão em 3 vezes e entregue", createdAt: daysAgo(0), userName: ana.name }],
  });

  await makeOrder({
    number: 9,
    clientId: paulo.id,
    vehicleId: onixPaulo.id,
    mileageIn: 110230,
    problemReport: "Cliente relatou barulho na suspensão. Orçamento ainda em rascunho.",
    status: "QUOTE",
    enteredAt: daysAgo(0),
    services: [{ description: "Diagnóstico de suspensão", priceCents: 8000 }],
    events: [{ message: "Rascunho aberto na entrada do carro", createdAt: daysAgo(0), userName: ana.name }],
  });

  await makeOrder({
    number: 10,
    clientId: marcos.id,
    vehicleId: civic.id,
    mileageIn: 91000,
    problemReport: "Revisão anterior.",
    status: "DELIVERED",
    enteredAt: daysAgo(40),
    updatedAt: daysAgo(36),
    approvalAt: daysAgo(40),
    approvalChannel: "PHONE",
    mechanicId: diego.id,
    deliveredAt: daysAgo(36),
    services: [{ description: "Revisão completa", priceCents: 45000 }],
    parts: [{ description: "Jogo de velas", quantity: 4, unitCostCents: 1800, unitPriceCents: 3500 }],
    payments: [{ amountCents: 59000, paidAt: daysAgo(36), method: "PIX", createdById: ana.id }],
    events: [{ message: "OS antiga paga e entregue", createdAt: daysAgo(36), userName: ana.name }],
  });

  await makeOrder({
    number: 11,
    clientId: juliana.id,
    vehicleId: corolla.id,
    mileageIn: 36000,
    problemReport: "Alinhamento e balanceamento.",
    status: "DELIVERED",
    enteredAt: daysAgo(22),
    updatedAt: daysAgo(20),
    approvalAt: daysAgo(22),
    approvalChannel: "WHATSAPP",
    mechanicId: diego.id,
    deliveredAt: daysAgo(20),
    services: [{ description: "Alinhamento e balanceamento", priceCents: 15000 }],
    payments: [{ amountCents: 15000, paidAt: daysAgo(20), method: "CASH", createdById: ana.id }],
    events: [{ message: "Recebido em dinheiro", createdAt: daysAgo(20), userName: ana.name }],
  });

  await makeOrder({
    number: 12,
    clientId: paulo.id,
    vehicleId: onixPaulo.id,
    mileageIn: 108000,
    problemReport: "Orçamento de funilaria recusado pelo cliente.",
    status: "REFUSED",
    enteredAt: daysAgo(18),
    updatedAt: daysAgo(17),
    services: [{ description: "Funilaria da porta dianteira", priceCents: 90000 }],
    events: [{ message: "Cliente recusou o orçamento", createdAt: daysAgo(17), userName: ana.name }],
  });

  console.log("Base da Autogarage pronta.");
  console.log("Acessos de demonstração, senha: oficina");
  console.log(`${victor.email} · ${ana.email} · ${diego.email} · ${paula.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
