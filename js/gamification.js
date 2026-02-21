// ============================================================
// gamification.js — Points & Badge Logic
// Used by: lessons.js, quiz.js, simulator.js
// ============================================================

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase.js';

// ─── Badge Definitions ───────────────────────────────────────

export const BADGE_DEFINITIONS = [
  {
    id: 'first_lesson',
    name: 'First Step',
    emoji: '📖',
    description: 'Completed your first lesson'
  },
  {
    id: 'three_lessons',
    name: 'On a Roll',
    emoji: '🏃',
    description: 'Completed 3 lessons'
  },
  {
    id: 'five_lessons',
    name: 'Knowledge Seeker',
    emoji: '🎓',
    description: 'Completed 5 lessons'
  },
  {
    id: 'first_simulation',
    name: 'Future Planner',
    emoji: '⌛',
    description: 'Ran your first simulation'
  },
  {
    id: 'first_intent',
    name: 'Committed',
    emoji: '🎯',
    description: 'Set your first saving intent'
  },
  {
    id: 'quiz_ace',
    name: 'Quiz Ace',
    emoji: '🏆',
    description: 'Scored 100% on a quiz'
  },
  {
    id: 'receipt_uploader',
    name: 'Proof Provided',
    emoji: '📎',
    description: 'Uploaded your first receipt'
  }
];

// ─── Award Points ────────────────────────────────────────────

/**
 * Log points to pointsLedger and increment user's totalPoints in profile.
 * @param {string} uid
 * @param {number} points
 * @param {string} reason
 */
export async function awardPoints(uid, points, reason) {
  try {
    // Log the entry
    await addDoc(collection(db, 'pointsLedger'), {
      uid,
      points,
      reason,
      createdAt: serverTimestamp()
    });

    // Update totalPoints on profile
    const profileRef = doc(db, 'profiles', uid);
    await updateDoc(profileRef, {
      totalPoints: increment(points)
    });

    console.log(`[Gamification] Awarded ${points} pts to ${uid}: ${reason}`);
  } catch (err) {
    console.error('[Gamification] awardPoints error:', err);
  }
}

// ─── Check & Award Badge ────────────────────────────────────

/**
 * Award a badge if the user doesn't already have it.
 * @param {string} uid
 * @param {string} badgeId
 * @returns {boolean} true if badge was newly awarded
 */
export async function awardBadgeIfNew(uid, badgeId) {
  try {
    const q = query(
      collection(db, 'userBadges'),
      where('uid', '==', uid),
      where('badgeId', '==', badgeId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return false; // Already has badge

    const def = BADGE_DEFINITIONS.find(b => b.id === badgeId);
    await addDoc(collection(db, 'userBadges'), {
      uid,
      badgeId,
      badgeName: def ? def.name : badgeId,
      earnedAt: serverTimestamp()
    });

    console.log(`[Gamification] Badge awarded: ${badgeId} to ${uid}`);
    return true;
  } catch (err) {
    console.error('[Gamification] awardBadgeIfNew error:', err);
    return false;
  }
}

// ─── Check Lesson Badges After Completion ───────────────────

/**
 * Check how many lessons a user has completed and award appropriate badges.
 * @param {string} uid
 */
export async function checkLessonBadges(uid) {
  try {
    const q = query(
      collection(db, 'userProgress'),
      where('uid', '==', uid),
      where('completed', '==', true)
    );
    const snap = await getDocs(q);
    const count = snap.size;

    const awarded = [];

    if (count >= 1) {
      const got = await awardBadgeIfNew(uid, 'first_lesson');
      if (got) awarded.push('first_lesson');
    }
    if (count >= 3) {
      const got = await awardBadgeIfNew(uid, 'three_lessons');
      if (got) awarded.push('three_lessons');
    }
    if (count >= 5) {
      const got = await awardBadgeIfNew(uid, 'five_lessons');
      if (got) awarded.push('five_lessons');
    }

    return awarded;
  } catch (err) {
    console.error('[Gamification] checkLessonBadges error:', err);
    return [];
  }
}

// ─── Get User's Badges ──────────────────────────────────────

/**
 * Return all badge IDs a user has earned.
 * @param {string} uid
 * @returns {string[]}
 */
export async function getUserBadgeIds(uid) {
  try {
    const q = query(collection(db, 'userBadges'), where('uid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().badgeId);
  } catch (err) {
    console.error('[Gamification] getUserBadgeIds error:', err);
    return [];
  }
}

// ─── Get Total Points ───────────────────────────────────────

/**
 * Get the user's total points from their profile.
 * @param {string} uid
 * @returns {number}
 */
export async function getUserPoints(uid) {
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (snap.exists()) return snap.data().totalPoints || 0;
    return 0;
  } catch {
    return 0;
  }
}
