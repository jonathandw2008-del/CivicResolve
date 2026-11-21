/**
 * CivicResolve — Firebase Admin SDK Officer Role Provisioning Script
 * Project: civicresolve-f212
 *
 * This script runs server-side with service-account credentials to set
 * cryptographic custom claims on a Department Officer account.
 *
 * Usage:
 *   node scripts/set-officer-claim.mjs <user-email-or-uid> <departmentId>
 *
 * Example:
 *   node scripts/set-officer-claim.mjs officer@pwd.gov roads-bridges
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const targetIdentifier = process.argv[2];
const departmentId = process.argv[3] || 'roads-bridges';

if (!targetIdentifier) {
  console.error('\n[Error] Missing target user email or UID.');
  console.log('Usage: node scripts/set-officer-claim.mjs <user-email-or-uid> [departmentId]\n');
  process.exit(1);
}

const keyPath = path.resolve('serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error('\n[Notice] serviceAccountKey.json was not found in the project root.');
  console.log(`
To provision an officer custom claim:
1. Go to Firebase Console -> Project Settings -> Service accounts
2. Click "Generate new private key" for project "civicresolve-f212"
3. Save the JSON file as "serviceAccountKey.json" in this directory
4. Run: node scripts/set-officer-claim.mjs "${targetIdentifier}" "${departmentId}"
  `);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'civicresolve-f212',
  });
}

const auth = getAuth();
const db = getFirestore();

async function setOfficerClaim() {
  try {
    let user;
    if (targetIdentifier.includes('@')) {
      user = await auth.getUserByEmail(targetIdentifier);
    } else {
      user = await auth.getUser(targetIdentifier);
    }

    console.log(`\nFound user: ${user.email} (UID: ${user.uid})`);

    const currentClaims = user.customClaims || {};
    const isUserAdmin = currentClaims.role === 'admin' || currentClaims.admin === true;

    // 1. Set cryptographic custom claims on Firebase Auth token, preserving existing admin claim
    await auth.setCustomUserClaims(user.uid, {
      ...currentClaims,
      role: isUserAdmin ? 'admin' : 'officer',
      admin: isUserAdmin ? true : currentClaims.admin,
      officer: true,
      departmentId,
    });
    console.log(`[Success] Cryptographic token custom claims set: role=${isUserAdmin ? 'admin' : 'officer'}, officer=true, departmentId=${departmentId}`);

    // 2. Synchronize role in Firestore users/{uid} document
    try {
      const userDocSnap = await db.collection('users').doc(user.uid).get();
      const isProfileAdmin = userDocSnap.data()?.role === 'admin';

      await db.collection('users').doc(user.uid).set(
        {
          role: isProfileAdmin ? 'admin' : 'officer',
          departmentId,
          isOfficerActive: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`[Success] Updated users/${user.uid} Firestore profile to role '${isProfileAdmin ? 'admin' : 'officer'}'.`);
    } catch (fsErr) {
      console.warn('[Notice] Could not update Firestore profile directly; token claim is active.', fsErr);
    }

    // 3. Add to department officerUids if department exists
    try {
      const deptRef = db.collection('departments').doc(departmentId);
      await deptRef.set(
        {
          officerUids: FieldValue.arrayUnion(user.uid),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`[Success] Added UID to departments/${departmentId}.officerUids.`);
    } catch (deptErr) {
      console.warn('[Notice] Could not update department record:', deptErr);
    }

    console.log(`\nVerified Officer Provisioning Completed for: ${user.email}\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n[Error] Failed to set officer custom claims:', err.message || err);
    process.exit(1);
  }
}

setOfficerClaim();
