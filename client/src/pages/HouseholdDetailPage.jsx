import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { CashFlowChart, DataTable, ErrorState, formatMoney, formatPercent, initials, Kpi, LoadingState, StatusPill, titleCase } from '../components/UI.jsx';
import { useBudget } from '../hooks/useBudget.js';
import { useCropRisk } from '../hooks/useCropRisk.js';
import { useHouseholdRecords, useAddHouseholdRecord } from '../hooks/useHouseholdRecords.js';
import { useHouseholds } from '../hooks/useHouseholds.js';
import { useMeta } from '../hooks/useMeta.js';
import { useTranslation } from '../i18n.jsx';

function RecordForm({ householdId, type, label, fields, options }) {
  const { t } = useTranslation();
  const mutation = useAddHouseholdRecord(householdId, type);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    for (const field of fields) {
      if (field.type === 'number') values[field.name] = Number(values[field.name]);
    }
    setError('');
    try {
      await mutation.mutateAsync(values);
      form.reset();
    } catch (cause) {
      setError(cause.message);
    }
  }

  return (
    <details>
      <summary>+ {t('Add')} {t(label)}</summary>
      <form onSubmit={submit}>
        {fields.map((field) => {
          const id = `${type}-${field.name}`;
          const items = options[field.optionsKey] ?? [];
          return (
            <div key={field.name}>
              <label htmlFor={id}>              {t(field.label)}</label>
              {field.optionsKey ? (
                <select id={id} name={field.name} required>
                  {items.map((item) => <option key={item} value={item}>{t(options.cropLabels?.[item] ?? item)}</option>)}
                </select>
              ) : (
                <input id={id} name={field.name} type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined} min={field.min} required />
              )}
            </div>
          );
        })}
        <button className="btn" disabled={mutation.isPending}>{t('Save')}</button>
        {error && <div className="form-error" role="alert">{t(error)}</div>}
        {mutation.isSuccess && <small className="saved">{t('Saved')}</small>}
      </form>
    </details>
  );
}

function RecordsTab({ id }) {
  const { t } = useTranslation();
  const records = useHouseholdRecords(id);
  const meta = useMeta();
  if (records.isPending) return <LoadingState label="Loading household records…" />;
  if (records.isError) return <ErrorState error={records.error} onRetry={records.refetch} />;

  const data = records.data ?? {};
  const formOptions = meta.data ?? {};
  const forms = [
    { type: 'income', label: 'income', fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'source_type', label: 'Source', optionsKey: 'incomeSourceTypes' },
      { name: 'amount', label: 'Amount (₹)', type: 'number', min: '0.01' },
    ] },
    { type: 'expenses', label: 'expense', fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'category', label: 'Category', optionsKey: 'expenseCategories' },
      { name: 'amount', label: 'Amount (₹)', type: 'number', min: '0.01' },
    ] },
    { type: 'loans', label: 'loan', fields: [
      { name: 'lender_type', label: 'Lender', optionsKey: 'lenderTypes' },
      { name: 'principal', label: 'Principal', type: 'number', min: '0.01' },
      { name: 'interest_rate_pct', label: 'Interest %', type: 'number', min: '0' },
      { name: 'monthly_installment', label: 'Monthly EMI', type: 'number', min: '0' },
      { name: 'start_date', label: 'Start', type: 'date' },
      { name: 'months_remaining', label: 'Months left', type: 'number', min: '0' },
    ] },
    { type: 'crops', label: 'crop', fields: [
      { name: 'crop_name', label: 'Crop', optionsKey: 'crops' },
      { name: 'sowing_month', label: 'Sowing month (1-12)', type: 'number', min: '1' },
      { name: 'acreage', label: 'Acres', type: 'number', min: '0.01' },
      { name: 'irrigation_type', label: 'Irrigation', optionsKey: 'irrigationTypes' },
      { name: 'expected_yield_quintal', label: 'Yield (qtl)', type: 'number', min: '0' },
      { name: 'cost_per_acre', label: 'Cost / acre', type: 'number', min: '0' },
    ] },
  ];

  return (
    <>
      <div className="card">
        {meta.isError && <p className="form-error" role="alert">{t('Could not load form options: {error}', { error: t(meta.error.message) })}</p>}
        {forms.map((form) => <RecordForm key={form.type} householdId={id} {...form} options={formOptions} />)}
      </div>
      <div className="card"><h3>{t('Income')}</h3><DataTable columns={['Date', 'Source', 'Amount']} rows={(data.income ?? []).slice(-8).reverse().map((item) => ({ key: item.id, cells: [item.date, t(item.source_type), formatMoney(item.amount)] }))} /></div>
      <div className="card"><h3>{t('Expenses')}</h3><DataTable columns={['Date', 'Category', 'Amount']} rows={(data.expenses ?? []).slice(-8).reverse().map((item) => ({ key: item.id, cells: [item.date, t(item.category), formatMoney(item.amount)] }))} /></div>
      <div className="card"><h3>{t('Loans')}</h3><DataTable columns={['Lender', 'Principal', 'Rate', 'EMI', 'Months left']} rows={(data.loans ?? []).map((item) => ({ key: item.id, cells: [t(item.lender_type), formatMoney(item.principal), `${item.interest_rate_pct}%`, formatMoney(item.monthly_installment), item.months_remaining] }))} /></div>
      <div className="card"><h3>{t('Crops')}</h3><DataTable columns={['Crop', 'Acres', 'Irrigation', 'Yield']} rows={(data.crops ?? []).map((item) => ({ key: item.id, cells: [t(formOptions.cropLabels?.[item.crop_name] ?? titleCase(item.crop_name)), item.acreage, t(item.irrigation_type), `${item.expected_yield_quintal} qtl`] }))} /></div>
    </>
  );
}

