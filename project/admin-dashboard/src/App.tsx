import { confirmNavigation } from './hooks/useUnsavedChanges';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BakeryConfigurationError, getBakeryEnvironment } from './config/bakeryEnvironment';
import { Toast } from './components/Toast';
import { WorkspaceState } from './components/WorkspaceState';
import { AdminShell } from './layout/AdminShell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { SettingsPage } from './pages/SettingsPage';
import { getLoginPrefill, restoreAuthorizedSession, signInSharedAdmin, signOutAdmin, subscribeToAuthChanges } from './services/authService';
import { fetchDashboardData, type DashboardData } from './services/dashboardRepository';
import { updateProductAvailability, updateProductPrice } from './services/productsRepository';
import { ownerMessage } from './services/serviceErrors';
import { updateStoreSettings, type StoreSettingsPatch } from './services/storeSettingsRepository';
import type { AdminProfile, AdminRoute, ToastMessage } from './types/dashboard';

const validRoutes: AdminRoute[] = ['/', '/login', '/products', '/settings'];

function getCurrentRoute(): AdminRoute {
  return validRoutes.includes(window.location.pathname as AdminRoute) ? window.location.pathname as AdminRoute : '/';
}

type AuthStatus = 'restoring' | 'signedOut' | 'authorized' | 'error';
type DataStatus = 'idle' | 'loading' | 'ready' | 'error';
type SavingControl = 'ordering' | 'delivery' | 'pickup' | 'notice' | null;

