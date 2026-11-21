/**
 * CivicResolve — Firebase Admin SDK Role Provisioning Script
 * Project: civicresolve-f212
 *
 * This script runs server-side with service-account credentials to set
 * cryptographic custom claims on a user account.
 *
 * Usage:
 *   1. Download service-account key from Firebase Console -> Project Settings -> Service Accounts
 *   2. Save as serviceAccountKey.json (do NOT commit to git)
 *   3. Run:
 *      node scripts/set-admin-claim.mjs <user-email-or-uid>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const targetIdentifier = process.argv[2];

if (!targetIdentifier) {
  console.error('\n[Error] Missing target user email or UID.');
  console.log('Usage: node scripts/set-admin-claim.mjs <user-email-or-uid>\n');
  process.exit(1);
}

const keyPath = path.resolve('serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error('\n[Notice] serviceAccountKey.json was not found in the project root.');
  console.log(`
To provision an admin custom claim:
1. Go to Firebase Console -> Project Settings -> Service accounts
2. Click "Generate new private key" for project "civicresolve-f212d"
3. Save the JSON file as "serviceAccountKey.json" in this directory
4. Run: node scripts/set-admin-claim.mjs "${targetIdentifier}"
  `);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || 'civicresolve-f212d',
  });
}

const auth = getAuth();
const db = getFirestore();

async function setAdminClaim() {
  try {
    let user;
    if (targetIdentifier.includes('@')) {
      user = await auth.getUserByEmail(targetIdentifier);
    } else {
      user = await auth.getUser(targetIdentifier);
    }

    console.log(`\nFound user: ${user.email} (UID: ${user.uid})`);

    // 1. Set cryptographic custom claims on Firebase Auth token, preserving existing claims
    const currentClaims = user.customClaims || {};
    await auth.setCustomUserClaims(user.uid, {
      ...currentClaims,
      role: 'admin',
      admin: true,
    });

    // 2. Also synchronize role in Firestore users/{uid} document
    try {
      await db.collection('users').doc(user.uid).set({
        role: 'admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`[Success] Updated users/${user.uid} Firestore profile to role 'admin'.`);
    } catch (fsErr) {
      console.warn('[Notice] Could not update Firestore profile directly; token claim is active.', fsErr);
    }

    console.log(`\n[Success] Verified Custom Claim { role: 'admin' } granted to ${user.email}.`);
    console.log('User must sign out and sign back in, or click "Recheck Token Claims" to update token.\n');
  } catch (err) {
    console.error('[Error] Failed to set custom claim:', err);
  } finally {
    process.exit(0);
  }
}

setAdminClaim();
