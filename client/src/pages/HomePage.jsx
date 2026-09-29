const destinations = [
  ['hh', '🏡', 'Households', 'Review household records and financial status.'],
  ['vd', '📊', 'Village dashboard', 'View village income, savings, and cash flow.'],
  ['vr', '🧰', 'Resources', 'Manage shared resources and village skills.'],
  ['co', '💡', 'Consultancy', 'Review projects and run what-if scenarios.'],
];

export default function HomePage({ onNavigate }) {
  return (
    <>
      <section className="home-welcome">
        <div className="home-mark" aria-hidden="true">🌾</div>
        <div>
          <p className="home-eyebrow">Village finance companion</p>
          <h1>RuralSaathi</h1>
          <p>Household finances, crop risk, and village planning in one place.</p>
        </div>
        <button className="btn home-dashboard" onClick={() => onNavigate('vd')} type="button">
          <span aria-hidden="true">📊</span> Open village dashboard
        </button>
      </section>
      <section className="home-menu" aria-labelledby="home-menu-title">
        <div className="home-menu-heading">
          <h2 id="home-menu-title">Your workspace</h2>
          <p className="sub">Choose an area to continue.</p>
        </div>
        <div className="grid3">
          {destinations.map(([page, icon, title, description]) => (
            <button className="home-link" key={page} onClick={() => onNavigate(page)} type="button">
              <span className="home-link-icon" aria-hidden="true">{icon}</span>
              <span className="home-link-copy"><strong>{title}</strong><small>{description}</small></span>
              <span className="home-link-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
