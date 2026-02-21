// ============================================================
// dashboard.js — Dashboard Page Logic (Auth Removed)
// ============================================================

import {
    collection,
    getDocs,
    limit,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth } from './auth.js';
import { db } from './firebase.js';

requireAuth(() => {
  loadDashboard();
});

async function loadDashboard() {
  document.getElementById('welcome-msg').textContent = 'Welcome to the Pension Awareness Platform';

  // Show zeroed stats initially — they'll fill from Firestore if data exists
  document.getElementById('stat-points').textContent = '—';
  document.getElementById('stat-badges').textContent = '—';
  document.getElementById('stat-lessons').textContent = '—';
  document.getElementById('stat-streak').textContent = '—';

  loadRecentActivity();
}

async function loadRecentActivity() {
  const loadingEl = document.getElementById('activity-loading');
  const listEl = document.getElementById('activity-list');
  const emptyEl = document.getElementById('activity-empty');

  try {
    // Show a platform-level feed of recent points activity (no user filter)
    const q = query(
      collection(db, 'pointsLedger'),
      orderBy('createdAt', 'desc'),
      limit(8)
    );
    const snap = await getDocs(q);
    loadingEl.classList.add('hidden');

    if (snap.empty) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.classList.remove('hidden');
    listEl.innerHTML = '';
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '—';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border-light); font-size: var(--font-size-sm);';
      row.innerHTML = `
        <span>${data.reason || 'Activity'}</span>
        <span style="display:flex; gap:16px; align-items:center;">
          <span class="badge badge-green">+${data.points} pts</span>
          <span class="text-muted">${date}</span>
        </span>
      `;
      listEl.appendChild(row);
    });
    const rows = listEl.querySelectorAll('div');
    if (rows.length) rows[rows.length - 1].style.borderBottom = 'none';
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Dashboard] Activity load error:', err);
  }
}
