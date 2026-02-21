// ============================================================
// simulator.js — Pension Simulator (Auth Removed)
// Calculates corpus and saves results to Firestore (no user ID)
// ============================================================

import {
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { requireAuth, showToast } from './auth.js';
import { db } from './firebase.js';

let lastResult = null;

requireAuth(() => {
  // Page is accessible without login — no action needed on load
});

// ─── Simulation Calculation ──────────────────────────────────

function calculateCorpus(monthly, annualReturnPct, currentAge, retirementAge) {
  const years = retirementAge - currentAge;
  if (years <= 0) return null;
  const n = years * 12;
  const r = annualReturnPct / 100 / 12;
  const totalInvested = monthly * n;
  let corpus;
  if (r === 0) {
    corpus = monthly * n;
  } else {
    corpus = monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }
  const growth = corpus - totalInvested;
  const annuityCorpus = corpus * 0.4;
  const monthlyAnnuity = (annuityCorpus * 0.06) / 12;
  return { corpus, totalInvested, growth, years, monthlyAnnuity };
}

function getYearlyBreakdown(monthly, annualReturnPct, currentAge, years) {
  const r = annualReturnPct / 100 / 12;
  const rows = [];
  let corpus = 0;
  for (let y = 1; y <= years; y++) {
    const n = y * 12;
    corpus = r === 0 ? monthly * n : monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    rows.push({ year: y, age: currentAge + y, yearlyContrib: monthly * 12, corpus });
  }
  return rows;
}

function formatINR(amount) {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── Run Simulation ─────────────────────────────────────────

window.runSimulation = function () {
  const currentAge = parseInt(document.getElementById('current-age').value);
  const retirementAge = parseInt(document.getElementById('retirement-age').value);
  const monthly = parseFloat(document.getElementById('monthly-contribution').value);
  const annualReturn = parseFloat(document.getElementById('annual-return').value);

  if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(monthly) || isNaN(annualReturn)) {
    showToast('Please fill in all fields with valid numbers.', 'error'); return;
  }
  if (retirementAge <= currentAge) {
    showToast('Retirement age must be greater than current age.', 'error'); return;
  }
  if (monthly < 100) {
    showToast('Monthly contribution must be at least ₹100.', 'error'); return;
  }

  const result = calculateCorpus(monthly, annualReturn, currentAge, retirementAge);
  if (!result) { showToast('Invalid inputs.', 'error'); return; }

  lastResult = { ...result, monthly, annualReturn, currentAge, retirementAge };

  document.getElementById('result-empty').classList.add('hidden');
  document.getElementById('result-content').classList.remove('hidden');
  document.getElementById('save-result-wrap').classList.remove('hidden');

  document.getElementById('corpus-value').textContent = formatINR(result.corpus);
  document.getElementById('corpus-sub').textContent = `Projected at ${annualReturn}% annual return over ${result.years} years`;
  document.getElementById('total-invested').textContent = formatINR(result.totalInvested);
  document.getElementById('total-growth').textContent = formatINR(result.growth);
  document.getElementById('invest-years').textContent = `${result.years} yrs`;
  document.getElementById('annuity-est').textContent = formatINR(result.monthlyAnnuity) + '/mo';

  const breakdown = getYearlyBreakdown(monthly, annualReturn, currentAge, result.years);
  const tbody = document.getElementById('breakdown-body');
  tbody.innerHTML = '';
  breakdown.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.year}</td><td>${row.age}</td><td>${formatINR(row.yearlyContrib)}</td><td>${formatINR(row.corpus)}</td>`;
    tbody.appendChild(tr);
  });
};

// ─── Save to Firestore (no user ID required) ─────────────────

document.getElementById('save-sim-btn')?.addEventListener('click', async () => {
  if (!lastResult) return;
  const btn = document.getElementById('save-sim-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await addDoc(collection(db, 'simulations'), {
      uid: 'guest',
      monthly: lastResult.monthly,
      annualReturn: lastResult.annualReturn,
      currentAge: lastResult.currentAge,
      retirementAge: lastResult.retirementAge,
      corpus: Math.round(lastResult.corpus),
      totalInvested: Math.round(lastResult.totalInvested),
      createdAt: serverTimestamp()
    });
    showToast('Simulation saved.', 'success');
    btn.textContent = 'Saved ✓';
  } catch (err) {
    console.error('[Simulator] Save error:', err);
    showToast('Failed to save simulation.', 'error');
    btn.disabled = false;
    btn.textContent = 'Save Simulation';
  }
});
