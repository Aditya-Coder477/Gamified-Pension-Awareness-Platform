// ============================================================
// auth.js — Auth Removed (Public Mode)
// Authentication has been removed. All pages are accessible
// without login. requireAuth now calls the callback directly.
// showToast is still exported for use by other modules.
// ============================================================

import { db } from './firebase.js';

// ─── Toast Notifications ────────────────────────────────────

/** Show a toast message in the #toast-container element. */
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) { console.log('[Toast]', msg); return; }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/**
 * requireAuth — Auth removed.
 * Calls the callback immediately with null as the user.
 * All pages are now publicly accessible.
 */
export function requireAuth(callback) {
  if (callback) callback(null);
}

export { db };
