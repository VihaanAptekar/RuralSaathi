import PageHeader from '../components/PageHeader.jsx';
import { CashFlowChart, DataTable, ErrorState, formatMoney, formatPercent, LoadingState } from '../components/UI.jsx';
import { Kpi } from '../components/UI.jsx';
import { useVillageDashboard } from '../hooks/useVillageDashboard.js';

export default function VillageDashboardPage({ onOpenHousehold }) {
  const dashboard = useVillageDashboard();
  if (dashboard.isPending) return <LoadingState label="Loading village dashboard…" />;
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />;

  const data = dashboard.data;
  const kpis = data.kpis;
  const incomeMix = data.incomeMix ?? [];
  const maxIncome = Math.max(1, ...incomeMix.map((item) => Number(item.amount) || 0));

  return (
    <>
      <PageHeader title="Village dashboard" description="How the whole village is earning, spending and saving across the year." />
      <div className="grid">
        <Kpi label="Households" value={kpis.households} />
        <Kpi label="Avg income / mo" value={formatMoney(kpis.avgMonthlyIncome)} />
        <Kpi label="Avg savings rate" value={formatPercent(kpis.avgSavingsRatePct)} />
        <Kpi label="Over-indebted" value={kpis.overIndebted} />
      </div>
      <div className="card"><h3>12-month cash flow</h3><CashFlowChart rows={data.cashFlow ?? []} /></div>
      <div className="card">
        <h3>Income mix</h3>
        {incomeMix.map((item) => <div key={item.source}>{item.source} <span className="mut">{formatMoney(item.amount)}</span><div className="bar"><i style={{ width: `${Math.min(100, (item.amount / maxIncome) * 100)}%` }} /></div></div>)}
      </div>
      <div className="card">
        <h3>Over-indebted households</h3>
        <DataTable
          columns={['Household', 'Debt-to-income']}
          rows={(data.overIndebtedList ?? []).map((item) => ({
            key: item.id,
            cells: [<button className="text-link" onClick={() => onOpenHousehold(item.id)} type="button">{item.head_name}</button>, formatPercent(item.debtToIncomePct)],
          }))}
        />
      </div>
    </>
  );
}
