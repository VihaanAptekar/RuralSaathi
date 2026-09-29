import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { displayStatus, ErrorState, initials, LoadingState, StatusPill } from '../components/UI.jsx';
import { useCreateHousehold, useHouseholds } from '../hooks/useHouseholds.js';
import { useMeta } from '../hooks/useMeta.js';

const filters = ['All', 'At risk', 'Watch', 'Healthy'];

function HouseholdForm({ meta, createHousehold }) {
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
      <summary>+ Add household</summary>
      <form onSubmit={submit}>
        <div><label htmlFor="head_name">Head of household</label><input id="head_name" name="head_name" required /></div>
        <div><label htmlFor="village">Village</label><input id="village" name="village" required /></div>
        <div><label htmlFor="family_size">Family size</label><input id="family_size" name="family_size" type="number" min="1" step="1" required /></div>
        <div><label htmlFor="land_acres">Land (acres)</label><input id="land_acres" name="land_acres" type="number" min="0" step="any" required /></div>
        <div>
          <label htmlFor="irrigation_type">Irrigation</label>
          <select id="irrigation_type" name="irrigation_type" required>
            {(meta.irrigationTypes ?? []).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <button className="btn" disabled={createHousehold.isPending}>Save</button>
        {error && <div className="form-error" role="alert">{error}</div>}
        {createHousehold.isSuccess && <small className="saved">Saved</small>}
      </form>
    </details>
  );
}

export default function HouseholdsPage({ onOpenHousehold }) {
  const households = useHouseholds();
  const meta = useMeta();
  const createHousehold = useCreateHousehold();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const list = households.data ?? [];
  const filtered = list.filter((household) => {
    const matchesFilter = filter === 'All' || displayStatus(household.bufferStatus) === filter;
    const matchesSearch = `${household.head_name} ${household.village}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (households.isPending) return <LoadingState label="Loading households…" />;
  if (households.isError) return <ErrorState error={households.error} onRetry={households.refetch} />;

  const atRisk = list.filter((household) => displayStatus(household.bufferStatus) === 'At risk').length;
  const healthy = list.filter((household) => displayStatus(household.bufferStatus) === 'Healthy').length;

  return (
    <>
      <PageHeader title="Households" />
      <div className="banner">
        <div><div className="bt">{list.length} households in your care</div><div>{atRisk} need attention · {healthy} are healthy</div></div>
        <input aria-label="Search households" onChange={(event) => setSearch(event.target.value)} placeholder="Search name or village…" value={search} />
      </div>
      <div className="tabs" role="group" aria-label="Filter households by status">
        {filters.map((item) => <button className={`tb ${filter === item ? 'on' : ''}`} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
      </div>
      <div className="card">
        {meta.isError && <p className="form-error" role="alert">Could not load form options: {meta.error.message}</p>}
        <HouseholdForm meta={meta.data ?? {}} createHousehold={createHousehold} />
      </div>
      {filtered.length === 0
        ? <div className="card mut">No households match this search.</div>
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
              <div className="chips"><span className="chip">{household.land_acres} ac</span><span className="chip">{household.irrigation_type}</span><span className="chip">Family of {household.family_size}</span></div>
              <div className="hc-foot"><div><small className="mut">Buffer</small><br /><StatusPill value={household.bufferStatus} /></div><div className="ring" style={{ '--p': Math.max(0, Math.min(100, rate * 2.5)) }} title="Savings rate"><i>{Math.round(rate)}%</i></div></div>
            </article>
          );
        })}</div>}
    </>
  );
}
