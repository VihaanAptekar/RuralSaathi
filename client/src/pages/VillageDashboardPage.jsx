import PageHeader from '../components/PageHeader.jsx';
import { CashFlowChart, DataTable, ErrorState, formatMoney, formatPercent, LoadingState } from '../components/UI.jsx';
import { Kpi } from '../components/UI.jsx';
import { useVillageDashboard } from '../hooks/useVillageDashboard.js';
import { useTranslation } from '../i18n.jsx';

export default function VillageDashboardPage({ onOpenHousehold }) {
  const { t } = useTranslation();
  const dashboard = useVillageDashboard();
  if (dashboard.isPending) return <LoadingState label="Loading village dashboard…" />;
  if (dashboard.isError) return <ErrorState error={dashboard.error} onRetry={dashboard.refetch} />;

  const data = dashboard.data;
  const kpis = data.kpis;
  const incomeMix = data.incomeMix ?? [];
  const maxIncome = Math.max(1, ...incomeMix.map((item) => Number(item.value) || 0));

  return (
    <>
      <PageHeader title={t('Village dashboard')} description={t('How the whole village is earning, spending and saving across the year.')} />
      <div className="grid">
        <Kpi label={t('Households')} value={kpis.totalHouseholds} />
        <Kpi label={t('Avg income / mo')} value={formatMoney(kpis.avgMonthlyIncomePerHousehold)} />
        <Kpi label={t('Avg savings rate')} value={formatPercent(kpis.avgSavingsRatePct)} />
        <Kpi label={t('Over-indebted')} value={kpis.overIndebtedCount} />
      </div>
      <div className="card"><h3>{t('12-month cash flow')}</h3><CashFlowChart rows={data.cashFlow ?? []} /></div>
      <div className="card">
        <h3>{t('Income mix')}</h3>
        {incomeMix.map((item) => <div key={item.source}>{t(item.source)} <span className="mut">{formatMoney(item.value)}</span><div className="bar"><i style={{ width: `${Math.min(100, (item.value / maxIncome) * 100)}%` }} /></div></div>)}
      </div>
      <div className="card">
        <h3>{t('Over-indebted households')}</h3>
        <DataTable
          columns={['Household', 'Debt-to-income'].map(t)}
          rows={(data.overIndebted ?? []).map((item) => ({
            key: item.id,
            cells: [<button className="text-link" onClick={() => onOpenHousehold(item.id)} type="button">{item.head_name}</button>, formatPercent(item.debtToIncomePct)],
          }))}
        />
      </div>
    </>
  );
}
