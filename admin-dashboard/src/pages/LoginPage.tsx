import { WarningCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { temporaryPassword, temporaryUsername, validateTemporaryCredentials } from '../auth/mockAuth';
import { BrandMark } from '../components/BrandMark';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState(temporaryUsername);
  const [password, setPassword] = useState(temporaryPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    window.setTimeout(() => {
      if (!validateTemporaryCredentials(username, password)) {
        setLoading(false);
        setError('שם המשתמש או הסיסמה אינם נכונים.');
        return;
      }
      onLogin();
    }, 360);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__brand"><BrandMark /></div>
        <div className="login-card__content">
          <p className="eyebrow">ניהול מאפיית יחד</p>
          <h1 id="login-title">כניסה למערכת</h1>
          <p className="login-intro">הזינו את פרטי הכניסה כדי להמשיך לדשבורד.</p>

          <form className="login-form" onSubmit={submit} noValidate>
            <label htmlFor="admin-username">שם משתמש</label>
            <input
              id="admin-username"
              type="text"
              inputMode="numeric"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(''); }}
              autoComplete="username"
              dir="ltr"
            />

            <label htmlFor="admin-password">סיסמה</label>
            <input
              id="admin-password"
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(''); }}
              autoComplete="current-password"
              dir="ltr"
            />

            {error && <div className="login-error" role="alert"><WarningCircle size={20} weight="fill" /><span>{error}</span></div>}

            <button className="button button--primary login-submit" type="submit" disabled={!canSubmit}>
              {loading ? <><span className="spinner" /> מתחבר…</> : 'התחברות'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
