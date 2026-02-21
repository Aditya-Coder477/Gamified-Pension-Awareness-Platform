// ============================================================
// quiz.js — Quiz Page Logic (Auth Removed)
// Uses a guest session UID for saving results and points
// ============================================================

import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth, showToast } from './auth.js';
import { db } from './firebase.js';
import { awardBadgeIfNew, awardPoints } from './gamification.js';

// Stable guest UID per browser session
const GUEST_UID = (() => {
  let id = sessionStorage.getItem('guestUid');
  if (!id) { id = 'guest_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('guestUid', id); }
  return id;
})();

let quizData = null;
let userAnswers = [];

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('lessonId');
const lessonTitle = params.get('lessonTitle') || 'Lesson Quiz';

requireAuth(async () => {
  if (!lessonId) { showState('none'); return; }
  document.getElementById('quiz-header-title').textContent = `Quiz: ${lessonTitle}`;
  document.getElementById('quiz-lesson-name').textContent = lessonTitle;
  await loadQuiz();
});

async function loadQuiz() {
  try {
    const q = query(collection(db, 'quizzes'), where('lessonId', '==', lessonId));
    const snap = await getDocs(q);
    showState('loading', false);
    if (snap.empty) { showState('none'); return; }
    quizData = { id: snap.docs[0].id, ...snap.docs[0].data() };
    userAnswers = new Array(quizData.questions.length).fill(null);
    renderQuestions();
    showState('quiz');
  } catch (err) {
    console.error('[Quiz] Load error:', err);
    showState('none');
    showToast('Failed to load quiz.', 'error');
  }
}

function showState(state) {
  const states = { loading: 'quiz-loading', none: 'quiz-none', quiz: 'quiz-container', result: 'quiz-result' };
  Object.entries(states).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', key !== state);
  });
}

function renderQuestions() {
  const container = document.getElementById('quiz-questions');
  container.innerHTML = '';
  quizData.questions.forEach((q, qIdx) => {
    const block = document.createElement('div');
    block.className = 'quiz-question';
    block.innerHTML = `
      <div class="quiz-question-text">
        <span style="color: var(--color-text-muted); margin-right: 6px;">${qIdx + 1}.</span>${q.q}
      </div>
      <div class="quiz-options" id="options-${qIdx}">
        ${q.options.map((opt, oIdx) => `
          <label class="quiz-option" id="opt-${qIdx}-${oIdx}">
            <input type="radio" name="q${qIdx}" value="${oIdx}" onchange="selectAnswer(${qIdx}, ${oIdx})" />
            ${opt}
          </label>
        `).join('')}
      </div>
    `;
    container.appendChild(block);
  });
}

window.selectAnswer = function (qIdx, oIdx) {
  userAnswers[qIdx] = oIdx;
};

window.submitQuiz = async function () {
  const unanswered = userAnswers.findIndex(a => a === null);
  if (unanswered !== -1) { showToast(`Please answer question ${unanswered + 1}.`, 'error'); return; }

  const btn = document.getElementById('submit-quiz-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  let correct = 0;
  quizData.questions.forEach((q, idx) => {
    const optEl = document.getElementById(`opt-${idx}-${userAnswers[idx]}`);
    const correctEl = document.getElementById(`opt-${idx}-${q.answer}`);
    document.querySelectorAll(`#options-${idx} input`).forEach(inp => { inp.disabled = true; });
    if (userAnswers[idx] === q.answer) { correct++; if (optEl) optEl.classList.add('correct'); }
    else { if (optEl) optEl.classList.add('incorrect'); if (correctEl) correctEl.classList.add('correct'); }
  });

  const total = quizData.questions.length;
  const pct = Math.round((correct / total) * 100);

  try {
    await addDoc(collection(db, 'quizResults'), {
      uid: GUEST_UID, lessonId, score: correct, total, pct, createdAt: serverTimestamp()
    });
  } catch (err) { console.error('[Quiz] Save result error:', err); }

  let bonusMsg = '';
  let bonusPts = 0;
  if (pct === 100) {
    bonusPts = 25;
    await awardPoints(GUEST_UID, bonusPts, `Quiz perfect score (${lessonTitle})`);
    await awardBadgeIfNew(GUEST_UID, 'quiz_ace');
    bonusMsg = `Perfect score! +${bonusPts} bonus points & 🏆 Quiz Ace badge earned!`;
  } else if (pct >= 60) {
    bonusPts = 10;
    await awardPoints(GUEST_UID, bonusPts, `Quiz passed (${lessonTitle})`);
    bonusMsg = `Quiz passed! +${bonusPts} points`;
  }

  setTimeout(() => {
    showState('result');
    document.getElementById('quiz-score').textContent = `${correct}/${total}`;
    const msgs = { 100: 'Excellent! You got everything right.', 80: 'Great work!', 60: 'Good effort. Review the lesson to reinforce your learning.' };
    const msg = pct === 100 ? msgs[100] : pct >= 80 ? msgs[80] : pct >= 60 ? msgs[60] : 'Keep studying. Read the lesson again and retake the quiz.';
    document.getElementById('quiz-result-msg').textContent = msg;
    if (bonusPts > 0) {
      const ptsEl = document.getElementById('quiz-points-msg');
      ptsEl.textContent = bonusMsg;
      ptsEl.classList.remove('hidden');
    }
  }, 600);
};
