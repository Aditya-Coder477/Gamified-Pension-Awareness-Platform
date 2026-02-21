// ============================================================
// intent.js — Saving Intent Page Logic (Auth Removed)
// Uses guest session UID for saving intents
// ============================================================

import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth, showToast } from './auth.js';
import { db } from './firebase.js';
import { awardBadgeIfNew, awardPoints } from './gamification.js';

const GUEST_UID = (() => {
  let id = sessionStorage.getItem('guestUid');
  if (!id) { id = 'guest_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('guestUid', id); }
  return id;
})();

requireAuth(async () => {
  loadIntentHistory();
});

document.getElementById('intent-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('intent-amount').value);
  const frequency = document.getElementById('intent-frequency').value;
  const startDate = document.getElementById('intent-start-date').value;
  const note = document.getElementById('intent-note').value.trim();
  const errorEl = document.getElementById('intent-error');
  const btn = document.getElementById('intent-submit-btn');

  errorEl.classList.add('hidden');

  if (!amount || amount < 500) {
    errorEl.textContent = 'Please enter a valid amount (minimum ₹500).';
    errorEl.classList.remove('hidden'); return;
  }
  if (!frequency) {
    errorEl.textContent = 'Please select a contribution frequency.';
    errorEl.classList.remove('hidden'); return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await addDoc(collection(db, 'intents'), {
      uid: GUEST_UID, amount, frequency,
      startDate: startDate || null, note, createdAt: serverTimestamp()
    });

    const isNew = await awardBadgeIfNew(GUEST_UID, 'first_intent');
    if (isNew) {
      await awardPoints(GUEST_UID, 15, 'First saving intent set');
      showToast('🏅 Badge earned: Committed! (+15 pts)', 'success');
    }

    document.getElementById('intent-form-card').classList.add('hidden');
    document.getElementById('intent-success').classList.remove('hidden');
    loadIntentHistory();
  } catch (err) {
    console.error('[Intent] Save error:', err);
    showToast('Failed to save intent. Try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Save Intent';
  }
});

async function loadIntentHistory() {
  const loadingEl = document.getElementById('intents-loading');
  const listEl = document.getElementById('intents-list');
  const emptyEl = document.getElementById('intents-empty');
  listEl.innerHTML = '';

  try {
    const q = query(
      collection(db, 'intents'),
      where('uid', '==', GUEST_UID),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    loadingEl.classList.add('hidden');

    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }

    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-IN') : '—';
      const freqLabel = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }[data.frequency] || data.frequency;
      const row = document.createElement('div');
      row.style.cssText = 'padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: 8px; background: var(--color-surface);';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size: var(--font-size-sm);">
          <div><strong>₹${data.amount.toLocaleString('en-IN')}</strong> / ${freqLabel}
            ${data.startDate ? `<span class="text-muted"> · Starting ${data.startDate}</span>` : ''}
          </div>
          <div class="text-muted" style="font-size: var(--font-size-xs);">${date}</div>
        </div>
        ${data.note ? `<div class="text-muted text-sm mt-1">${data.note}</div>` : ''}
      `;
      listEl.appendChild(row);
    });
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Intent] History load error:', err);
  }
}
