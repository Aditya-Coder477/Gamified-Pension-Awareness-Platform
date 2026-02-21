// ============================================================
// profile.js — Profile Page Logic (Auth Removed)
// Shows badges, receipts, simulations, points log — no login
// Uses sessionStorage guest UID for Firestore queries
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
import {
    getDownloadURL,
    ref, uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { requireAuth, showToast } from './auth.js';
import { db, storage } from './firebase.js';
import { awardBadgeIfNew, awardPoints, BADGE_DEFINITIONS, getUserBadgeIds } from './gamification.js';

const ADMIN_EMAIL = 'admin@pensionplatform.com';

const GUEST_UID = (() => {
  let id = sessionStorage.getItem('guestUid');
  if (!id) { id = 'guest_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('guestUid', id); }
  return id;
})();

requireAuth(async () => {
  loadProfileData();
});

async function loadProfileData() {
  // Display name from sessionStorage if available, else "Guest"
  const displayName = sessionStorage.getItem('guestName') || 'Guest User';
  const initials = displayName.charAt(0).toUpperCase();

  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent = displayName;
  document.getElementById('profile-email').textContent = 'Guest session';

  try {
    const [badgeIds, lessonCount] = await Promise.all([
      getUserBadgeIds(GUEST_UID),
      getLessonCount(GUEST_UID)
    ]);

    // Get total points from pointsLedger
    const ptSnap = await getDocs(query(collection(db, 'pointsLedger'), where('uid', '==', GUEST_UID)));
    const totalPoints = ptSnap.docs.reduce((sum, d) => sum + (d.data().points || 0), 0);

    document.getElementById('ps-points').textContent = totalPoints.toLocaleString();
    document.getElementById('ps-badges').textContent = badgeIds.length;
    document.getElementById('ps-lessons').textContent = lessonCount;
    document.getElementById('ps-streak').textContent = '—';

    renderBadges(badgeIds);
    loadReceipts();
    loadSimulations();
    loadPointsLog();
    setupFileUpload();
  } catch (err) {
    console.error('[Profile] Load error:', err);
    showToast('Failed to load profile.', 'error');
  }
}

async function getLessonCount(uid) {
  const q = query(collection(db, 'userProgress'), where('uid', '==', uid), where('completed', '==', true));
  const snap = await getDocs(q);
  return snap.size;
}

function renderBadges(earnedIds) {
  const grid = document.getElementById('badges-grid');
  grid.innerHTML = '';
  BADGE_DEFINITIONS.forEach(badge => {
    const earned = earnedIds.includes(badge.id);
    const el = document.createElement('div');
    el.className = `achievement-badge${earned ? '' : ' locked'}`;
    el.innerHTML = `
      <div class="badge-icon">${badge.emoji}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.description}</div>
      ${earned ? '<span class="badge badge-green" style="margin-top:4px">Earned</span>' : ''}
    `;
    grid.appendChild(el);
  });
}

async function loadReceipts() {
  const listEl = document.getElementById('receipts-list');
  const emptyEl = document.getElementById('receipts-empty');
  listEl.innerHTML = '';
  try {
    const q = query(collection(db, 'receipts'), where('uid', '==', GUEST_UID), orderBy('uploadedAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.uploadedAt ? data.uploadedAt.toDate().toLocaleDateString('en-IN') : '—';
      const el = document.createElement('div');
      el.className = 'receipt-item';
      el.innerHTML = `
        <span class="receipt-icon">📄</span>
        <span class="receipt-name">${data.fileName || 'Receipt'}</span>
        <span class="badge ${data.verified ? 'badge-green' : 'badge-gray'}">${data.verified ? 'Verified' : 'Pending'}</span>
        <span class="receipt-date">${date}</span>
        <a href="${data.fileUrl}" target="_blank" class="btn btn-ghost btn-sm">View</a>
      `;
      listEl.appendChild(el);
    });
  } catch (err) {
    emptyEl.classList.remove('hidden');
    console.error('[Profile] Receipts load error:', err);
  }
}

function setupFileUpload() {
  const fileInput = document.getElementById('receipt-file-input');
  if (!fileInput) return;
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5 MB.', 'error'); return; }

    const progressWrap = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-bar');
    progressWrap.classList.remove('hidden');

    const fileName = `${GUEST_UID}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `receipts/${GUEST_UID}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => { progressBar.style.width = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) + '%'; },
      (err) => { console.error('[Profile] Upload error:', err); showToast('Upload failed.', 'error'); progressWrap.classList.add('hidden'); },
      async () => {
        const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'receipts'), { uid: GUEST_UID, fileName: file.name, fileUrl, uploadedAt: serverTimestamp(), verified: false });
        const isNew = await awardBadgeIfNew(GUEST_UID, 'receipt_uploader');
        if (isNew) { await awardPoints(GUEST_UID, 10, 'First receipt uploaded'); showToast('🏅 Badge: Proof Provided! (+10 pts)', 'success'); }
        else showToast('Receipt uploaded.', 'success');
        progressWrap.classList.add('hidden');
        progressBar.style.width = '0%';
        fileInput.value = '';
        loadReceipts();
      }
    );
  });
}

async function loadSimulations() {
  const loadingEl = document.getElementById('sims-loading');
  const tableWrap = document.getElementById('sims-table-wrap');
  const tbody = document.getElementById('sims-body');
  const emptyEl = document.getElementById('sims-empty');
  try {
    const q = query(collection(db, 'simulations'), where('uid', '==', GUEST_UID), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    loadingEl.classList.add('hidden');
    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }
    tableWrap.style.display = 'block';
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-IN') : '—';
      const corpus = data.corpus ? `₹${Math.round(data.corpus).toLocaleString('en-IN')}` : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${date}</td><td>₹${(data.monthly||0).toLocaleString()}</td><td>${data.annualReturn||'—'}%</td><td>${data.currentAge||'—'}</td><td>${data.retirementAge||'—'}</td><td><strong>${corpus}</strong></td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Profile] Simulations load error:', err);
  }
}

async function loadPointsLog() {
  const loadingEl = document.getElementById('points-loading');
  const tableWrap = document.getElementById('points-table-wrap');
  const tbody = document.getElementById('points-body');
  const emptyEl = document.getElementById('points-empty');
  try {
    const q = query(collection(db, 'pointsLedger'), where('uid', '==', GUEST_UID), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    loadingEl.classList.add('hidden');
    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }
    tableWrap.style.display = 'block';
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-IN') : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${date}</td><td>${data.reason||'—'}</td><td><span class="badge badge-green">+${data.points}</span></td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Profile] Points log error:', err);
  }
}
