/*
 * Supabase adapter for the static Japan Trip 2026 page.
 *
 * Configure before this module loads:
 *   window.SUPABASE_URL = 'https://your-project.supabase.co';
 *   window.SUPABASE_ANON_KEY = 'your-anon-key';
 *
 * This module intentionally requires Supabase Auth. Never put a service-role
 * key in this repository or in browser code.
 */

const TRIP_ID = 'japan-trip-2026';
const SUPABASE_CDN = 'https://esm.sh/@supabase/supabase-js@2';

let clientPromise;

async function getClient() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }
  if (!clientPromise) {
    clientPromise = import(SUPABASE_CDN).then(({ createClient }) =>
      createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    );
  }
  return clientPromise;
}

export async function getSession() {
  const client = await getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithEmail(email) {
  const client = await getClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  if (error) throw error;
}

export async function signOut() {
  const client = await getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function listExpenses() {
  const client = await getClient();
  const { data, error } = await client
    .from('expenses')
    .select('*')
    .eq('trip_id', TRIP_ID)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveExpense(expense, id = null) {
  const client = await getClient();
  const payload = {
    trip_id: TRIP_ID,
    description: expense.description,
    expense_date: expense.date,
    amount_jpy: Number(expense.amount),
    payer: expense.payer,
    participants: expense.participants,
    settled: Boolean(expense.settled)
  };
  const request = id
    ? client.from('expenses').update(payload).eq('id', id).eq('trip_id', TRIP_ID).select().single()
    : client.from('expenses').insert(payload).select().single();
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const client = await getClient();
  const { error } = await client.from('expenses').delete().eq('id', id).eq('trip_id', TRIP_ID);
  if (error) throw error;
}

export async function getChecklist(type) {
  const client = await getClient();
  const { data, error } = await client
    .from('checklist_items')
    .select('id, checked, updated_at')
    .eq('trip_id', TRIP_ID)
    .eq('checklist_type', type);
  if (error) throw error;
  return data;
}

export async function setChecklistItem(type, id, checked) {
  const client = await getClient();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Sign in before saving checklist changes.');
  const { data, error } = await client.from('checklist_items').upsert({
    id, trip_id: TRIP_ID, checklist_type: type, checked, updated_by: userId
  }).select().single();
  if (error) throw error;
  return data;
}

export function subscribeToExpenses(callback) {
  return getClient().then((client) => client
    .channel('japan-trip-2026-expenses')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${TRIP_ID}`
    }, callback)
    .subscribe()
  );
}

export { TRIP_ID };
