import { supabase } from './supabase.js';

export async function checkSession() {
  // Exchange auth code if redirected via PKCE flow
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          return data.session;
        }
      } catch (e) {
        console.warn('PKCE exchangeCodeForSession error:', e);
      }
    }
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error('Session error:', error);
  return session;
}

export async function signInWithOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });
  if (error) throw error;
}

export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('SignOut error:', err);
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  } catch (e) {}
}
