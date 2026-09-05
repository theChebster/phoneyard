import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

// Owner/admin sessions "lock" after this long and drop back to their
// login screen (Guard's !user branch already routes to the correct
// /owner/login or /admin/login, never the public homepage).
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const SESSION_STARTED_KEY = 'py_session_started_at';

function stampSessionStart() {
  localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString());
}

function clearSessionStamp() {
  localStorage.removeItem(SESSION_STARTED_KEY);
}

// True once more than an hour has passed since sign-in. If no stamp is
// found at all (e.g. a session that predates this feature), start the
// clock now rather than force a surprise logout on the next check.
function isSessionExpired() {
  const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY));
  if (!startedAt) {
    stampSessionStart();
    return false;
  }
  return Date.now() - startedAt > SESSION_TIMEOUT_MS;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const lockTimer = useRef(null);

  function scheduleAutoLock() {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY)) || Date.now();
    const remaining = Math.max(SESSION_TIMEOUT_MS - (Date.now() - startedAt), 0);
    // If the hour runs out while the tab is still open, sign out
    // immediately instead of waiting for the next refresh.
    lockTimer.current = setTimeout(() => supabase.auth.signOut(), remaining);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;

      if (sessionUser && isSessionExpired()) {
        clearSessionStamp();
        await supabase.auth.signOut();
        if (!active) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(sessionUser);
      if (sessionUser) {
        await loadProfile(sessionUser.id);
        scheduleAutoLock();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
        scheduleAutoLock();
      } else {
        setProfile(null);
        clearSessionStamp();
        if (lockTimer.current) clearTimeout(lockTimer.current);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, []);

  async function loadProfile(id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    setProfile(data || null);
  }

  const signIn = async (email, password) => {
    const r = await supabase.auth.signInWithPassword({ email, password });
    if (!r.error && r.data?.session) stampSessionStart();
    return r;
  };

  const signUp = async (email, password, metadata) => {
    const r = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (!r.error && r.data?.session) stampSessionStart();
    return r;
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile: () => user && loadProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);