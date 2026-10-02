// The signed-in user's own details: name, contact email and new-issue alerts
// live on their profiles row; the login phone changes through our server.
import { supabase } from './supabase';
import { api } from './purchases';
import { DeliveryAddress, emptyAddress } from './places';

export interface MyProfile {
  lastName: string;
  firstName: string;
  email: string;
  // Set by the server once the reader clicks the link we emailed
  emailVerified: boolean;
  // Email when a new issue is out
  notifyNewIssue: boolean;
  address: DeliveryAddress | null;
}

export const fullName = (p: Pick<MyProfile, 'lastName' | 'firstName'> | null | undefined) =>
  [p?.lastName, p?.firstName].filter(Boolean).join(' ');

export async function getMyProfile(uid: string): Promise<MyProfile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return {
    lastName: data?.last_name ?? '',
    firstName: data?.first_name ?? '',
    email: data?.email ?? '',
    emailVerified: !!data?.email_verified,
    notifyNewIssue: !!data?.notify_new_issue,
    address: data?.address ? { ...emptyAddress(), ...data.address } : null,
  };
}

export async function saveMyProfile(uid: string, p: MyProfile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: uid,
      last_name: p.lastName.trim(),
      first_name: p.firstName.trim(),
      email: p.email.trim(),
      notify_new_issue: p.notifyNewIssue,
      address: p.address,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function startPhoneChange(phone: string) {
  return api('/api/account/phone/start', json({ phone }));
}

export async function verifyPhoneChange(code: string) {
  const result = await api('/api/account/phone/verify', json({ code }));
  // The session still carries the old number until it is refreshed
  if (result.status === 200) await supabase.auth.refreshSession();
  return result;
}

// Email the verification link to the address saved on the profile
export async function sendEmailVerification() {
  return api('/api/account/email/send-verification', { method: 'POST' });
}

// The link from that email lands on /verify-email?token=…
export async function confirmEmail(token: string) {
  return api('/api/account/email/verify', json({ token }));
}
