import PageHeader from '../components/PageHeader.jsx';
import { DataTable, ErrorState, formatMoney, LoadingState } from '../components/UI.jsx';
import { Kpi } from '../components/UI.jsx';
import { useUpdateVillageResource, useUpdateVillageSkill, useVillageResources } from '../hooks/useVillageResources.js';

export default function VillageResourcesPage() {
  const resourcesQuery = useVillageResources();
  const updateResource = useUpdateVillageResource();
  const updateSkill = useUpdateVillageSkill();
  if (resourcesQuery.isPending) return <LoadingState label="Loading village resources…" />;
  if (resourcesQuery.isError) return <ErrorState error={resourcesQuery.error} onRetry={resourcesQuery.refetch} />;

  const data = resourcesQuery.data;
  async function saveResource(id, changes) {
    try {
      await updateResource.mutateAsync({ id, changes });
    } catch {
      return;
    }
  }
  async function saveSkill(id, personCount) {
    try {
      await updateSkill.mutateAsync({ id, changes: { person_count: Number(personCount) } });
    } catch {
      return;
    }
  }

  return (
    <>
      <PageHeader title="Village resources" description="Shared equipment, skills and funds. Edits save automatically." />
      <div className="grid">
        <Kpi label="SHG fund" value={formatMoney(data.shg_fund_available)} />
        <Kpi label="Govt scheme budget" value={formatMoney(data.govt_scheme_budget)} />
      </div>
      <div className="card">
        <h3>Resources</h3>
        <DataTable columns={['Name', 'Qty / capacity', 'Condition']} rows={(data.resources ?? []).map((resource) => ({
          key: resource.id,
          cells: [
            resource.name,
            <input aria-label={`${resource.name} quantity or capacity`} defaultValue={resource.quantity_or_capacity} min="0" onBlur={(event) => saveResource(resource.id, { quantity_or_capacity: Number(event.target.value) })} type="number" />,
            <select aria-label={`${resource.name} condition`} defaultValue={resource.condition} onChange={(event) => saveResource(resource.id, { condition: event.target.value })}>
              {['good', 'fair', 'poor', 'n/a'].map((condition) => <option key={condition} value={condition}>{condition}</option>)}
            </select>,
          ],
        }))} />
      </div>
      <div className="card">
        <h3>Skills (people)</h3>
        <DataTable columns={['Skill', 'People']} rows={(data.skills ?? []).map((skill) => ({
          key: skill.id,
          cells: [skill.skill_name, <input aria-label={`${skill.skill_name} people count`} defaultValue={skill.person_count} min="0" onBlur={(event) => saveSkill(skill.id, event.target.value)} type="number" />],
        }))} />
      </div>
      {(updateResource.isSuccess || updateSkill.isSuccess) && <small className="saved" role="status">Saved</small>}
      {(updateResource.isError || updateSkill.isError) && <p className="form-error" role="alert">{(updateResource.error ?? updateSkill.error).message}</p>}
    </>
  );
}
