import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SpeisekartePage from '@/pages/SpeisekartePage';
import BestellrundePage from '@/pages/BestellrundePage';
import BestellpositionPage from '@/pages/BestellpositionPage';
import PublicFormSpeisekarte from '@/pages/public/PublicForm_Speisekarte';
import PublicFormBestellrunde from '@/pages/public/PublicForm_Bestellrunde';
import PublicFormBestellposition from '@/pages/public/PublicForm_Bestellposition';
// <public:imports>
// </public:imports>
// <custom:imports>
const BestellungAufgebenPage = lazy(() => import('@/pages/intents/BestellungAufgebenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69e7785a5f873fbe904233a4" element={<PublicFormSpeisekarte />} />
              <Route path="public/69e778603a19b181a0ef8872" element={<PublicFormBestellrunde />} />
              <Route path="public/69e778613af3af4f8fbc0827" element={<PublicFormBestellposition />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="speisekarte" element={<SpeisekartePage />} />
                <Route path="bestellrunde" element={<BestellrundePage />} />
                <Route path="bestellposition" element={<BestellpositionPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/bestellung-aufgeben" element={<Suspense fallback={null}><BestellungAufgebenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
