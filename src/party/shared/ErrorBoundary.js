import React from 'react';
import { removeKey, writeJson } from '../lib/storage';

const RECOVER_KEY = 'hb-recover';
const RELOAD_AFTER_MS = 3500;

// Reloads at most 3 times in 2 minutes, so a broken state can't loop forever.
const mayReload = () => {
  try {
    const now = Date.now();
    const recent = JSON.parse(sessionStorage.getItem(RECOVER_KEY) || '[]').filter((t) => now - t < 120000);
    if (recent.length >= 3) return false;
    sessionStorage.setItem(RECOVER_KEY, JSON.stringify([...recent, now]));
    return true;
  } catch (e) {
    return true;
  }
};

// If a screen ever throws, show a friendly card and reload: the TV continues
// the saved game from the same point and phones rejoin by themselves.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stuck: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    writeJson('hb-last-error', {
      at: new Date().toISOString(),
      message: String((error && error.message) || error),
      stack: String((error && error.stack) || '').slice(0, 2000),
      component: String((info && info.componentStack) || '').slice(0, 1500),
      url: window.location.href,
    });
    if (mayReload()) this.timer = setTimeout(() => window.location.reload(), RELOAD_AFTER_MS);
    else this.setState({ stuck: true });
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    const { error, stuck } = this.state;
    const { children, variant = 'tv', resetKey } = this.props;
    if (!error) return children;
    return (
      <div className={variant === 'tv' ? 'hb-tv hb-tv-center' : 'hb-phone hb-phone-center'}>
        <div className="hb-crash-card">
          <div className="hb-crash-icon">🙈</div>
          <h1>אופס! משהו השתבש</h1>
          {stuck ? (
            <>
              <p>{variant === 'tv' ? 'המשחק שמור - אפשר לנסות שוב מאותה נקודה, או להתחיל משחק חדש.' : 'נסו לרענן את הדף.'}</p>
              <div className="hb-crash-actions">
                <button type="button" className="hb-btn hb-btn-primary" onClick={() => window.location.reload()}>
                  🔄 לנסות שוב
                </button>
                {variant === 'tv' && resetKey && (
                  <button
                    type="button"
                    className="hb-btn hb-btn-soft"
                    onClick={() => {
                      removeKey(resetKey);
                      window.location.reload();
                    }}
                  >
                    🆕 משחק חדש
                  </button>
                )}
              </div>
            </>
          ) : (
            <p>{variant === 'tv' ? 'חוזרים למשחק מאותה נקודה...' : 'חוזרים למשחק...'}</p>
          )}
          <p className="hb-crash-error">{String((error && error.message) || error).slice(0, 160)}</p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
