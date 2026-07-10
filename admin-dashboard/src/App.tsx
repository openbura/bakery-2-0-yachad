import { useEffect, useState } from 'react';
import { clearMockSession, createMockSession, hasMockSession } from './auth/mockAuth';
import { Toast } from './components/Toast';
import { initialProducts, initialStoreSettings } from './data/mockData';
import { loadStoreSettings, saveStoreSettings } from './data/localDashboardState';
import { AdminShell } from './layout/AdminShell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { AdminRoute, StoreSettings, ToastMessage } from './types/dashboard';

const validRoutes: AdminRoute[] = ['/', '/login', '/products', '/settings'];

function getCurrentRoute(): AdminRoute {
  return validRoutes.includes(window.location.pathname as AdminRoute) ? window.location.pathname as AdminRoute : '/';
}

export default function App() {
  const [route, setRoute] = useState<AdminRoute>(getCurrentRoute);
  const [authenticated, setAuthenticated] = useState(hasMockSession);
  const [products, setProducts] = useState(initialProducts);
  const [settings, setSettings] = useState(() => loadStoreSettings(initialStoreSettings));
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const titles: Record<AdminRoute, string> = {
      '/': 'דשבורד | מאפיית יחד',
      '/login': 'כניסה | מאפיית יחד',
      '/products': 'מוצרים | מאפיית יחד',
      '/settings': 'הגדרות | מאפיית יחד',
    };
    document.title = !authenticated ? titles['/login'] : titles[route];
  }, [authenticated, route]);

  const navigate = (nextRoute: AdminRoute, replace = false) => {
    if (replace) window.history.replaceState({}, '', nextRoute);
    else window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const showToast = (text: string, tone: ToastMessage['tone'] = 'success') => setToast({ id: Date.now(), text, tone });

  const login = () => {
    createMockSession();
    setAuthenticated(true);
    navigate('/', true);
  };

  const logout = () => {
    clearMockSession();
    setAuthenticated(false);
    navigate('/login', true);
  };

  const patchSettings = (patch: Partial<StoreSettings>, confirmation: string) => {
    setSettings((current) => {
      const nextSettings = { ...current, ...patch, updatedAt: 'עכשיו' };
      saveStoreSettings(nextSettings);
      return nextSettings;
    });
    showToast(confirmation);
  };

  if (!authenticated || route === '/login') {
    return <LoginPage onLogin={login} />;
  }

  const page = route === '/products' ? (
    <ProductsPage
      products={products}
      onToggleAvailability={(productId) => {
        setProducts((current) => current.map((product) => product.id === productId ? { ...product, available: !product.available, updatedAt: 'עכשיו' } : product));
        showToast('הזמינות עודכנה');
      }}
      onUpdatePrice={(productId, price) => {
        setProducts((current) => current.map((product) => product.id === productId ? { ...product, price, updatedAt: 'עכשיו' } : product));
        showToast('המחיר נשמר');
      }}
    />
  ) : route === '/settings' ? (
    <SettingsPage settings={settings} onSave={(nextSettings) => { saveStoreSettings(nextSettings); setSettings(nextSettings); showToast('השינוי נשמר'); }} />
  ) : (
    <OverviewPage
      settings={settings}
      products={products}
      onToggleOrdering={() => patchSettings({ orderingEnabled: !settings.orderingEnabled }, settings.orderingEnabled ? 'ההזמנות נסגרו' : 'ההזמנות נפתחו')}
      onToggleDelivery={() => patchSettings({ deliveryEnabled: !settings.deliveryEnabled }, settings.deliveryEnabled ? 'המשלוחים הושהו' : 'המשלוחים הופעלו')}
      onTogglePickup={() => patchSettings({ pickupEnabled: !settings.pickupEnabled }, settings.pickupEnabled ? 'האיסוף הושהה' : 'האיסוף הופעל')}
      onToggleNotice={() => patchSettings({ noticeActive: !settings.noticeActive }, settings.noticeActive ? 'ההודעה הוסרה' : 'ההודעה הופעלה')}
      onEditNotice={() => navigate('/settings')}
    />
  );

  return (
    <>
      <AdminShell route={route} onNavigate={navigate} onLogout={logout}>{page}</AdminShell>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
