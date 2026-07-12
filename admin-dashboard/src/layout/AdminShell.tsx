import {
  GearSix,
  Package,
  SignOut,
  SquaresFour,
  UserCircle,
  X,
} from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { BrandMark } from '../components/BrandMark';
import type { AdminProfile, AdminRoute } from '../types/dashboard';

type AdminShellProps = {
  route: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
  profile: AdminProfile;
  children: ReactNode;
};

const navItems: Array<{ route: AdminRoute; label: string; icon: typeof SquaresFour }> = [
  { route: '/', label: 'דשבורד', icon: SquaresFour },
  { route: '/products', label: 'מוצרים', icon: Package },
  { route: '/settings', label: 'הגדרות', icon: GearSix },
];

export function AdminShell({ route, onNavigate, onLogout, profile, children }: AdminShellProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const roleLabel = profile.role === 'owner' ? 'בעלים' : 'מנהל';
  const avatarLetter = profile.displayName.trim().charAt(0) || 'י';

  return (
    <div className="admin-shell">
      <aside className="sidebar" aria-label="ניווט ראשי">
        <BrandMark />
        <div className="sidebar__section-label">ניהול שוטף</div>
        <nav className="sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.route} className={route === item.route ? 'is-active' : ''} type="button" onClick={() => onNavigate(item.route)}>
                <Icon size={21} weight={route === item.route ? 'fill' : 'regular'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar__profile">
          <div>
            <span className="avatar">{avatarLetter}</span>
            <span><strong>{profile.displayName}</strong><small>{roleLabel} · מחובר למסד המאפייה</small></span>
          </div>
          <button type="button" onClick={onLogout}><SignOut size={20} /><span>יציאה</span></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="mobile-header">
          <BrandMark compact />
          <button className="profile-trigger" type="button" onClick={() => setProfileOpen((current) => !current)} aria-expanded={profileOpen} aria-label="פתיחת תפריט משתמש">
            {profileOpen ? <X size={22} /> : <UserCircle size={25} weight="duotone" />}
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <strong>{profile.displayName}</strong>
              <small>{roleLabel} · מחובר למסד המאפייה</small>
              <button type="button" onClick={onLogout}><SignOut size={19} /> יציאה</button>
            </div>
          )}
        </header>

        <main className="page-content">{children}</main>

        <nav className="mobile-nav" aria-label="ניווט נייד">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.route} className={route === item.route ? 'is-active' : ''} type="button" onClick={() => onNavigate(item.route)}>
                <Icon size={22} weight={route === item.route ? 'fill' : 'regular'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
