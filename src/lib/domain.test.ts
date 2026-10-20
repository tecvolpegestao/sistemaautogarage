import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWhatsappSummary,
  canTransition,
  computeTotals,
  isStale,
  periodRange,
  suggestPriceCents,
} from "./domain";
import { parseMoney, parseQty } from "./format";

describe("computeTotals", () => {
  it("calcula lucro como cobrado menos custo das peças", () => {
    const totals = computeTotals({
      services: [{ priceCents: 40000 }, { priceCents: 60000 }],
      parts: [{ quantity: 2, unitPriceCents: 8800, unitCostCents: 4500 }],
      discountCents: 0,
      paidCents: 0,
    });
    assert.equal(totals.laborCents, 100000);
    assert.equal(totals.partsCents, 17600);
    assert.equal(totals.totalCents, 117600);
    assert.equal(totals.costCents, 9000);
    assert.equal(totals.profitCents, 108600);
    assert.equal(totals.paymentStatus, "UNPAID");
    assert.equal(totals.balanceCents, 117600);
  });

  it("marca pagamento parcial e pago", () => {
    const base = {
      services: [{ priceCents: 10000 }],
      parts: [],
      discountCents: 0,
    };
    assert.equal(computeTotals({ ...base, paidCents: 4000 }).paymentStatus, "PARTIAL");
    assert.equal(computeTotals({ ...base, paidCents: 10000 }).paymentStatus, "PAID");
    assert.equal(computeTotals({ ...base, paidCents: 0 }).paymentStatus, "UNPAID");
  });

  it("não deixa desconto negativo no total", () => {
    const totals = computeTotals({
      services: [{ priceCents: 5000 }],
      parts: [],
      discountCents: 8000,
      paidCents: 0,
    });
    assert.equal(totals.totalCents, 0);
  });
});

describe("status", () => {
  it("só permite o fluxo confirmado", () => {
    assert.equal(canTransition("AWAITING_APPROVAL", "APPROVED"), true);
    assert.equal(canTransition("AWAITING_APPROVAL", "IN_PROGRESS"), false);
    assert.equal(canTransition("IN_PROGRESS", "WAITING_PART"), true);
    assert.equal(canTransition("WAITING_PART", "IN_PROGRESS"), true);
    assert.equal(canTransition("READY", "DELIVERED"), true);
    assert.equal(canTransition("DELIVERED", "IN_PROGRESS"), false);
    assert.equal(canTransition("REFUSED", "APPROVED"), false);
  });

  it("destaca OS parada fora dos estados finais", () => {
    const old = new Date("2026-10-01T12:00:00.000Z");
    const now = new Date("2026-10-20T12:00:00.000Z");
    assert.equal(isStale("IN_PROGRESS", old, now), true);
    assert.equal(isStale("DELIVERED", old, now), false);
  });
});

describe("periodo", () => {
  it("separa semana, quinzena e mês em São Paulo", () => {
    const now = new Date("2026-10-20T15:00:00.000Z");
    const week = periodRange("semana", now);
    assert.equal(week.start.toISOString(), "2026-10-19T03:00:00.000Z");
    assert.equal(week.end.toISOString(), "2026-10-26T02:59:59.999Z");
    const fortnight = periodRange("quinzena", now);
    assert.equal(fortnight.start.toISOString(), "2026-10-16T03:00:00.000Z");
    const month = periodRange("mes", now);
    assert.equal(month.start.toISOString(), "2026-10-01T03:00:00.000Z");
    assert.equal(month.end.toISOString(), "2026-11-01T02:59:59.999Z");
  });
});

describe("preço e dinheiro", () => {
  it("sugere preço pela margem e continua editável na origem", () => {
    assert.equal(suggestPriceCents(10000, 40), 14000);
  });

  it("entende valores em reais", () => {
    assert.equal(parseMoney("1.176,00"), 117600);
    assert.equal(parseMoney("R$ 200,50"), 20050);
    assert.equal(parseMoney("400"), 40000);
    assert.equal(parseMoney(""), 0);
    assert.equal(parseMoney("abc"), null);
    assert.equal(parseQty("2,5"), 2.5);
    assert.equal(parseQty("0"), null);
  });
});

describe("resumo de WhatsApp", () => {
  it("leva o total e não leva custo", () => {
    const text = buildWhatsappSummary({
      tradeName: "Autogarage",
      label: "OS 0007",
      clientName: "Car Prime",
      vehicle: "Kwid Branco · QWE-1A23",
      mileageIn: 45210,
      services: [{ description: "Reparo na caixa de câmbio", priceCents: 60000 }],
      parts: [{ description: "Óleo de câmbio", quantity: 2, unitPriceCents: 8800 }],
      discountCents: 0,
      totalCents: 77600,
      pixKey: "contato@autogarage.com.br",
    });
    assert.match(text, /Total: R\$\s?776,00/);
    assert.match(text, /Car Prime/);
    assert.doesNotMatch(text, /[Cc]usto/);
  });
});
