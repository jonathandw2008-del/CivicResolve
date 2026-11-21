import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin } from 'vite';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminInitialized = false;

function initFirebaseAdmin(): boolean {
  if (adminInitialized || getApps().length > 0) {
    adminInitialized = true;
    return true;
  }

  try {
    const keyPath = path.resolve('serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'civicresolve-f212d',
      });
      adminInitialized = true;
      console.log('[CivicResolve Server API] Firebase Admin SDK initialized with project:', serviceAccount.project_id || 'civicresolve-f212d');
      return true;
    } else {
      console.warn('[CivicResolve Server API] serviceAccountKey.json not found in project root.');
    }
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error initializing Firebase Admin:', err.message);
  }
  return false;
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, payload: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

/**
 * Validates that the request has a valid Firebase ID Token belonging to an administrator.
 */
async function verifyAdminCaller(
  req: IncomingMessage,
  res: ServerResponse
): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJsonResponse(res, 401, {
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header.',
    });
    return null;
  }

  const token = authHeader.substring(7).trim();
  const auth = getAuth();
  const db = getFirestore();

  try {
    const decoded = await auth.verifyIdToken(token);

    // 1. Check custom claim on token
    const isClaimAdmin = decoded.role === 'admin' || decoded.admin === true;
    if (isClaimAdmin) {
      return { uid: decoded.uid, email: decoded.email };
    }

    // 2. Check Firestore profile
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return { uid: decoded.uid, email: decoded.email };
    }

    sendJsonResponse(res, 403, {
      success: false,
      error: 'Forbidden: Caller is not authorized as a Municipal Administrator.',
    });
    return null;
  } catch (err: any) {
    sendJsonResponse(res, 401, {
      success: false,
      error: 'Invalid or expired Firebase ID token.',
      details: err.message,
    });
    return null;
  }
}

