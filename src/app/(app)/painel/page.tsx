import Link from "next/link";
import { PageHeader, Card, Money } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/data";
import { SERVICE_STATUS_LABEL, isPeriodKey, type PeriodKey } from "@/lib/domain";
import { daysSince, formatDate, one } from "@/lib/format";
import { Plate } from "@/components/ui";

export const metadata = { title: "Painel" };

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const requested = one(sp, "periodo");
  const period: PeriodKey = isPeriodKey(requested) ? requested : "semana";
  const data = await getDashboard(user, period);
  const maxBar = Math.max(1, ...data.chart.flatMap((week) => [week.charged, week.received]));

  const kpis = [
    data.chargedCents != null ? { href: "/os", label: "Cobrado", value: data.chargedCents, hint: data.range.label } : null,
    data.receivedCents != null ? { href: "/recebimentos", label: "Recebido", value: data.receivedCents, hint: data.range.label } : null,
    data.receivableCents != null ? { href: "/a-receber", label: "A receber", value: data.receivableCents, hint: "Saldo em aberto" } : null,
    data.costCents != null ? { href: "/os", label: "Custo das peças", value: data.costCents, hint: data.range.label } : null,
    data.profitCents != null ? { href: "/os", label: "Lucro", value: data.profitCents, hint: "Cobrado menos custo" } : null,
  ].filter((item) => item != null);

  return (
    <div>
      <PageHeader
        eyebrow="Oficina"
        title="Painel"
        description={data.production ? "As OS atribuídas a você." : "Como a oficina está neste período."}
        actions={
          <div className="flex rounded-md border border-line p-1">
            {(
              [
                ["semana", "Semana"],
                ["quinzena", "Quinzena"],
                ["mes", "Mês"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={`/painel?periodo=${key}`}
                className={`rounded px-3 py-1.5 text-sm ${period === key ? "bg-brand font-semibold text-on-brand" : "text-muted"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        }
      />

      {kpis.length ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="rounded-lg border border-line bg-card p-4 hover:border-brand">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                <Money cents={kpi.value} />
              </p>
              <p className="mt-1 text-xs text-muted">{kpi.hint}</p>
            </Link>
          ))}
        </div>
      ) : null}

      <Card className="mb-6 p-4">
        <h2 className="display text-lg">{data.production ? "Seus carros" : "Carros no pátio"}</h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {data.yard.map((item) => (
            <Link
              key={item.status}
              href={`/os?status=${item.status}`}
              className="min-w-32 rounded-md border border-line bg-elevated px-3 py-3 hover:border-brand"
            >
              <p className="display text-2xl">{item.count}</p>
              <p className="mt-1 text-xs text-muted">{SERVICE_STATUS_LABEL[item.status]}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {data.chart.length ? (
          <Card className="p-4">
            <h2 className="display text-lg">Cobrado e recebido</h2>
            <p className="mt-1 text-xs text-muted">Últimas oito semanas. Amarelo é cobrado, verde é recebido.</p>
            <div className="mt-4 flex h-44 items-end gap-2">
              {data.chart.map((week) => (
                <div key={week.label} className="flex h-full flex-1 flex-col justify-end">
                  <div className="flex h-full items-end justify-center gap-1">
                    <div className="w-2.5 rounded-sm bg-brand" style={{ height: `${Math.max(week.charged ? 4 : 0, (week.charged / maxBar) * 100)}%` }} />
                    <div className="w-2.5 rounded-sm bg-ok" style={{ height: `${Math.max(week.received ? 4 : 0, (week.received / maxBar) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-center text-[10px] text-muted">{week.label}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="space-y-4">
          <Pending title="Prontos e não entregues" rows={data.pendingReady} />
          {data.showPrices ? <Pending title="Entregues e não pagos" rows={data.pendingPay} money /> : null}
          <Pending title="Aguardando peça" rows={data.pendingParts} />
          <Pending title="Paradas há mais de 7 dias" rows={data.pendingStale} />
        </div>
      </div>

      {data.activity.length ? (
        <Card className="mt-6 p-4">
          <h2 className="display text-lg">Atividade recente</h2>
          <ul className="mt-3 divide-y divide-line">
            {data.activity.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{item.userName ?? "Sistema"}</span>
                  <span className="text-muted"> · {item.detail}</span>
                </span>
                <span className="text-xs text-muted">{formatDate(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Pending({
  title,
  rows,
  money = false,
}: {
  title: string;
  money?: boolean;
  rows: {
    id: string;
    label: string;
    plate: string;
    model: string;
    client: string;
    status: Parameters<typeof StatusBadge>[0]["status"];
    deliveredAt: Date | null;
    balanceCents: number | null;
  }[];
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="display text-lg">{title}</h2>
        <span className="num text-sm text-muted">{rows.length}</span>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">Nada por aqui.</p> : null}
      <ul className="divide-y divide-line">
        {rows.slice(0, 4).map((row) => (
          <li key={row.id}>
            <Link href={`/os/${row.id}`} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="mr-2"><Plate plate={row.plate} /></span>
                <span className="text-sm">{row.model}</span>
                <span className="mt-1 block text-xs text-muted">
                  {row.client}
                  {row.deliveredAt ? ` · ${daysSince(row.deliveredAt)} dias` : ""}
                </span>
              </span>
              {money ? <Money cents={row.balanceCents} /> : <StatusBadge status={row.status} />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
