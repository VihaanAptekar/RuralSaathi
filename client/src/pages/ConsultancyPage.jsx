import { useSimulateConsultancy, useConsultancy, useAdvisoryLogs } from '../hooks/useConsultancy.js';
import { useVillageResources } from '../hooks/useVillageResources.js';
import PageHeader from '../components/PageHeader.jsx';
import { DataTable, ErrorState, formatMoney, formatPercent, LoadingState } from '../components/UI.jsx';
import { useTranslation } from '../i18n.jsx';

function ProjectCards({ projects }) {
  const { t } = useTranslation();
  return (
    <div className="grid3">
      {projects.map((project) => {
        const projectId = project.projectId ?? project.id;
        const requiredBudget = project.raw?.required_budget ?? project.requiredBudget ?? 0;
        const annualNetBenefit = project.annualNetBenefit ?? project.annualNetGain ?? 0;
        const beneficiaries = project.raw?.expected_beneficiary_households ?? project.beneficiaries ?? 0;
        const missingSkills = (project.skillCoverages ?? []).filter((item) => item.shortfall > 0);
        const missingEquipment = (project.equipCoverages ?? []).filter((item) => item.shortfall > 0);
        return (
          <article className="hc st" key={projectId}>
            <div className="project-heading"><b>{t(project.name)}</b><span className="chip">{t('Feasibility')} {formatPercent(project.feasibilityScore)}</span></div>
            <div className="mut">{formatMoney(requiredBudget)} {t('needed')} · {project.paybackMonths ? t('pays back in {months} months', { months: project.paybackMonths }) : t('payback unavailable')}</div>
            <div className="project-checks">
              <div>{t('Budget coverage:')} {formatPercent(project.budgetCoverage)}</div>
              <div>{t('Skills coverage:')} {formatPercent(project.skillCoverage)}</div>
              <div>{t('Equipment coverage:')} {formatPercent(project.equipmentCoverage)}</div>
              {missingSkills.map((item) => <div key={item.skill}>⬜ {t('Skill needed:')} {t(item.skill)} ({item.shortfall})</div>)}
              {missingEquipment.map((item) => <div key={item.type}>⬜ {t('Equipment needed:')} {t(item.type)} ({item.shortfall})</div>)}
              {project.gaps?.map((gap, index) => <div className="mut" key={`${projectId}-gap-${index}`}>{t(gap)}</div>)}
            </div>
            <div><small className="mut">{t('Net gain per year')}</small><div className="project-gain">{formatMoney(annualNetBenefit)}</div><small className="mut">{t('{count} households benefit', { count: beneficiaries })}</small></div>
          </article>
        );
      })}
    </div>
  );
}

export default function ConsultancyPage() {
  const { t } = useTranslation();
  const projects = useConsultancy();
  const resources = useVillageResources();
  const activity = useAdvisoryLogs();
  const simulation = useSimulateConsultancy();
  if (projects.isPending || resources.isPending || activity.isPending) return <LoadingState label="Loading consultancy…" />;
  if (projects.isError) return <ErrorState error={projects.error} onRetry={projects.refetch} />;
  if (resources.isError) return <ErrorState error={resources.error} onRetry={resources.refetch} />;
  if (activity.isError) return <ErrorState error={activity.error} onRetry={activity.refetch} />;

  const village = resources.data;
  const equipment = (village.resources ?? []).filter((item) => item.resource_type?.toLowerCase() === 'equipment');
  const skills = village.skills ?? [];
  const budget = Number(village.shg_fund_available ?? 0) + Number(village.govt_scheme_budget ?? 0);

  async function submitSimulation(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const scenario = { budget: Number(values.budget) - budget, skills: {}, equipment: {} };
    for (const skill of skills) scenario.skills[skill.skill_name] = Number(values[`s_${skill.id}`]) - skill.person_count;
    for (const item of equipment) {
      const name = item.name.toLowerCase();
      const type = name.includes('tractor') ? 'tractor'
        : name.includes('thresher') ? 'thresher'
          : name.includes('pump') ? 'pump_set'
            : name.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      scenario.equipment[type] = Number(values[`e_${item.id}`]) - item.quantity_or_capacity;
    }
    simulation.mutate(scenario);
  }

  const logs = Array.isArray(activity.data) ? activity.data : [];
  const recentProjects = Array.isArray(projects.data) ? projects.data : [];

  return (
    <>
      <PageHeader title={t('Consultancy')} description={t('See which village projects are ready to launch, and test what would unlock the rest.')} />
      <div className="card"><h3>{t('Ranked projects (from saved data)')}</h3><ProjectCards projects={recentProjects} /></div>
      <div className="card">
        <h3>{t('What-if simulator')} <span className="mut simulator-note">{t('— not saved')}</span></h3>
        <form onSubmit={submitSimulation}>
          <div><label htmlFor="scenario-budget">{t('Budget (₹)')}</label><input id="scenario-budget" name="budget" type="number" min="0" defaultValue={budget} required /></div>
          {skills.map((skill) => <div key={skill.id}><label htmlFor={`s-${skill.id}`}>{skill.skill_name} ({t('People')})</label><input id={`s-${skill.id}`} name={`s_${skill.id}`} type="number" min="0" defaultValue={skill.person_count} required /></div>)}
          {equipment.map((item) => <div key={item.id}><label htmlFor={`e-${item.id}`}>{item.name} ({t('units')})</label><input id={`e-${item.id}`} name={`e_${item.id}`} type="number" min="0" defaultValue={item.quantity_or_capacity} required /></div>)}
          <button className="btn" disabled={simulation.isPending}>{simulation.isPending ? t('Simulating…') : t('Simulate')}</button>
        </form>
        {simulation.isError && <p className="form-error" role="alert">{t(simulation.error.message)}</p>}
        {simulation.data && <div className="sim-result" aria-live="polite"><ProjectCards projects={simulation.data} /></div>}
      </div>
      <div className="card">
        <h3>{t('Recent advisory activity')}</h3>
        <DataTable columns={['Feature', 'When'].map(t)} rows={logs.map((log) => ({ key: log.id, cells: [t(log.feature), log.created_at ? new Date(log.created_at).toLocaleString() : '—'] }))} />
      </div>
    </>
  );
}