export default function App() {
  const navigationIndex = useRef<number>(window.history.state?.bakeryIndex ?? 0);
  const undoingNavigation = useRef(false);
  useEffect(() => { window.history.replaceState({ ...window.history.state, bakeryIndex: navigationIndex.current }, '', window.location.href); }, []);
  const [route, setRoute] = useState<AdminRoute>(getCurrentRoute);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('restoring');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [authError, setAuthError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus>('idle');
  const [dataError, setDataError] = useState('');
  const [savingControl, setSavingControl] = useState<SavingControl>(null);
  const productSaves = useRef(new Set<string>());
  const settingsSave = useRef(false);
  const [savingProductIds, setSavingProductIds] = useState<ReadonlySet<string>>(new Set());
  const beginProductSave = (id: string) => {
    if (productSaves.current.has(id)) throw new Error('שמירה של מוצר זה עדיין מתבצעת. נסו שוב לאחר סיומה.');
    productSaves.current.add(id);
    setSavingProductIds(new Set(productSaves.current));
  };
  const endProductSave = (id: string) => {
    productSaves.current.delete(id);
    setSavingProductIds(new Set(productSaves.current));
  };
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const navigate = useCallback((nextRoute: AdminRoute, replace = false) => {
    if (!replace && nextRoute === window.location.pathname) return;
    if (!replace && !confirmNavigation()) return;
    if (!replace) navigationIndex.current += 1;
    if (replace) window.history.replaceState({ bakeryIndex: navigationIndex.current }, '', nextRoute);
    else window.history.pushState({ bakeryIndex: navigationIndex.current }, '', nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  const refreshDashboard = useCallback(async () => {
    setDataStatus('loading');
    setDataError('');
    try {
      const nextData = await fetchDashboardData();
      setDashboardData(nextData);
      setDataStatus('ready');
    } catch (error) {
      setDataError(ownerMessage(error, 'לא הצלחנו לטעון את נתוני המאפייה.'));
      setDataStatus('error');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: () => void = () => undefined;

    const initialize = async () => {
      try {
        getBakeryEnvironment();
        unsubscribe = subscribeToAuthChanges((event) => {
          if (!mounted || event !== 'SIGNED_OUT') return;
          setProfile(null);
          setDashboardData(null);
          setDataStatus('idle');
          setAuthStatus('signedOut');
          navigate('/login', true);
        });

        const restoredProfile = await restoreAuthorizedSession();
        if (!mounted) return;
        if (!restoredProfile) {
          if (window.location.pathname !== '/login') {
            window.history.replaceState({ bakeryIndex: navigationIndex.current }, '', '/login');
            setRoute('/login');
          }
          setAuthStatus('signedOut');
          return;
        }
        setProfile(restoredProfile);
        setAuthStatus('authorized');
        if (window.location.pathname === '/login') {
          window.history.replaceState({ bakeryIndex: navigationIndex.current }, '', '/');
          setRoute('/');
        }
        void refreshDashboard();
      } catch (error) {
        if (!mounted) return;
        setAuthError(ownerMessage(error, error instanceof BakeryConfigurationError ? error.message : 'לא הצלחנו לשחזר את החיבור.'));
        setAuthStatus('error');
      }
    };

    void initialize();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate, refreshDashboard]);

  useEffect(() => {
    const handlePopState = () => {
      if (undoingNavigation.current) { undoingNavigation.current = false; return; }
      const nextIndex = window.history.state?.bakeryIndex ?? navigationIndex.current - 1;
      if (!confirmNavigation()) {
        undoingNavigation.current = true;
        window.history.go(navigationIndex.current - nextIndex);
        return;
      }
      navigationIndex.current = nextIndex;
      const nextRoute = getCurrentRoute();
      if (authStatus !== 'authorized' && nextRoute !== '/login') {
        window.history.replaceState({ bakeryIndex: navigationIndex.current }, '', '/login');
        setRoute('/login');
        return;
      }
      if (authStatus === 'authorized' && nextRoute === '/login') {
        window.history.replaceState({ bakeryIndex: navigationIndex.current }, '', '/');
        setRoute('/');
        return;
      }
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authStatus]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const titles: Record<AdminRoute, string> = {
      '/': 'דשבורד | מאפיית יחד',
      '/login': 'כניסה | מאפיית יחד',
      '/products': 'מוצרים | מאפיית יחד',
      '/settings': 'הגדרות | מאפיית יחד',
    };
    document.title = authStatus === 'authorized' ? titles[route === '/login' ? '/' : route] : titles['/login'];
  }, [authStatus, route]);

  const login = async (username: string, password: string) => {
    const authorizedProfile = await signInSharedAdmin(username, password);
    setProfile(authorizedProfile);
    setDashboardData(null);
    setDataStatus('idle');
    setAuthStatus('authorized');
    navigate('/', true);
    await refreshDashboard();
  };

  const logout = async () => {
    if (!confirmNavigation()) return;
    try {
      await signOutAdmin();
    } catch (error) {
      showToast(ownerMessage(error, 'לא הצלחנו להתנתק.'), 'error');
    }
  };

  const replaceProduct = (productId: string, updater: DashboardData['products'][number]) => {
    setDashboardData((current) => current ? {
      ...current,
      products: current.products.map((product) => product.id === productId ? updater : product),
    } : current);
  };

  const toggleAvailability = async (productId: string) => {
    if (!dashboardData || productSaves.current.has(productId)) {
      showToast('המוצר עדיין נשמר. נסו שוב לאחר סיום השמירה.', 'error');
      return;
    }
    const product = dashboardData.products.find((item) => item.id === productId);
    if (!product) return;
    beginProductSave(productId);
    try {
      const verified = await updateProductAvailability(productId, !product.available, dashboardData.categories);
      replaceProduct(productId, verified);
      showToast(verified.available ? 'המוצר חזר למלאי' : 'המוצר סומן כאזל להיום');
    } catch (error) {
      showToast(ownerMessage(error, 'הזמינות לא נשמרה.'), 'error');
    } finally {
      endProductSave(productId);
    }
  };

  const savePrice = async (productId: string, price: number) => {
    if (!dashboardData) throw new Error('נתוני המוצרים אינם זמינים כרגע.');
    beginProductSave(productId);
    try {
      const verified = await updateProductPrice(productId, price, dashboardData.categories);
      replaceProduct(productId, verified);
      showToast('המחיר נשמר ואומת');
    } catch (error) {
      showToast(ownerMessage(error, 'המחיר לא נשמר.'), 'error');
      throw error;
    } finally {
      endProductSave(productId);
    }
  };

  const saveSettingsPatch = async (control: Exclude<SavingControl, null>, patch: StoreSettingsPatch, confirmation: string) => {
    if (!dashboardData || settingsSave.current) throw new Error('שמירת הגדרות עדיין מתבצעת. נסו שוב לאחר סיומה.');
    settingsSave.current = true;
    setSavingControl(control);
    try {
      const verified = await updateStoreSettings(patch);
      setDashboardData((current) => current ? { ...current, settings: verified } : current);
      showToast(confirmation);
      return verified;
    } catch (error) {
      showToast(ownerMessage(error, 'השינוי לא נשמר.'), 'error');
      throw error;
    } finally {
      settingsSave.current = false;
      setSavingControl(null);
    }
  };

  const saveAllSettings = async (patch: StoreSettingsPatch) => {
    return saveSettingsPatch('notice', patch, 'הגדרות החנות נשמרו ואומתו');
  };

  if (authStatus === 'restoring') {
    return <WorkspaceState standalone title="בודקים את החיבור" message="משחזרים את חיבור הניהול המאובטח…" />;
  }

  if (authStatus === 'error') {
    return <WorkspaceState standalone tone="error" title="לא ניתן לפתוח את הדשבורד" message={authError} onRetry={() => window.location.reload()} />;
  }

  if (authStatus === 'signedOut' || !profile) {
    const prefill = getLoginPrefill();
    return <LoginPage initialUsername={prefill.username} initialPassword={prefill.password} onLogin={login} />;
  }

  const protectedRoute = route === '/login' ? '/' : route;
  let page;
  if (dataStatus === 'loading' || dataStatus === 'idle') {
    page = <WorkspaceState title="טוענים את נתוני המאפייה" message="המוצרים והגדרות החנות נטענים מהמסד…" />;
  } else if (dataStatus === 'error' || !dashboardData) {
    page = <WorkspaceState tone="error" title="הנתונים לא נטענו" message={dataError} onRetry={() => void refreshDashboard()} />;
  } else if (protectedRoute === '/products') {
    page = <ProductsPage products={dashboardData.products} categories={dashboardData.categories} savingProductIds={savingProductIds} onToggleAvailability={toggleAvailability} onUpdatePrice={savePrice} />;
  } else if (protectedRoute === '/settings') {
    page = <SettingsPage settings={dashboardData.settings} onSave={saveAllSettings} />;
  } else {
    const settings = dashboardData.settings;
    page = <OverviewPage
      settings={settings}
      products={dashboardData.products}
      savingControl={savingControl}
      onToggleOrdering={() => void saveSettingsPatch('ordering', { orderingEnabled: !settings.orderingEnabled }, settings.orderingEnabled ? 'ההזמנות נסגרו' : 'ההזמנות נפתחו').catch(() => undefined)}
      onToggleDelivery={() => void saveSettingsPatch('delivery', { deliveryEnabled: !settings.deliveryEnabled }, settings.deliveryEnabled ? 'המשלוחים הושהו' : 'המשלוחים הופעלו').catch(() => undefined)}
      onTogglePickup={() => void saveSettingsPatch('pickup', { pickupEnabled: !settings.pickupEnabled }, settings.pickupEnabled ? 'האיסוף הושהה' : 'האיסוף הופעל').catch(() => undefined)}
      onToggleNotice={() => {
        if (!settings.noticeActive && settings.noticeText.trim().length < 5) {
          showToast('כתבו הודעה ברורה לפני ההפעלה', 'info');
          navigate('/settings');
          return;
        }
        void saveSettingsPatch('notice', { noticeActive: !settings.noticeActive }, settings.noticeActive ? 'ההודעה הוסרה' : 'ההודעה הופעלה').catch(() => undefined);
      }}
      onEditNotice={() => navigate('/settings')}
    />;
  }

  return <>
    <AdminShell route={protectedRoute} onNavigate={navigate} onLogout={() => void logout()} profile={profile}>{page}</AdminShell>
    <Toast toast={toast} onDismiss={() => setToast(null)} />
  </>;
}
