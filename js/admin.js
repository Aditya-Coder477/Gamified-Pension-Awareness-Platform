// ============================================================
// admin.js — Admin Panel Logic (Auth Removed)
// Admin gate removed — panel is now openly accessible.
// Includes platform stats, receipt/simulation tables, seed tool.
// ============================================================

import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth, showToast } from './auth.js';
import { db } from './firebase.js';

requireAuth(async () => {
  // Show admin content directly — no email gate
  document.getElementById('admin-gate')?.classList.add('hidden');
  document.getElementById('admin-content')?.classList.remove('hidden');
  loadAdminData();
});

async function loadAdminData() {
  await Promise.all([loadStats(), loadReceiptsTable(), loadSimulationsTable()]);
}

async function loadStats() {
  try {
    const [users, lessons, intents, receipts] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'userProgress'))),
      getDocs(collection(db, 'intents')),
      getDocs(collection(db, 'receipts'))
    ]);
    document.getElementById('admin-users').textContent = users.size;
    document.getElementById('admin-lessons').textContent = lessons.size;
    document.getElementById('admin-intents').textContent = intents.size;
    document.getElementById('admin-receipts').textContent = receipts.size;
  } catch (err) { console.error('[Admin] Stats error:', err); }
}

async function loadReceiptsTable() {
  const loadingEl = document.getElementById('admin-receipts-loading');
  const tableWrap = document.getElementById('receipts-table-wrap');
  const tbody = document.getElementById('admin-receipts-body');
  const emptyEl = document.getElementById('receipts-list-empty');
  try {
    const snap = await getDocs(query(collection(db, 'receipts'), orderBy('uploadedAt', 'desc'), limit(50)));
    loadingEl.classList.add('hidden');
    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }
    tableWrap.style.display = 'block';
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.uploadedAt ? data.uploadedAt.toDate().toLocaleString('en-IN') : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:0.75rem;color:var(--color-text-muted);">${(data.uid||'—').substring(0,14)}…</td>
        <td>${data.fileName || '—'}</td>
        <td>${date}</td>
        <td><span class="badge ${data.verified ? 'badge-green' : 'badge-gray'}">${data.verified ? 'Verified' : 'Pending'}</span></td>
        <td><a href="${data.fileUrl}" target="_blank" class="btn btn-ghost btn-sm">View</a></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Admin] Receipts table error:', err);
  }
}

async function loadSimulationsTable() {
  const loadingEl = document.getElementById('admin-sims-loading');
  const tableWrap = document.getElementById('sims-admin-table-wrap');
  const tbody = document.getElementById('admin-sims-body');
  const emptyEl = document.getElementById('sims-admin-empty');
  try {
    const snap = await getDocs(query(collection(db, 'simulations'), orderBy('createdAt', 'desc'), limit(50)));
    loadingEl.classList.add('hidden');
    if (snap.empty) { emptyEl.classList.remove('hidden'); return; }
    tableWrap.style.display = 'block';
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const data = d.data();
      const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-IN') : '—';
      const corpus = data.corpus ? `₹${Math.round(data.corpus).toLocaleString('en-IN')}` : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:0.75rem;color:var(--color-text-muted);">${(data.uid||'—').substring(0,14)}…</td>
        <td>₹${(data.monthly||0).toLocaleString()}</td>
        <td>${data.annualReturn||'—'}%</td>
        <td><strong>${corpus}</strong></td>
        <td>${date}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    console.error('[Admin] Simulations table error:', err);
  }
}

// ─── Seed Data ───────────────────────────────────────────────

