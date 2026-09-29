import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { CashFlowChart, DataTable, ErrorState, formatMoney, formatPercent, initials, Kpi, LoadingState, StatusPill, titleCase } from '../components/UI.jsx';
import { useBudget } from '../hooks/useBudget.js';
import { useCropRisk } from '../hooks/useCropRisk.js';
import { useHouseholdRecords, useAddHouseholdRecord } from '../hooks/useHouseholdRecords.js';
import { useHouseholds } from '../hooks/useHouseholds.js';
import { useMeta } from '../hooks/useMeta.js';

function RecordForm({ householdId, type, label, fields, options }) {
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
      <summary>+ Add {label}</summary>
      <form onSubmit={submit}>
        {fields.map((field) => {
          const id = `${type}-${field.name}`;
          const items = options[field.optionsKey] ?? [];
          return (
            <div key={field.name}>
              <label htmlFor={id}>{field.label}</label>
              {field.optionsKey ? (
                <select id={id} name={field.name} required>
                  {items.map((item) => <option key={item} value={item}>{options.cropLabels?.[item] ?? item}</option>)}
                </select>
              ) : (
                <input id={id} name={field.name} type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined} min={field.min} required />
              )}
            </div>
          );
        })}
        <button className="btn" disabled={mutation.isPending}>Save</button>
        {error && <div className="form-error" role="alert">{error}</div>}
        {mutation.isSuccess && <small className="saved">Saved</small>}
      </form>
    </details>
  );
}

function RecordsTab({ id }) {
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
      { name: 'amount', label: 'Amount (₹)', type: 'number', min: '0' },
    ] },
    { type: 'expenses', label: 'expense', fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'category', label: 'Category', optionsKey: 'expenseCategories' },
      { name: 'amount', label: 'Amount (₹)', type: 'number', min: '0' },
    ] },
    { type: 'loans', label: 'loan', fields: [
      { name: 'lender_type', label: 'Lender', optionsKey: 'lenderTypes' },
      { name: 'principal', label: 'Principal', type: 'number', min: '0' },
      { name: 'interest_rate_pct', label: 'Interest %', type: 'number', min: '0' },
      { name: 'monthly_installment', label: 'Monthly EMI', type: 'number', min: '0' },
      { name: 'start_date', label: 'Start', type: 'date' },
      { name: 'months_remaining', label: 'Months left', type: 'number', min: '0' },
    ] },
    { type: 'crops', label: 'crop', fields: [
      { name: 'crop_name', label: 'Crop', optionsKey: 'crops' },
      { name: 'sowing_month', label: 'Sowing month (1-12)', type: 'number', min: '1' },
      { name: 'acreage', label: 'Acres', type: 'number', min: '0' },
      { name: 'irrigation_type', label: 'Irrigation', optionsKey: 'irrigationTypes' },
      { name: 'expected_yield_quintal', label: 'Yield (qtl)', type: 'number', min: '0' },
      { name: 'cost_per_acre', label: 'Cost / acre', type: 'number', min: '0' },
    ] },
  ];

  return (
    <>
      <div className="card">
        {meta.isError && <p className="form-error" role="alert">Could not load form options: {meta.error.message}</p>}
        {forms.map((form) => <RecordForm key={form.type} householdId={id} {...form} options={formOptions} />)}
      </div>
      <div className="card"><h3>Income</h3><DataTable columns={['Date', 'Source', 'Amount']} rows={(data.income ?? []).slice(-8).reverse().map((item) => ({ key: item.id, cells: [item.date, item.source_type, formatMoney(item.amount)] }))} /></div>
      <div className="card"><h3>Expenses</h3><DataTable columns={['Date', 'Category', 'Amount']} rows={(data.expenses ?? []).slice(-8).reverse().map((item) => ({ key: item.id, cells: [item.date, item.category, formatMoney(item.amount)] }))} /></div>
      <div className="card"><h3>Loans</h3><DataTable columns={['Lender', 'Principal', 'Rate', 'EMI', 'Months left']} rows={(data.loans ?? []).map((item) => ({ key: item.id, cells: [item.lender_type, formatMoney(item.principal), `${item.interest_rate_pct}%`, formatMoney(item.monthly_installment), item.months_remaining] }))} /></div>
      <div className="card"><h3>Crops</h3><DataTable columns={['Crop', 'Acres', 'Irrigation', 'Yield']} rows={(data.crops ?? []).map((item) => ({ key: item.id, cells: [formOptions.cropLabels?.[item.crop_name] ?? titleCase(item.crop_name), item.acreage, item.irrigation_type, `${item.expected_yield_quintal} qtl`] }))} /></div>
    </>
  );
}

