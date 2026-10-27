// Phone & desktop push notifications for this device.
import api from './api';

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

async function registration() {
  // The service worker is registered on load in production builds; wait for it (max 5 s).
  return Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('The app needs to be opened from its web address (not the dev server) for notifications.')), 5000))]);
}

/** { supported, serverReady, permission, subscribed } */
export async function pushState() {
  if (!pushSupported()) return { supported: false };
  const cfg = await api.get('/push/config', { noCache: true }).then((r) => r.data).catch(() => ({ enabled: false }));
  let subscribed = false;
  try { const reg = await registration(); subscribed = !!(await reg.pushManager.getSubscription()); } catch {}
  return { supported: true, serverReady: !!cfg.enabled, publicKey: cfg.publicKey, permission: Notification.permission, subscribed };
}

export async function enablePush() {
  const cfg = await api.get('/push/config', { noCache: true }).then((r) => r.data);
  if (!cfg.enabled) throw new Error('Notifications aren’t set up on the server yet.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser settings, then try again.' : 'Permission wasn’t given.');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(cfg.publicKey) });
  await api.post('/push/subscribe', { subscription: sub.toJSON ? sub.toJSON() : sub });
}

export async function disablePush() {
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

/** On app start: make sure the server still knows this device (e.g. after logging in again). */
export async function syncPush() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await api.post('/push/subscribe', { subscription: sub.toJSON ? sub.toJSON() : sub });
  } catch { /* quietly ignore */ }
}