const SAMPLE_LESSONS = [
  { id: 'lesson_001', title: 'What is NPS?', content: `The National Pension System (NPS) is a government-backed voluntary retirement savings scheme launched in 2004 for Central Government employees, and opened to all Indian citizens in 2009.\n\nIt is regulated by the Pension Fund Regulatory and Development Authority (PFRDA), which ensures the safety and soundness of pension fund management.\n\nUnder NPS, subscribers accumulate savings in a personal retirement account (PRAN — Permanent Retirement Account Number) during their working life. On retirement, a portion of the accumulation is used to procure an annuity — a regular monthly income — while the remaining corpus can be withdrawn as a lump sum.\n\nKey benefits of NPS:\n- Tax deductions under Section 80C and 80CCD(1B) up to ₹2 lakh per year\n- Low-cost fund management\n- Flexibility to choose your fund manager and investment mix\n- Portable across employers and locations\n- Government-regulated and secure`, duration: '5 min', points: 10, order: 1 },
  { id: 'lesson_002', title: 'Tier I vs Tier II Accounts', content: `NPS offers two types of accounts: Tier I and Tier II.\n\nTier I Account (Pension Account):\nThis is the primary NPS account. It is mandatory for government employees and voluntary for others.\n- Minimum annual contribution: ₹1,000\n- Premature withdrawal is highly restricted\n- Tax benefits available under 80CCD(1B) up to ₹50,000 additional deduction\n- Corpus is locked till retirement (age 60), except in specific cases\n\nTier II Account (Investment Account):\nThis is a voluntary savings account linked to the Tier I account.\n- Can be opened only if Tier I is active\n- No lock-in; withdrawals freely allowed\n- No tax benefits for private sector employees\n- Minimum initial contribution: ₹250\n\nIn summary: Use Tier I for long-term retirement savings (and tax benefits), and Tier II for more liquid, flexible investment without lock-in restrictions.`, duration: '6 min', points: 10, order: 2 },
  { id: 'lesson_003', title: 'Tax Benefits Under NPS', content: `NPS offers substantial tax advantages that make it one of the most tax-efficient retirement tools available.\n\nSection 80CCD(1) — Employee Contribution:\nUp to 10% of salary (Basic + DA) is deductible. This is within the overall ₹1.5 lakh limit of Section 80C.\n\nSection 80CCD(1B) — Additional Deduction:\nAn additional deduction of up to ₹50,000 per year is available, over and above the 80C limit. This is exclusive to NPS.\n\nSection 80CCD(2) — Employer Contribution:\nIf your employer contributes to NPS on your behalf, up to 10% of salary (14% for government employees) is deductible. This does not count toward the ₹1.5 lakh or ₹50,000 caps.\n\nAt Maturity:\n- 60% of the corpus can be withdrawn tax-free at age 60\n- 40% must be used to purchase an annuity (taxable as income when received)\n\nTax efficiency tip: A person in the 30% tax bracket can save over ₹15,000 in taxes per year using just the ₹50,000 additional NPS deduction under 80CCD(1B).`, duration: '7 min', points: 10, order: 3 },
  { id: 'lesson_004', title: 'How to Invest in NPS', content: `Opening an NPS account is straightforward. Here is a step-by-step guide.\n\nStep 1: Choose your registration method\n- Online via eNPS portal (enps.nsdl.com) using Aadhaar or PAN\n- Through your bank if it is a Point of Presence (POP)\n- Employer-facilitated NPS for corporate employees\n\nStep 2: Get your PRAN\nA Permanent Retirement Account Number (PRAN) is issued upon registration. This is your unique NPS identifier.\n\nStep 3: Choose your investment allocation\nNPS allows you to invest in:\n- Equity (Asset Class E): Market-linked, higher potential return\n- Government Bonds (Asset Class G): Low risk, stable\n- Corporate Bonds (Asset Class C): Moderate risk\n\nStep 4: Select a Pension Fund Manager (PFM)\nApproved PFMs include SBI Pension Funds, HDFC Pension Fund, Kotak Pension Fund, ICICI Pru Pension, and others.\n\nStep 5: Make regular contributions\nSet up a standing instruction for monthly auto-debit. Even ₹2,000/month invested at 10% per year over 30 years can grow to approximately ₹45 lakh.`, duration: '8 min', points: 10, order: 4 },
  { id: 'lesson_005', title: 'Withdrawal Rules & Exit Options', content: `Understanding NPS withdrawal rules is important for effective retirement planning.\n\nNormal Exit (At Age 60 or Above):\n- At least 40% of the corpus must be used to purchase an annuity\n- Up to 60% can be withdrawn as a tax-free lump sum\n- If total corpus is ≤ ₹5 lakh, full withdrawal is permitted\n\nPremature Exit (Before Age 60):\n- Allowed only after 3 years of subscription\n- At least 80% of corpus must be used to purchase an annuity\n- Only 20% can be withdrawn as lump sum\n- If corpus is ≤ ₹2.5 lakh, full withdrawal is permitted\n\nPartial Withdrawal (After 3 Years):\n- Allowed for specific purposes: children's education, marriage, home purchase, or critical illness treatment\n- Maximum 25% of subscriber's own contributions can be withdrawn\n- Allowed maximum 3 times during the entire subscription period\n\nDeath of Subscriber:\nThe entire corpus is paid to the nominee. The nominee may also choose to purchase an annuity if they wish.`, duration: '8 min', points: 10, order: 5 }
];

