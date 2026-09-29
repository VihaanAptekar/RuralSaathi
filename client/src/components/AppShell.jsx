const navigation = [
  ['home', '⌂', 'Home'],
  ['hh', '🏡', 'Households'],
  ['vd', '📊', 'Village'],
  ['vr', '🧰', 'Resources'],
  ['co', '💡', 'Consultancy'],
];

export default function AppShell({ page, onNavigate, children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span aria-hidden="true">🌾</span><div>RuralSaathi<small>Village finance companion</small></div></div>
        <nav aria-label="Main navigation">
          {navigation.map(([key, icon, label]) => (
            <button
              className={`nb ${page === key || (page === 'hp' && key === 'hh') ? 'on' : ''}`}
              key={key}
              onClick={() => onNavigate(key)}
              type="button"
            >
              <span aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="rise">{children}</main>
    </div>
  );
}