async function handleAssignOfficer(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const body = await parseJsonBody(req);
    const { targetUid, departmentId, departmentName } = body;

    if (!targetUid || !departmentId) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required fields: targetUid and departmentId are required.',
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // 1. Validate target user exists in Firebase Auth or Firestore
    let targetUserRecord;
    try {
      targetUserRecord = await auth.getUser(targetUid);
    } catch {
      // Check Firestore
      const userSnap = await db.collection('users').doc(targetUid).get();
      if (!userSnap.exists) {
        return sendJsonResponse(res, 404, {
          success: false,
          error: `Target user with UID "${targetUid}" does not exist in registered accounts.`,
        });
      }
    }

    // 2. Set cryptographic custom claims on Firebase Auth token, preserving existing admin claim
    if (targetUserRecord) {
      const currentClaims = targetUserRecord.customClaims || {};
      const isTargetAdmin = currentClaims.role === 'admin' || currentClaims.admin === true;
      await auth.setCustomUserClaims(targetUid, {
        ...currentClaims,
        role: isTargetAdmin ? 'admin' : 'officer',
        admin: isTargetAdmin ? true : currentClaims.admin,
        officer: true,
        departmentId,
      });
    }

    // 3. Update target user profile in Firestore (preserve admin if profile is admin)
    const userDocSnap = await db.collection('users').doc(targetUid).get();
    const isProfileAdmin = userDocSnap.data()?.role === 'admin';

    await db.collection('users').doc(targetUid).set(
      {
        role: isProfileAdmin ? 'admin' : 'officer',
        departmentId,
        departmentName: departmentName || '',
        isOfficerActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 4. Update department officerUids
    const deptRef = db.collection('departments').doc(departmentId);
    await deptRef.set(
      {
        id: departmentId,
        name: departmentName || '',
        officerUids: FieldValue.arrayUnion(targetUid),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 5. In-app notification to the appointed officer
    await db.collection('notifications').add({
      recipientUid: targetUid,
      recipientRole: 'officer',
      type: 'assignment',
      title: 'Department Officer Appointment',
      message: `You have been appointed as an officer for ${departmentName || departmentId} by Administrator ${adminCaller.email || adminCaller.uid}.`,
      link: '/department/dashboard',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`[CivicResolve Server API] Successfully provisioned officer claims and assignment for UID ${targetUid} in ${departmentId}`);

    return sendJsonResponse(res, 200, {
      success: true,
      message: 'Officer assigned and custom claims provisioned successfully.',
      uid: targetUid,
      departmentId,
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handleAssignOfficer:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Internal server error while assigning officer.',
    });
  }
}

async function handleRemoveOfficer(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const body = await parseJsonBody(req);
    const { targetUid, departmentId } = body;

    if (!targetUid || !departmentId) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required fields: targetUid and departmentId.',
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // 1. Reset custom user claims, preserving admin if caller was admin
    try {
      const targetUserRecord = await auth.getUser(targetUid).catch(() => null);
      const currentClaims = targetUserRecord?.customClaims || {};
      const isTargetAdmin = currentClaims.role === 'admin' || currentClaims.admin === true;

      await auth.setCustomUserClaims(targetUid, {
        ...currentClaims,
        role: isTargetAdmin ? 'admin' : 'citizen',
        admin: isTargetAdmin ? true : undefined,
        officer: false,
        departmentId: null,
      });
    } catch (authErr) {
      console.warn('[CivicResolve Server API] Notice resetting auth claims:', authErr);
    }

    // 2. Reset user profile in Firestore
    const userDocSnap = await db.collection('users').doc(targetUid).get();
    const isProfileAdmin = userDocSnap.data()?.role === 'admin';

    await db.collection('users').doc(targetUid).set(
      {
        role: isProfileAdmin ? 'admin' : 'citizen',
        departmentId: null,
        departmentName: null,
        isOfficerActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Remove from department
    const deptRef = db.collection('departments').doc(departmentId);
    await deptRef.set(
      {
        officerUids: FieldValue.arrayRemove(targetUid),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return sendJsonResponse(res, 200, {
      success: true,
      message: 'Officer removed and role returned to citizen.',
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handleRemoveOfficer:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Internal server error while removing officer.',
    });
  }
}

async function handleToggleOfficerActive(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const body = await parseJsonBody(req);
    const { targetUid, active } = body;

    if (!targetUid || typeof active !== 'boolean') {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required fields: targetUid and boolean active state.',
      });
    }

    const db = getFirestore();
    await db.collection('users').doc(targetUid).set(
      {
        isOfficerActive: active,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return sendJsonResponse(res, 200, {
      success: true,
      message: `Officer active status set to ${active}.`,
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handleToggleOfficerActive:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Internal server error while toggling officer active status.',
    });
  }
}

/**
 * Elevates a registered user to Municipal Administrator.
 * Preserves existing claims (e.g. officer/department claims) while adding role: 'admin', admin: true.
 * Records the action in an immutable audit log.
 */
async function handlePromoteAdmin(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const body = await parseJsonBody(req);
    const { targetUid } = body;

    if (!targetUid) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required parameter: targetUid.',
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // 1. Fetch user record from Auth
    let targetUserRecord;
    try {
      targetUserRecord = await auth.getUser(targetUid);
    } catch {
      return sendJsonResponse(res, 404, {
        success: false,
        error: `User with UID "${targetUid}" does not exist in Firebase Authentication.`,
      });
    }

    const currentClaims = targetUserRecord.customClaims || {};
    const previousRole = currentClaims.role || 'citizen';

    // 2. Set cryptographic custom claim preserving existing claims
    await auth.setCustomUserClaims(targetUid, {
      ...currentClaims,
      role: 'admin',
      admin: true,
    });

    // 3. Invalidate refresh tokens to force fresh ID token on target user's next request
    try {
      await auth.revokeRefreshTokens(targetUid);
    } catch (revErr) {
      console.warn('[CivicResolve Server API] Notice revoking refresh tokens:', revErr);
    }

    // 4. Update Firestore user profile
    await db.collection('users').doc(targetUid).set(
      {
        role: 'admin',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 5. Append immutable entry to adminAuditLogs
    const auditEntry = {
      actorUid: adminCaller.uid,
      actorEmail: adminCaller.email || '',
      targetUid,
      targetEmail: targetUserRecord.email || '',
      targetName: targetUserRecord.displayName || targetUserRecord.email || 'User',
      action: 'PROMOTE_ADMIN',
      previousRole,
      newRole: 'admin',
      timestamp: FieldValue.serverTimestamp(),
    };
    await db.collection('adminAuditLogs').add(auditEntry);

    // 6. In-app notification to the newly appointed admin
    await db.collection('notifications').add({
      recipientUid: targetUid,
      recipientRole: 'admin',
      type: 'admin_promotion',
      title: 'Administrator Access Granted',
      message: `You were elevated to Municipal Administrator by ${adminCaller.email || adminCaller.uid}.`,
      link: '/admin/dashboard',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`[CivicResolve Server API] Elevated UID ${targetUid} (${targetUserRecord.email}) to Administrator by ${adminCaller.email}`);

    return sendJsonResponse(res, 200, {
      success: true,
      message: `Successfully promoted ${targetUserRecord.email || targetUid} to Municipal Administrator.`,
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handlePromoteAdmin:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Internal server error while promoting user to administrator.',
    });
  }
}

/**
 * Revokes Administrator privileges from a user.
 * Guards against self-revocation to prevent lockout.
 * Preserves officer claims if target user belongs to a municipal department.
 */
async function handleRevokeAdmin(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const body = await parseJsonBody(req);
    const { targetUid } = body;

    if (!targetUid) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Missing required parameter: targetUid.',
      });
    }

    // Safety Guard: Prevent self-revocation
    if (targetUid === adminCaller.uid) {
      return sendJsonResponse(res, 400, {
        success: false,
        error: 'Action prohibited: You cannot revoke your own administrator privileges. Another administrator must perform this action.',
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    let targetUserRecord;
    try {
      targetUserRecord = await auth.getUser(targetUid);
    } catch {
      return sendJsonResponse(res, 404, {
        success: false,
        error: `User with UID "${targetUid}" does not exist in Firebase Authentication.`,
      });
    }

    const currentClaims = targetUserRecord.customClaims || {};
    const hasOfficerClaim = Boolean(currentClaims.officer || currentClaims.departmentId);
    const fallbackRole = hasOfficerClaim ? 'officer' : 'citizen';

    // 1. Remove admin claim, preserving officer/department claims
    const { admin: _, role: __, ...remainingClaims } = currentClaims as any;
    await auth.setCustomUserClaims(targetUid, {
      ...remainingClaims,
      role: fallbackRole,
      admin: false,
      officer: hasOfficerClaim,
    });

    // 2. Invalidate refresh tokens
    try {
      await auth.revokeRefreshTokens(targetUid);
    } catch (revErr) {
      console.warn('[CivicResolve Server API] Notice revoking refresh tokens:', revErr);
    }

    // 3. Update Firestore user profile
    await db.collection('users').doc(targetUid).set(
      {
        role: fallbackRole,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 4. Record audit log
    const auditEntry = {
      actorUid: adminCaller.uid,
      actorEmail: adminCaller.email || '',
      targetUid,
      targetEmail: targetUserRecord.email || '',
      targetName: targetUserRecord.displayName || targetUserRecord.email || 'User',
      action: 'REVOKE_ADMIN',
      previousRole: 'admin',
      newRole: fallbackRole,
      timestamp: FieldValue.serverTimestamp(),
    };
    await db.collection('adminAuditLogs').add(auditEntry);

    console.log(`[CivicResolve Server API] Revoked administrator access for UID ${targetUid} by ${adminCaller.email}`);

    return sendJsonResponse(res, 200, {
      success: true,
      message: `Successfully revoked administrator access for ${targetUserRecord.email || targetUid}.`,
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handleRevokeAdmin:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Internal server error while revoking administrator access.',
    });
  }
}

/**
 * Retrieves the recent administration audit logs.
 */
async function handleGetAuditLogs(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    return sendJsonResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminCaller = await verifyAdminCaller(req, res);
  if (!adminCaller) return;

  try {
    const db = getFirestore();
    const snap = await db
      .collection('adminAuditLogs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const logs = snap.docs.map((d) => {
      const data = d.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString();
      return {
        id: d.id,
        ...data,
        timestamp,
      };
    });

    return sendJsonResponse(res, 200, {
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error('[CivicResolve Server API] Error in handleGetAuditLogs:', err);
    return sendJsonResponse(res, 500, {
      success: false,
      error: err.message || 'Failed to fetch administrator audit logs.',
    });
  }
}

/**
 * Main HTTP request dispatcher for /api/admin/* endpoints.
 */
function handleAdminApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = req.url?.split('?')[0];

  if (!url || !url.startsWith('/api/admin/')) {
    return next();
  }

  if (!initFirebaseAdmin()) {
    return sendJsonResponse(res, 503, {
      success: false,
      error: 'Firebase Admin SDK is not configured on this server (serviceAccountKey.json required).',
    });
  }

  if (url === '/api/admin/assign-officer') {
    handleAssignOfficer(req, res);
  } else if (url === '/api/admin/remove-officer') {
    handleRemoveOfficer(req, res);
  } else if (url === '/api/admin/toggle-officer-active') {
    handleToggleOfficerActive(req, res);
  } else if (url === '/api/admin/promote-admin') {
    handlePromoteAdmin(req, res);
  } else if (url === '/api/admin/revoke-admin') {
    handleRevokeAdmin(req, res);
  } else if (url === '/api/admin/audit-logs') {
    handleGetAuditLogs(req, res);
  } else {
    sendJsonResponse(res, 404, { success: false, error: 'Endpoint not found.' });
  }
}

export function adminApiPlugin(): Plugin {
  return {
    name: 'civicresolve-admin-api',
    configureServer(server) {
      server.middlewares.use(handleAdminApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleAdminApi);
    },
  };
}