const SAMPLE_QUIZZES = [
  { id: 'quiz_001', lessonId: 'lesson_001', questions: [{ q: 'What does NPS stand for?', options: ['National Pension System', 'New Payment Scheme', 'National Provident Savings', 'None of these'], answer: 0 }, { q: 'Which body regulates NPS?', options: ['SEBI', 'RBI', 'PFRDA', 'IRDAI'], answer: 2 }, { q: 'In which year was NPS opened to all Indian citizens?', options: ['2004', '2006', '2009', '2012'], answer: 2 }] },
  { id: 'quiz_002', lessonId: 'lesson_002', questions: [{ q: 'Which NPS account has a lock-in until retirement?', options: ['Tier II', 'Tier I', 'Both', 'Neither'], answer: 1 }, { q: 'What is the minimum annual contribution for Tier I?', options: ['₹500', '₹1,000', '₹2,000', '₹5,000'], answer: 1 }, { q: 'Which NPS account allows free withdrawals?', options: ['Tier I', 'Tier II', 'Both', 'Neither'], answer: 1 }] },
  { id: 'quiz_003', lessonId: 'lesson_003', questions: [{ q: 'What is the exclusive additional NPS deduction under 80CCD(1B)?', options: ['₹1,00,000', '₹1,50,000', '₹50,000', '₹75,000'], answer: 2 }, { q: 'What percentage of corpus can be withdrawn tax-free at retirement?', options: ['40%', '60%', '80%', '100%'], answer: 1 }, { q: 'Employer NPS contribution is deductible under which section?', options: ['80C', '80CCD(1)', '80CCD(2)', '80D'], answer: 2 }] },
  { id: 'quiz_004', lessonId: 'lesson_004', questions: [{ q: 'What is PRAN?', options: ['Permanent Retirement Account Number', 'Pension Recurrent Account Node', 'Primary Registration Application Number', 'None of these'], answer: 0 }, { q: 'Which asset class in NPS is equity-based?', options: ['Asset Class G', 'Asset Class C', 'Asset Class E', 'Asset Class F'], answer: 2 }, { q: 'Which of these is a Pension Fund Manager for NPS?', options: ['LIC', 'SBI Pension Funds', 'Post Office', 'IRDA'], answer: 1 }] },
  { id: 'quiz_005', lessonId: 'lesson_005', questions: [{ q: 'At normal exit, minimum what % must go to annuity?', options: ['20%', '40%', '60%', '80%'], answer: 1 }, { q: 'Premature exit is allowed after how many years of subscription?', options: ['1 year', '2 years', '3 years', '5 years'], answer: 2 }, { q: 'How many partial withdrawals are allowed in the entire NPS tenure?', options: ['1', '2', '3', '5'], answer: 2 }] }
];

window.seedData = async function () {
  const statusEl = document.getElementById('seed-status');
  const btn = document.getElementById('seed-btn');
  btn.disabled = true;
  statusEl.textContent = 'Seeding lessons…';
  try {
    for (const lesson of SAMPLE_LESSONS) {
      const { id, ...data } = lesson;
      await setDoc(doc(db, 'lessons', id), { ...data, createdAt: serverTimestamp() });
    }
    statusEl.textContent = 'Seeding quizzes…';
    for (const quiz of SAMPLE_QUIZZES) {
      const { id, ...data } = quiz;
      await setDoc(doc(db, 'quizzes', id), { ...data, createdAt: serverTimestamp() });
    }
    statusEl.innerHTML = '<span style="color: var(--color-success);">✓ 5 lessons and 5 quizzes seeded. <a href="lessons.html">View Lessons →</a></span>';
    btn.textContent = 'Seeded ✓';
    showToast('Sample data seeded!', 'success');
  } catch (err) {
    console.error('[Admin] Seed error:', err);
    statusEl.innerHTML = '<span style="color: var(--color-danger);">Seed failed. Check Firestore rules and console.</span>';
    btn.disabled = false;
    btn.textContent = 'Seed Sample Lessons';
  }
};
