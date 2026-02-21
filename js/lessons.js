// ============================================================
// lessons.js — Lessons Page Logic (Auth Removed)
// Fetches lessons from Firestore, progress saved with uid:'guest'
// ============================================================

import {
    addDoc,
    collection, getDocs, orderBy, query,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth, showToast } from './auth.js';
import { db } from './firebase.js';
import { awardPoints, checkLessonBadges } from './gamification.js';

// Using a stable guest identifier stored in sessionStorage
const GUEST_UID = (() => {
  let id = sessionStorage.getItem('guestUid');
  if (!id) { id = 'guest_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('guestUid', id); }
  return id;
})();

let allLessons = [];
let completedIds = new Set();

requireAuth(async () => {
  await loadLessons();
});

async function loadLessons() {
  const loadingEl = document.getElementById('lessons-loading');
  const listEl = document.getElementById('lesson-list');
  const emptyEl = document.getElementById('lessons-empty');

  try {
    const q = query(collection(db, 'lessons'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    loadingEl.classList.add('hidden');

    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }

    allLessons = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch completions for this guest session
    const progressQ = query(
      collection(db, 'userProgress'),
      where('uid', '==', GUEST_UID),
      where('completed', '==', true)
    );
    const progressSnap = await getDocs(progressQ);
    completedIds = new Set(progressSnap.docs.map(d => d.data().lessonId));

    updateProgress();

    listEl.innerHTML = '';
    allLessons.forEach((lesson, idx) => {
      const done = completedIds.has(lesson.id);
      const item = document.createElement('div');
      item.className = `lesson-item${done ? ' completed' : ''}`;
      item.id = `lesson-item-${lesson.id}`;
      item.innerHTML = `
        <div class="lesson-number">${done ? '✓' : idx + 1}</div>
        <div class="lesson-info">
          <div class="lesson-title">${lesson.title}</div>
          <div class="lesson-meta">${lesson.duration || '5 min'} · ${lesson.points || 10} pts</div>
        </div>
        <span class="text-muted" style="font-size: 18px;">›</span>
      `;
      item.addEventListener('click', () => showLessonDetail(lesson));
      listEl.appendChild(item);
    });

  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Lessons] Load error:', err);
    showToast('Failed to load lessons.', 'error');
  }
}

function updateProgress() {
  document.getElementById('total-count').textContent = allLessons.length;
  document.getElementById('completed-count').textContent = completedIds.size;
  const pct = allLessons.length > 0 ? Math.round((completedIds.size / allLessons.length) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
}

function showLessonDetail(lesson) {
  const detailEl = document.getElementById('lesson-detail');
  const done = completedIds.has(lesson.id);
  detailEl.innerHTML = `
    <div class="lesson-detail-panel">
      <div class="lesson-detail-title">${lesson.title}</div>
      <div class="lesson-detail-meta">
        ${lesson.duration || '5 min'} read · ${lesson.points || 10} points
        ${done ? '· <span class="badge badge-green">Completed</span>' : ''}
      </div>
      <div class="lesson-content">
        ${lesson.content ? lesson.content.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('') : '<p>No content available.</p>'}
      </div>
      <div class="lesson-actions">
        ${!done ? `
          <button class="btn btn-primary" id="complete-btn" onclick="markComplete('${lesson.id}', ${lesson.points || 10})">
            Mark as Completed (+${lesson.points || 10} pts)
          </button>
        ` : `<span class="badge badge-green" style="padding: 6px 12px;">✓ Completed</span>`}
        <a href="quiz.html?lessonId=${lesson.id}&lessonTitle=${encodeURIComponent(lesson.title)}" class="btn btn-outline">
          Take Quiz →
        </a>
      </div>
    </div>
  `;
}

window.markComplete = async function (lessonId, points) {
  if (completedIds.has(lessonId)) return;
  const btn = document.getElementById('complete-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    await addDoc(collection(db, 'userProgress'), {
      uid: GUEST_UID,
      lessonId,
      completed: true,
      completedAt: serverTimestamp()
    });

    await awardPoints(GUEST_UID, points, 'Completed lesson');
    const newBadges = await checkLessonBadges(GUEST_UID);
    if (newBadges.length > 0) showToast('🏅 New badge unlocked!', 'success');

    completedIds.add(lessonId);
    updateProgress();

    const listItem = document.getElementById(`lesson-item-${lessonId}`);
    if (listItem) {
      listItem.className = 'lesson-item completed';
      listItem.querySelector('.lesson-number').textContent = '✓';
    }

    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson) showLessonDetail(lesson);

    showToast(`Lesson completed! +${points} points`, 'success');
  } catch (err) {
    console.error('[Lessons] Complete error:', err);
    showToast('Failed to save completion.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Mark as Completed'; }
  }
};
