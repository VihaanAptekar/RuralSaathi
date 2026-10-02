import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { ErrorState, initials, LoadingState, StatusPill } from '../components/UI.jsx';
import { useCreateHousehold, useHouseholds } from '../hooks/useHouseholds.js';
import { useMeta } from '../hooks/useMeta.js';
import { useTranslation } from '../i18n.jsx';

const filters = ['All', 'At risk', 'Healthy'];

function householdCategory(bufferStatus) {
  const status = String(bufferStatus).toUpperCase();
  if (status === 'SAFE' || status === 'HEALTHY') return 'Healthy';
  if (status === 'AT_RISK' || status === 'CRITICAL' || status === 'AT RISK') return 'At risk';
  return '';
}

function HouseholdForm({ meta, createHousehold }) {
  const { t } = useTranslation();
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.family_size = Number(values.family_size);
    values.land_acres = Number(values.land_acres);
    setError('');
    try {
      await createHousehold.mutateAsync(values);
      form.reset();
    } catch (cause) {
      setError(cause.message);
    }
  }

  return (
    <details>
      <summary>+ {t('Add household')}</summary>
      <form onSubmit={submit}>
        <div><label htmlFor="head_name">{t('Head of household')}</label><input id="head_name" name="head_name" required /></div>
        <div><label htmlFor="village">{t('Village')}</label><input id="village" name="village" required /></div>
        <div><label htmlFor="family_size">{t('Family size')}</label><input id="family_size" name="family_size" type="number" min="1" step="1" required /></div>
        <div><label htmlFor="land_acres">{t('Land (acres)')}</label><input id="land_acres" name="land_acres" type="number" min="0" step="any" required /></div>
        <div>
          <label htmlFor="irrigation_type">{t('Irrigation')}</label>
          <select id="irrigation_type" name="irrigation_type" required>
            {(meta.irrigationTypes ?? []).map((type) => <option key={type} value={type}>{t(type)}</option>)}
          </select>
        </div>
        <button className="btn" disabled={createHousehold.isPending}>{t('Save')}</button>
        {error && <div className="form-error" role="alert">{t(error)}</div>}
        {createHousehold.isSuccess && <small className="saved">{t('Saved')}</small>}
      </form>
    </details>
  );
}

export default function HouseholdsPage({ onOpenHousehold }) {
  const { t } = useTranslation();
  const households = useHouseholds();
  const meta = useMeta();
  const createHousehold = useCreateHousehold();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const list = households.data ?? [];
  const filtered = list.filter((household) => {
    const matchesFilter = filter === 'All' || householdCategory(household.bufferStatus) === filter;
    const matchesSearch = `${household.head_name} ${household.village}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (households.isPending) return <LoadingState label="Loading households…" />;
  if (households.isError) return <ErrorState error={households.error} onRetry={households.refetch} />;

  const atRisk = list.filter((household) => householdCategory(household.bufferStatus) === 'At risk').length;
  const healthy = list.filter((household) => householdCategory(household.bufferStatus) === 'Healthy').length;

  return (
    <>
      <PageHeader title={t('Households')} />
      <div className="banner">
        <div><div className="bt">{t('{count} households in your care', { count: list.length })}</div><div>{t('{count} need attention · {healthy} are healthy', { count: atRisk, healthy })}</div></div>
        <input aria-label={t('Search households')} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search name or village…')} value={search} />
      </div>
      <div className="tabs" role="group" aria-label={t('Filter households by status')}>
        {filters.map((item) => <button className={`tb ${filter === item ? 'on' : ''}`} key={item} onClick={() => setFilter(item)} type="button">{t(item)}</button>)}
      </div>
      {filter === 'All' && (
        <div className="card">
          {meta.isError && <p className="form-error" role="alert">{t('Could not load form options: {error}', { error: t(meta.error.message) })}</p>}
          <HouseholdForm meta={meta.data ?? {}} createHousehold={createHousehold} />
        </div>
      )}
      {filtered.length === 0
        ? <div className="card mut">{t('No households match this search.')}</div>
        : <div className="grid3">{filtered.map((household) => {
          const rate = Number(household.savingsRatePct ?? 0);
          return (
            <article
              className="hc"
              key={household.id}
              onClick={() => onOpenHousehold(household.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenHousehold(household.id); }}
              role="button"
              tabIndex={0}
            >
              <div className="hc-top"><div className="av">{initials(household.head_name)}</div><div><b>{household.head_name}</b><small>📍 {household.village}</small></div></div>
              <div className="chips"><span className="chip">{household.land_acres} {t('Acres')}</span><span className="chip">{t(household.irrigation_type)}</span><span className="chip">{t('Family of {count}', { count: household.family_size })}</span></div>
              <div className="hc-foot"><div><small className="mut">{t('Buffer')}</small><br /><StatusPill value={household.bufferStatus} /></div><div className="ring" style={{ '--p': Math.max(0, Math.min(100, rate * 2.5)) }} title={t('Savings rate')}><i>{Math.round(rate)}%</i></div></div>
            </article>
          );
        })}</div>}
    </>
  );
}
