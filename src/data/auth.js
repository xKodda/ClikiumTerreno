import { supabase } from './supabase.js';

export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error('Session error:', error);
  return session;
}

export async function signInWithOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}
