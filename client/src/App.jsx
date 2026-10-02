import { useState } from 'react';
import AppShell from './components/AppShell.jsx';
import ConsultancyPage from './pages/ConsultancyPage.jsx';
import HouseholdDetailPage from './pages/HouseholdDetailPage.jsx';
import HouseholdsPage from './pages/HouseholdsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import VillageDashboardPage from './pages/VillageDashboardPage.jsx';
import VillageResourcesPage from './pages/VillageResourcesPage.jsx';
import { useTranslation } from './i18n.jsx';

export default function App() {
  const { language, setLanguage } = useTranslation();
  const [page, setPage] = useState('home');
  const [householdId, setHouseholdId] = useState(null);
  const [detailTab, setDetailTab] = useState('records');

  function navigate(nextPage) {
    setPage(nextPage);
  }

  function openHousehold(id) {
    setHouseholdId(id);
    setDetailTab('records');
    setPage('hp');
  }

  let content;
  if (page === 'home') {
    content = <HomePage onNavigate={navigate} />;
  } else if (page === 'hp') {
    content = (
      <HouseholdDetailPage
        id={householdId}
        tab={detailTab}
        onTabChange={setDetailTab}
        onBack={() => setPage('hh')}
        onOpenHousehold={openHousehold}
      />
    );
  } else if (page === 'vd') {
    content = <VillageDashboardPage onOpenHousehold={openHousehold} />;
  } else if (page === 'vr') {
    content = <VillageResourcesPage />;
  } else if (page === 'co') {
    content = <ConsultancyPage />;
  } else {
    content = <HouseholdsPage onOpenHousehold={openHousehold} />;
  }

  return <AppShell page={page} onNavigate={navigate} language={language} onLanguageChange={setLanguage}>{content}</AppShell>;
}
