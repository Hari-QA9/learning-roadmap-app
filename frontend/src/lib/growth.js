// Small helpers for sharing: invite codes, full links, copy & native share.
const KEY = 'learnmap.invite';

/** Remember ?invite=CODE from any link so sign-up (email or Google) can credit the friend. */
export function captureInvite() {
  try {
    const code = new URLSearchParams(window.location.search).get('invite');
    if (code && /^[a-z0-9]{6,16}$/i.test(code)) localStorage.setItem(KEY, code.toLowerCase());
  } catch { /* storage blocked — invites just won't be credited */ }
}
export function rememberInvite(code) {
  try { if (/^[a-z0-9]{6,16}$/i.test(code || '')) localStorage.setItem(KEY, code.toLowerCase()); } catch {}
}
export function getInvite() {
  try { return localStorage.getItem(KEY) || undefined; } catch { return undefined; }
}
export function clearInvite() {
  try { localStorage.removeItem(KEY); } catch {}
}

export const siteUrl = (path) => `${window.location.origin}${path}`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure pages
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }
}

/** Phone share sheet when available, otherwise copy the link. Returns 'shared' | 'copied' | 'failed'. */
export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}

/** LinkedIn's "Add licence or certification" form, pre-filled. */
export function linkedInCertUrl(cert) {
  const d = new Date(cert.issued_at);
  const p = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.roadmap_title,
    organizationName: 'Learnvoy',
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: siteUrl(`/verify/${cert.certificate_id}`),
    certId: cert.certificate_id,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

/** Where to go after logging in / signing up when the visitor started from a public page. */
const AFTER = 'learnmap.afterAuth';
export function peekAfterAuth() {
  try { const p = sessionStorage.getItem(AFTER); return p && p.startsWith('/') && !p.startsWith('//') ? p : null; } catch { return null; }
}
export function takeAfterAuth() {
  const p = peekAfterAuth();
  try { sessionStorage.removeItem(AFTER); } catch {}
  return p;
}
