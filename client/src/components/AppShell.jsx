import { useTranslation } from '../i18n.jsx';

const navigation = [
  ['home', '⌂', 'Home'],
  ['hh', '🏡', 'Households'],
  ['vd', '📊', 'Village'],
  ['vr', '🧰', 'Resources'],
  ['co', '💡', 'Consultancy'],
];

export default function AppShell({ page, onNavigate, language, onLanguageChange, children }) {
  const { t } = useTranslation();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span aria-hidden="true">🌾</span><div>RuralSaathi<small>{t('Village finance companion')}</small></div></div>
        <nav aria-label={t('Main navigation')}>
          {navigation.map(([key, icon, label]) => (
            <button
              className={`nb ${page === key || (page === 'hp' && key === 'hh') ? 'on' : ''}`}
              key={key}
              onClick={() => onNavigate(key)}
              type="button"
            >
              <span aria-hidden="true">{icon}</span>{t(label)}
            </button>
          ))}
        </nav>
        <label className="language-control">
          <span>{t('Language')}</span>
          <select aria-label={t('Language')} onChange={(event) => onLanguageChange(event.target.value)} value={language}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
          </select>
        </label>
      </aside>
      <main className="rise">{children}</main>
    </div>
  );
}