function BudgetTab({ id }) {
  const { t } = useTranslation();
  const budget = useBudget(id);
  if (budget.isPending) return <LoadingState label="Loading budget…" />;
  if (budget.isError) return <ErrorState error={budget.error} onRetry={budget.refetch} />;
  const data = budget.data;
  const items = [
    [t('Avg income / mo'), formatMoney(data.avgMonthlyIncome)],
    [t('Avg expense / mo'), formatMoney(data.avgMonthlyExpense)],
    [t('Net cash flow / mo'), formatMoney(data.monthlyNetCashFlow)],
    [t('Savings rate'), formatPercent(data.savingsRatePct)],
    [t('Debt-to-income'), formatPercent(data.debtToIncomePct)],
    [t('Lean-season buffer'), formatMoney(data.leanSeasonBuffer)],
  ];

  return <><div className="grid">{items.map(([label, value]) => <Kpi key={label} label={label} value={value} />)}</div><div className="card"><h3>{t('Buffer status:')} <StatusPill value={data.bufferStatus} /></h3><CashFlowChart rows={data.monthlySeries ?? []} /></div></>;
}

function CropRiskTab({ id }) {
  const { t } = useTranslation();
  const risk = useCropRisk(id);
  const records = useHouseholdRecords(id);
  if (risk.isPending) return <LoadingState label="Loading crop risk…" />;
  if (risk.isError) return <ErrorState error={risk.error} onRetry={risk.refetch} />;
  const crops = new Map((records.data?.crops ?? []).map((crop) => [crop.id, crop]));

  return (
    <>
      <div className="card"><h3>{t('Crop risk')}</h3><DataTable columns={['Crop', 'Acres', 'Risk', 'Rainfall', 'Price volatility', 'Recommendations']} rows={(risk.data.assessments ?? []).map((assessment, index) => ({
        key: assessment.cropId ?? `${assessment.cropName}-${index}`,
        cells: [t(assessment.label ?? titleCase(assessment.cropName)), crops.get(assessment.cropId)?.acreage ?? '—', <><StatusPill value={assessment.classification} /> {formatPercent(assessment.overall)}</>, `${assessment.rainfall?.score ?? 0} · ${assessment.rainfall?.avgCriticalRainfall ?? 0} ${t('mm')}`, formatPercent(assessment.price?.volatilityPct), (assessment.recommendations ?? []).map(t).join(' ') || '—'],
      }))} /></div>
      <div className="card"><h3>{t('Acreage concentration')}</h3>{(risk.data.concentration ?? []).map((crop, index) => <div key={crop.cropId ?? `${crop.cropName}-${index}`}>{t(crop.label ?? titleCase(crop.cropName))} {crop.sharePct}%<div className="bar"><i style={{ width: `${crop.sharePct}%` }} /></div></div>)}</div>
    </>
  );
}

export default function HouseholdDetailPage({ id, tab, onTabChange, onBack }) {
  const { t } = useTranslation();
  const households = useHouseholds();
  if (households.isPending) return <LoadingState label="Loading household…" />;
  if (households.isError) return <ErrorState error={households.error} onRetry={households.refetch} />;
  const household = (households.data ?? []).find((item) => String(item.id) === String(id));
  if (!household) return <ErrorState error={new Error(t('Household not found.'))} onRetry={onBack} />;

  return (
    <>
      <button className="btn g back-button" onClick={onBack} type="button">← {t('All households')}</button>
      <div className="ph">
        <div className="av lg">{initials(household.head_name)}</div>
        <div><PageHeader title={household.head_name} /><div className="chips"><span className="chip">📍 {household.village}</span><span className="chip">{household.land_acres} {t('Acres')}</span><span className="chip">{t('Family of {count}', { count: household.family_size })}</span><span className="chip">{t(household.irrigation_type)}</span></div></div>
        <div className="ph-status"><StatusPill value={household.bufferStatus} /></div>
      </div>
      <div className="tabs" role="tablist" aria-label={t('Household information')}>
        {['records', 'budget', 'risk'].map((key) => <button aria-selected={tab === key} className={`tb ${tab === key ? 'on' : ''}`} key={key} onClick={() => onTabChange(key)} role="tab" type="button">{t(key === 'risk' ? 'Crop risk' : key === 'records' ? 'Records' : 'Budget')}</button>)}
      </div>
      {tab === 'budget' ? <BudgetTab id={id} /> : tab === 'risk' ? <CropRiskTab id={id} /> : <RecordsTab id={id} />}
    </>
  );
}