function BudgetTab({ id }) {
  const budget = useBudget(id);
  if (budget.isPending) return <LoadingState label="Loading budget…" />;
  if (budget.isError) return <ErrorState error={budget.error} onRetry={budget.refetch} />;
  const data = budget.data;
  const items = [
    ['Avg income / mo', formatMoney(data.avgMonthlyIncome)],
    ['Avg expense / mo', formatMoney(data.avgMonthlyExpense)],
    ['Loan EMI / mo', formatMoney(data.monthlyEmi)],
    ['Net / mo', formatMoney(data.netMonthly)],
    ['Savings rate', formatPercent(data.savingsRatePct)],
    ['Debt-to-income', formatPercent(data.debtToIncomePct)],
  ];

  return <><div className="grid">{items.map(([label, value]) => <Kpi key={label} label={label} value={value} />)}</div><div className="card"><h3>Buffer status: <StatusPill value={data.bufferStatus} /></h3><CashFlowChart rows={data.monthly ?? []} /></div></>;
}

function CropRiskTab({ id }) {
  const risk = useCropRisk(id);
  const meta = useMeta();
  if (risk.isPending) return <LoadingState label="Loading crop risk…" />;
  if (risk.isError) return <ErrorState error={risk.error} onRetry={risk.refetch} />;
  const labels = meta.data?.cropLabels ?? {};

  return (
    <>
      <div className="card"><h3>Crop risk</h3><DataTable columns={['Crop', 'Acres', 'Expected margin', 'Risk', 'Why']} rows={(risk.data.assessments ?? []).map((assessment, index) => ({
        key: `${assessment.crop}-${index}`,
        cells: [labels[assessment.crop] ?? titleCase(assessment.crop), assessment.acreage, formatMoney(assessment.expectedMargin), <><StatusPill value={assessment.level} /> {assessment.riskScore}</>, (assessment.reasons ?? []).join(', ') || '—'],
      }))} /></div>
      <div className="card"><h3>Acreage concentration</h3>{(risk.data.concentration ?? []).map((crop, index) => <div key={`${crop.crop}-${index}`}>{labels[crop.crop] ?? titleCase(crop.crop)} {crop.sharePct}%<div className="bar"><i style={{ width: `${crop.sharePct}%` }} /></div></div>)}</div>
    </>
  );
}

export default function HouseholdDetailPage({ id, tab, onTabChange, onBack }) {
  const households = useHouseholds();
  if (households.isPending) return <LoadingState label="Loading household…" />;
  if (households.isError) return <ErrorState error={households.error} onRetry={households.refetch} />;
  const household = (households.data ?? []).find((item) => String(item.id) === String(id));
  if (!household) return <ErrorState error={new Error('Household not found.')} onRetry={onBack} />;

  return (
    <>
      <button className="btn g back-button" onClick={onBack} type="button">← All households</button>
      <div className="ph">
        <div className="av lg">{initials(household.head_name)}</div>
        <div><PageHeader title={household.head_name} /><div className="chips"><span className="chip">📍 {household.village}</span><span className="chip">{household.land_acres} ac</span><span className="chip">Family of {household.family_size}</span><span className="chip">{household.irrigation_type}</span></div></div>
        <div className="ph-status"><StatusPill value={household.bufferStatus} /></div>
      </div>
      <div className="tabs" role="tablist" aria-label="Household information">
        {['records', 'budget', 'risk'].map((key) => <button aria-selected={tab === key} className={`tb ${tab === key ? 'on' : ''}`} key={key} onClick={() => onTabChange(key)} role="tab" type="button">{key === 'risk' ? 'Crop risk' : titleCase(key)}</button>)}
      </div>
      {tab === 'budget' ? <BudgetTab id={id} /> : tab === 'risk' ? <CropRiskTab id={id} /> : <RecordsTab id={id} />}
    </>
  );
}
