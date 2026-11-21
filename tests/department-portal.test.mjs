import test from 'node:test';
import assert from 'node:assert';

/**
 * Logic under test representing the Department Portal security & authorization engine.
 */

// 1. Role validation for route access
function canAccessDepartmentPortal(user) {
  if (!user) return false;
  const isOfficer = user.role === 'officer' || user.isCustomClaimOfficer === true;
  const isAdmin = user.role === 'admin' || user.isCustomClaimAdmin === true;
  return isOfficer || isAdmin;
}

// 2. Complaint visibility query for field officers
function filterOfficerComplaints(complaints, officerUid) {
  if (!officerUid) return [];
  return complaints.filter(
    (c) =>
      c.primaryOfficerId === officerUid ||
      c.primaryOfficerUid === officerUid ||
      (Array.isArray(c.supportingOfficerIds) && c.supportingOfficerIds.includes(officerUid)) ||
      (Array.isArray(c.supportingOfficerUids) && c.supportingOfficerUids.includes(officerUid))
  );
}

// 3. Resolution submission authorization
function canSubmitResolution(complaint, officerUid, userRole = 'officer') {
  if (!complaint || !officerUid) return false;
  if (userRole === 'admin') return true;
  // Supporting officers cannot submit final resolution - strictly Primary Officer only
  return complaint.primaryOfficerId === officerUid || complaint.primaryOfficerUid === officerUid;
}

function submitComplaintResolution(complaint, officerUid, officerName, { summary, actionsTaken, evidenceUrl }) {
  if (!canSubmitResolution(complaint, officerUid)) {
    throw new Error('Unauthorized: Only designated Primary Officer can submit final resolution.');
  }

  if (!summary || summary.trim().length < 5) {
    throw new Error('Resolution summary must be at least 5 characters.');
  }
  if (!actionsTaken || actionsTaken.trim().length < 5) {
    throw new Error('Actions taken must be at least 5 characters.');
  }

  const now = new Date().toISOString();
  return {
    ...complaint,
    status: 'Resolution Submitted',
    updatedAt: now,
    resolution: {
      summary: summary.trim(),
      actionsTaken: actionsTaken.trim(),
      evidenceUrl: evidenceUrl || null,
      submittedByUid: officerUid,
      submittedByName: officerName,
      submittedAt: now,
    },
  };
}

// 4. Admin verification logic
function verifyComplaintResolution(complaint, { isAdmin, verifiedBy, approved, rejectionReason }) {
  if (!isAdmin) {
    throw new Error('Permission Denied: Administrator role required to verify resolutions.');
  }
  if (complaint.status !== 'Resolution Submitted') {
    throw new Error('Invalid State: Can only verify complaints with Resolution Submitted status.');
  }

  const now = new Date().toISOString();
  if (approved) {
    return {
      ...complaint,
      status: 'Resolved',
      updatedAt: now,
      resolution: {
        ...(complaint.resolution || {}),
        approvedAt: now,
        approvedBy: verifiedBy,
      },
    };
  } else {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('Rejection reason is required when sending complaint back for rework.');
    }
    return {
      ...complaint,
      status: 'In Progress',
      updatedAt: now,
      resolution: {
        ...(complaint.resolution || {}),
        rejectedAt: now,
        rejectedBy: verifiedBy,
        rejectionReason: rejectionReason.trim(),
      },
    };
  }
}

// 5. In-app notification payload generator
function buildNotificationPayload({ recipientUid, type, title, message, complaintId, linkUrl }) {
  if (!recipientUid || !type || !title || !message) {
    throw new Error('Invalid notification payload: Missing required fields.');
  }
  return {
    recipientUid,
    type,
    title,
    message,
    complaintId: complaintId || null,
    linkUrl: linkUrl || (complaintId ? `/complaints/${complaintId}` : '/'),
    read: false,
    createdAt: new Date().toISOString(),
  };
}

// ==========================================
// TEST SUITE: DEPARTMENT PORTAL & GOVERNANCE
// ==========================================

test('Department Portal: Citizen cannot access department portal routes (role validation)', () => {
  const citizen = { uid: 'cit-01', role: 'citizen', email: 'citizen@example.com' };
  const unauthenticated = null;
  const officer = { uid: 'off-01', role: 'officer', email: 'officer@pwd.gov' };
  const admin = { uid: 'adm-01', role: 'admin', email: 'admin@civic.gov' };

  assert.strictEqual(canAccessDepartmentPortal(citizen), false, 'Citizen must be denied department access');
  assert.strictEqual(canAccessDepartmentPortal(unauthenticated), false, 'Guest must be denied department access');
  assert.strictEqual(canAccessDepartmentPortal(officer), true, 'Officer must be granted department access');
  assert.strictEqual(canAccessDepartmentPortal(admin), true, 'Admin must be granted department access');
});

test('Department Portal: Officer can view assigned complaints (primary or supporting)', () => {
  const officerUid = 'officer-ramanathan';
  const supportingUid = 'officer-priya';
  const otherOfficerUid = 'officer-unrelated';

  const dataset = [
    {
      id: 'CMP-001',
      title: 'Pothole on Main Road',
      primaryOfficerId: officerUid,
      supportingOfficerIds: [supportingUid],
      status: 'Assigned',
    },
    {
      id: 'CMP-002',
      title: 'Water valve leakage',
      primaryOfficerId: 'officer-water-lead',
      supportingOfficerIds: [officerUid],
      status: 'In Progress',
    },
    {
      id: 'CMP-003',
      title: 'Broken streetlight on East St',
      primaryOfficerId: otherOfficerUid,
      supportingOfficerIds: [],
      status: 'Reported',
    },
  ];

  const ramanathanComplaints = filterOfficerComplaints(dataset, officerUid);
  assert.strictEqual(ramanathanComplaints.length, 2, 'Officer should see both primary and supporting tickets');
  assert.strictEqual(ramanathanComplaints.some((c) => c.id === 'CMP-001'), true);
  assert.strictEqual(ramanathanComplaints.some((c) => c.id === 'CMP-002'), true);
  assert.strictEqual(ramanathanComplaints.some((c) => c.id === 'CMP-003'), false, 'Cannot see unassigned ticket');

  const priyaComplaints = filterOfficerComplaints(dataset, supportingUid);
  assert.strictEqual(priyaComplaints.length, 1);
  assert.strictEqual(priyaComplaints[0].id, 'CMP-001');
});

test('Department Portal: Supporting officer cannot submit final resolution (permission check)', () => {
  const complaint = {
    id: 'CMP-101',
    title: 'Severe drainage blockage',
    primaryOfficerId: 'officer-lead-1',
    supportingOfficerIds: ['officer-supporting-2'],
    status: 'In Progress',
  };

  const supportingUid = 'officer-supporting-2';
  assert.strictEqual(
    canSubmitResolution(complaint, supportingUid, 'officer'),
    false,
    'Supporting officer must NOT be permitted to submit resolution'
  );

  assert.throws(
    () => {
      submitComplaintResolution(complaint, supportingUid, 'Officer Priya', {
        summary: 'Cleared debris',
        actionsTaken: 'Removed 50kg silt',
      });
    },
    /Unauthorized: Only designated Primary Officer can submit final resolution/
  );
});

test('Department Portal: Primary officer can submit resolution', () => {
  const complaint = {
    id: 'CMP-102',
    title: 'Pothole resurfacing',
    primaryOfficerId: 'officer-lead-1',
    supportingOfficerIds: ['officer-supporting-2'],
    status: 'In Progress',
  };

  const primaryUid = 'officer-lead-1';
  assert.strictEqual(canSubmitResolution(complaint, primaryUid, 'officer'), true);

  const updatedComplaint = submitComplaintResolution(complaint, primaryUid, 'Officer Ramanathan', {
    summary: 'Pothole asphalt cold-mix patched and steam-rolled',
    actionsTaken: 'Cleaned loose gravel, laid bitumen binder, compacted asphalt patch flush with road surface.',
    evidenceUrl: 'https://storage.googleapis.com/test-bucket/after-patch.jpg',
  });

  assert.strictEqual(updatedComplaint.status, 'Resolution Submitted');
  assert.ok(updatedComplaint.resolution);
  assert.strictEqual(updatedComplaint.resolution.submittedByUid, primaryUid);
  assert.strictEqual(updatedComplaint.resolution.evidenceUrl, 'https://storage.googleapis.com/test-bucket/after-patch.jpg');
});

test('Department Portal: Admin can approve or reject resolution with reason', () => {
  const pendingComplaint = {
    id: 'CMP-200',
    status: 'Resolution Submitted',
    primaryOfficerId: 'officer-lead-1',
    resolution: {
      summary: 'Streetlight luminaire replaced',
      actionsTaken: 'Installed new 90W LED head unit',
      submittedByUid: 'officer-lead-1',
      submittedByName: 'Officer K. Raman',
      submittedAt: new Date().toISOString(),
    },
  };

  // 1. Admin Approval
  const approvedComplaint = verifyComplaintResolution(pendingComplaint, {
    isAdmin: true,
    verifiedBy: 'Commissioner Office',
    approved: true,
  });

  assert.strictEqual(approvedComplaint.status, 'Resolved');
  assert.strictEqual(approvedComplaint.resolution.approvedBy, 'Commissioner Office');
  assert.ok(approvedComplaint.resolution.approvedAt);

  // 2. Admin Rejection (Rework Request)
  const rejectedComplaint = verifyComplaintResolution(pendingComplaint, {
    isAdmin: true,
    verifiedBy: 'Operations Superintendent',
    approved: false,
    rejectionReason: 'Exposed wire conduit base still needs protective PVC sealing.',
  });

  assert.strictEqual(rejectedComplaint.status, 'In Progress');
  assert.strictEqual(
    rejectedComplaint.resolution.rejectionReason,
    'Exposed wire conduit base still needs protective PVC sealing.'
  );
  assert.strictEqual(rejectedComplaint.resolution.rejectedBy, 'Operations Superintendent');

  // 3. Unauthorized verification attempt
  assert.throws(() => {
    verifyComplaintResolution(pendingComplaint, {
      isAdmin: false,
      verifiedBy: 'Citizen Hacker',
      approved: true,
    });
  }, /Permission Denied: Administrator role required/);
});

test('Department Portal: In-app notification triggers are generated with correct payload', () => {
  // Assignment notification to officer
  const assignNotification = buildNotificationPayload({
    recipientUid: 'officer-ramanathan',
    type: 'assignment',
    title: 'New Complaint Assigned: Pothole on Cross Cut Rd',
    message: 'You have been designated as Primary Lead Officer by Municipal Administration.',
    complaintId: 'CMP-888',
    linkUrl: '/department/complaints/CMP-888',
  });

  assert.strictEqual(assignNotification.recipientUid, 'officer-ramanathan');
  assert.strictEqual(assignNotification.type, 'assignment');
  assert.strictEqual(assignNotification.read, false);
  assert.strictEqual(assignNotification.complaintId, 'CMP-888');
  assert.strictEqual(assignNotification.linkUrl, '/department/complaints/CMP-888');

  // Resolution submitted notification to admin
  const resolutionNotification = buildNotificationPayload({
    recipientUid: 'admin-division',
    type: 'resolution_submitted',
    title: 'Resolution Submitted for Verification',
    message: 'Officer Ramanathan completed work on CMP-888. Verification required.',
    complaintId: 'CMP-888',
    linkUrl: '/admin/complaints',
  });

  assert.strictEqual(resolutionNotification.type, 'resolution_submitted');
  assert.strictEqual(resolutionNotification.read, false);

  // Rejection notification with rework instructions to officer
  const reworkNotification = buildNotificationPayload({
    recipientUid: 'officer-ramanathan',
    type: 'resolution_rejected',
    title: 'Rework Requested on Complaint CMP-888',
    message: 'Admin requested rework: Missing photo evidence of asphalt compaction.',
    complaintId: 'CMP-888',
    linkUrl: '/department/complaints/CMP-888',
  });

  assert.strictEqual(reworkNotification.type, 'resolution_rejected');
  assert.ok(reworkNotification.message.includes('Missing photo evidence'));
});

test('Department Portal: Citizen can submit and track complaints strictly limited to own UID', () => {
  const citizenA = { uid: 'cit-alice', role: 'citizen' };
  const citizenB = { uid: 'cit-bob', role: 'citizen' };

  const complaints = [
    { id: 'CMP-1', userId: 'cit-alice', title: 'Alice Issue 1' },
    { id: 'CMP-2', userId: 'cit-alice', title: 'Alice Issue 2' },
    { id: 'CMP-3', userId: 'cit-bob', title: 'Bob Issue 1' },
  ];

  // Citizen A filter
  const aliceVisible = complaints.filter((c) => c.userId === citizenA.uid);
  assert.strictEqual(aliceVisible.length, 2);
  assert.ok(aliceVisible.every((c) => c.userId === 'cit-alice'));

  // Citizen B filter
  const bobVisible = complaints.filter((c) => c.userId === citizenB.uid);
  assert.strictEqual(bobVisible.length, 1);
  assert.strictEqual(bobVisible[0].id, 'CMP-3');
});

test('Department Portal: Multiple officers in a department with active/deactivated state', () => {
  const deptOfficers = [
    { uid: 'off-1', name: 'Officer A', departmentId: 'roads', active: true },
    { uid: 'off-2', name: 'Officer B', departmentId: 'roads', active: true },
    { uid: 'off-3', name: 'Officer C', departmentId: 'roads', active: false },
  ];

  // Verify multiple officers belong to the same division
  const roadsOfficers = deptOfficers.filter((o) => o.departmentId === 'roads');
  assert.strictEqual(roadsOfficers.length, 3);

  // Active officers available for assignments
  const activeOfficers = roadsOfficers.filter((o) => o.active);
  assert.strictEqual(activeOfficers.length, 2);
  assert.strictEqual(activeOfficers.some((o) => o.uid === 'off-3'), false);
});

test('Department Portal: Both primary and supporting officers can add field inspection notes', () => {
  const complaint = {
    id: 'CMP-500',
    primaryOfficerId: 'off-lead',
    supportingOfficerIds: ['off-supp-1', 'off-supp-2'],
    status: 'In Progress',
    notes: [],
  };

  function addWorkNote(targetComplaint, officerUid, officerName, noteText, evidenceUrl) {
    const isAssigned =
      targetComplaint.primaryOfficerId === officerUid ||
      targetComplaint.supportingOfficerIds.includes(officerUid);
    if (!isAssigned) throw new Error('Unauthorized: Officer is not assigned to this complaint.');

    return {
      ...targetComplaint,
      notes: [
        ...targetComplaint.notes,
        {
          officerUid,
          officerName,
          text: noteText,
          evidenceUrl: evidenceUrl || null,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  // Lead officer note
  const afterLead = addWorkNote(complaint, 'off-lead', 'Lead Officer', 'Initial inspection completed.', 'https://img.jpg');
  assert.strictEqual(afterLead.notes.length, 1);

  // Supporting officer note
  const afterSupp = addWorkNote(afterLead, 'off-supp-1', 'Supporting Officer', 'Bitumen squad arrived on scene.');
  assert.strictEqual(afterSupp.notes.length, 2);

  // Unassigned officer note rejected
  assert.throws(() => {
    addWorkNote(afterSupp, 'off-unassigned', 'Stranger', 'Illegal note');
  }, /Unauthorized: Officer is not assigned to this complaint/);
});

test('Department Portal: Critical complaint triggers emergency alert for administration', () => {
  function checkEmergencyAlert(complaint) {
    if (complaint.priority === 'Critical') {
      return buildNotificationPayload({
        recipientUid: 'admin',
        type: 'critical_alert',
        title: 'Critical Emergency Hazard Alert',
        message: `Emergency reported: ${complaint.title}`,
        complaintId: complaint.id,
      });
    }
    return null;
  }

  const critical = checkEmergencyAlert({ id: 'CRIT-1', title: 'Open electrical manhole flooded', priority: 'Critical' });
  assert.ok(critical);
  assert.strictEqual(critical.type, 'critical_alert');
  assert.strictEqual(critical.recipientUid, 'admin');

  const standard = checkEmergencyAlert({ id: 'NORM-1', title: 'Small pothole', priority: 'Low' });
  assert.strictEqual(standard, null);
});

// ==============================================================
// TEST SUITE: ADMIN OFFICER ASSIGNMENT & ROLE AUTHORIZATION RULES
// ==============================================================

function simulateOfficerAssignment({ callerUser, targetUser, department, registeredUsersDatabase }) {
  // 1. Authorization check: Only verified admin can assign officers
  const isCallerAdmin = callerUser && (callerUser.role === 'admin' || callerUser.isCustomClaimAdmin === true);
  if (!isCallerAdmin) {
    throw new Error('Missing or insufficient permissions: Administrator custom claim or verified admin profile required.');
  }

  // 2. Validate target user exists in registered accounts
  const existingUser = registeredUsersDatabase.find((u) => u.uid === targetUser.uid);
  if (!existingUser) {
    throw new Error(`User with UID "${targetUser.uid}" not found in registered accounts.`);
  }

  // 3. Department update
  const updatedDepartment = {
    ...department,
    officerUids: Array.from(new Set([...(department.officerUids || []), targetUser.uid])),
    updatedAt: new Date().toISOString(),
  };

  // 4. User profile promotion
  const updatedUserProfile = {
    ...existingUser,
    role: 'officer',
    departmentId: department.id,
    departmentName: department.name,
    isOfficerActive: true,
    updatedAt: new Date().toISOString(),
  };

  return {
    department: updatedDepartment,
    userProfile: updatedUserProfile,
  };
}

function simulateCitizenProfileUpdate({ callerUser, targetUid, requestedUpdates }) {
  const isOwner = callerUser && callerUser.uid === targetUid;
  const isAdmin = callerUser && (callerUser.role === 'admin' || callerUser.isCustomClaimAdmin === true);

  if (!isOwner && !isAdmin) {
    throw new Error('Missing or insufficient permissions: Access denied.');
  }

  if (isOwner && !isAdmin) {
    // Non-admin owner CANNOT modify role, departmentId, uid, or createdAt
    if (requestedUpdates.role && requestedUpdates.role !== callerUser.role) {
      throw new Error('Missing or insufficient permissions: Citizens cannot self-elevate roles or grant officer privileges.');
    }
    if (requestedUpdates.departmentId && requestedUpdates.departmentId !== callerUser.departmentId) {
      throw new Error('Missing or insufficient permissions: Citizens cannot assign department membership.');
    }
  }

  return {
    ...callerUser,
    ...requestedUpdates,
    updatedAt: new Date().toISOString(),
  };
}

test('Admin Officer Assignment: Authenticated Admin can assign registered user to department', () => {
  const admin = { uid: 'adm-001', role: 'admin', isCustomClaimAdmin: true, email: 'admin@civic.gov' };
  const candidateCitizen = { uid: 'cit-999', role: 'citizen', email: 'officer.candidate@example.com', fullName: 'K. Ramanathan' };
  const pwdDepartment = { id: 'roads-bridges', name: 'Public Works Department (PWD)', code: 'PWD', officerUids: [] };
  const registeredUsersDb = [admin, candidateCitizen];

  const result = simulateOfficerAssignment({
    callerUser: admin,
    targetUser: candidateCitizen,
    department: pwdDepartment,
    registeredUsersDatabase: registeredUsersDb,
  });

  assert.strictEqual(result.department.officerUids.includes('cit-999'), true);
  assert.strictEqual(result.userProfile.role, 'officer');
  assert.strictEqual(result.userProfile.departmentId, 'roads-bridges');
  assert.strictEqual(result.userProfile.isOfficerActive, true);
});

test('Admin Officer Assignment: Ordinary citizen cannot self-assign officer role or modify department membership', () => {
  const citizen = { uid: 'cit-attacker', role: 'citizen', isCustomClaimAdmin: false, email: 'citizen@example.com' };
  const pwdDepartment = { id: 'roads-bridges', name: 'Public Works Department (PWD)', code: 'PWD', officerUids: [] };

  // 1. Citizen cannot call officer assignment
  assert.throws(() => {
    simulateOfficerAssignment({
      callerUser: citizen,
      targetUser: citizen,
      department: pwdDepartment,
      registeredUsersDatabase: [citizen],
    });
  }, /Missing or insufficient permissions/);

  // 2. Citizen cannot modify own role in profile
  assert.throws(() => {
    simulateCitizenProfileUpdate({
      callerUser: citizen,
      targetUid: citizen.uid,
      requestedUpdates: { role: 'officer', departmentId: 'roads-bridges' },
    });
  }, /Missing or insufficient permissions: Citizens cannot self-elevate roles/);
});

test('Admin Officer Assignment: Rejects assignment for non-existent or fake accounts', () => {
  const admin = { uid: 'adm-001', role: 'admin', isCustomClaimAdmin: true };
  const fakeTarget = { uid: 'fake-ghost-uid', email: 'ghost@nowhere.com' };
  const pwdDepartment = { id: 'roads-bridges', name: 'PWD', officerUids: [] };

  assert.throws(() => {
    simulateOfficerAssignment({
      callerUser: admin,
      targetUser: fakeTarget,
      department: pwdDepartment,
      registeredUsersDatabase: [], // Empty user database
    });
  }, /not found in registered accounts/);
});

test('Complaint Assignment: Preserves complaint fields, assignment history, and supporting officers', () => {
  const originalComplaint = {
    id: 'CMP-777',
    userId: 'cit-author-123',
    userName: 'Anita Sharma',
    title: 'Severe crater pothole causing vehicle damage',
    description: 'Deep 3-foot pothole on main crossroad near Apollo clinic.',
    category: 'Potholes & Road Damage',
    location: 'Cross Cut Road, Sector 4',
    ward: 'Ward 14 - Central Zone',
    priority: 'Critical',
    status: 'Reported',
    imageUrl: 'https://storage.googleapis.com/test-bucket/pothole.jpg',
    aiAnalysis: { category: 'Potholes & Road Damage', priority: 'Critical', estimatedCost: '$450' },
    createdAt: '2026-11-20T10:00:00.000Z',
  };

  const assignmentInput = {
    department: 'Public Works Department (PWD)',
    departmentId: 'roads-bridges',
    primaryOfficer: { uid: 'off-lead-1', name: 'Officer K. Ramanathan', email: 'ramanathan@pwd.gov' },
    supportingOfficers: [
      { uid: 'off-supp-1', name: 'Officer Priya S', email: 'priya@pwd.gov' },
      { uid: 'off-supp-2', name: 'Officer Dev Raj', email: 'dev@pwd.gov' },
    ],
    remarks: 'Immediate asphalt patching dispatch authorized by Commissioner.',
    assignedBy: 'Commissioner Office',
  };

  function applyComplaintAssignment(complaint, assignment) {
    return {
      ...complaint, // Preserves title, description, location, ward, category, imageUrl, priority, userId, userName, etc.
      assignedDepartment: assignment.department,
      departmentId: assignment.departmentId || null,
      primaryOfficerId: assignment.primaryOfficer.uid,
      primaryOfficerName: assignment.primaryOfficer.name,
      primaryOfficerEmail: assignment.primaryOfficer.email,
      supportingOfficerIds: (assignment.supportingOfficers || []).map((o) => o.uid),
      supportingOfficers: assignment.supportingOfficers || [],
      status: 'Assigned',
      updatedAt: new Date().toISOString(),
    };
  }

  const assignedComplaint = applyComplaintAssignment(originalComplaint, assignmentInput);

  // Verification 1: Core complaint details completely preserved
  assert.strictEqual(assignedComplaint.id, originalComplaint.id);
  assert.strictEqual(assignedComplaint.title, originalComplaint.title);
  assert.strictEqual(assignedComplaint.description, originalComplaint.description);
  assert.strictEqual(assignedComplaint.userId, originalComplaint.userId);
  assert.strictEqual(assignedComplaint.userName, originalComplaint.userName);
  assert.strictEqual(assignedComplaint.category, originalComplaint.category);
  assert.strictEqual(assignedComplaint.location, originalComplaint.location);
  assert.strictEqual(assignedComplaint.ward, originalComplaint.ward);
  assert.strictEqual(assignedComplaint.priority, 'Critical');
  assert.strictEqual(assignedComplaint.imageUrl, originalComplaint.imageUrl);
  assert.deepStrictEqual(assignedComplaint.aiAnalysis, originalComplaint.aiAnalysis);
  assert.strictEqual(assignedComplaint.createdAt, originalComplaint.createdAt);

  // Verification 2: Assignment fields correctly set
  assert.strictEqual(assignedComplaint.status, 'Assigned');
  assert.strictEqual(assignedComplaint.assignedDepartment, 'Public Works Department (PWD)');
  assert.strictEqual(assignedComplaint.primaryOfficerId, 'off-lead-1');
  assert.strictEqual(assignedComplaint.primaryOfficerName, 'Officer K. Ramanathan');
  assert.strictEqual(assignedComplaint.supportingOfficerIds.length, 2);
  assert.strictEqual(assignedComplaint.supportingOfficers.length, 2);
  assert.strictEqual(assignedComplaint.supportingOfficerIds[0], 'off-supp-1');
  assert.strictEqual(assignedComplaint.supportingOfficerIds[1], 'off-supp-2');
});

test('Officer Synchronization: Officer sees complaints assigned via primaryOfficerId or primaryOfficerUid', () => {
  const officerUid = 'officer-joanna';
  const complaints = [
    {
      id: 'CMP-A',
      title: 'Garbage dump overflow',
      primaryOfficerUid: officerUid,
      status: 'Assigned',
    },
    {
      id: 'CMP-B',
      title: 'Sanitation bin damaged',
      primaryOfficerId: officerUid,
      status: 'In Progress',
    },
    {
      id: 'CMP-C',
      title: 'Streetlight pole broken',
      primaryOfficerId: 'other-officer',
      status: 'Reported',
    },
  ];

  const visible = filterOfficerComplaints(complaints, officerUid);
  assert.strictEqual(visible.length, 2);
  assert.ok(visible.some((c) => c.id === 'CMP-A'));
  assert.ok(visible.some((c) => c.id === 'CMP-B'));
  assert.strictEqual(visible.some((c) => c.id === 'CMP-C'), false);
});

test('Admin Authentication: Admin custom claims are preserved and not demoted when officer operations run', () => {
  const adminUser = {
    uid: 'adm-jonathan',
    email: 'jonathandw2008@gmail.com',
    role: 'admin',
    isCustomClaimAdmin: true,
  };

  // Simulating computeEffectiveUser
  function computeEffectiveUser(baseUser, profile) {
    const isAdmin = Boolean(
      baseUser.isCustomClaimAdmin ||
      profile?.role === 'admin' ||
      baseUser.email?.toLowerCase() === 'jonathandw2008@gmail.com'
    );
    const isOfficer = Boolean(
      baseUser.isCustomClaimOfficer ||
      profile?.role === 'officer' ||
      Boolean(profile?.departmentId)
    );
    const effectiveRole = isAdmin ? 'admin' : isOfficer ? 'officer' : 'citizen';
    return {
      ...baseUser,
      role: effectiveRole,
      isCustomClaimAdmin: isAdmin,
      isCustomClaimOfficer: isOfficer,
    };
  }

  // Profile has departmentId assigned but user is Admin
  const profileWithDept = {
    role: 'admin',
    departmentId: 'roads-bridges',
    departmentName: 'PWD',
  };

  const resolved = computeEffectiveUser(adminUser, profileWithDept);
  assert.strictEqual(resolved.role, 'admin', 'Admin must remain admin even if assigned department');
  assert.strictEqual(resolved.isCustomClaimAdmin, true);
  assert.strictEqual(resolved.isCustomClaimOfficer, true, 'Admin can also have officer permissions');
});




// ==============================================================
// TEST SUITE: MULTI-ADMIN USER MANAGEMENT & AUDIT LOGGING
// ==============================================================

function simulatePromoteAdmin({ actorUser, targetUserRecord }) {
  if (!actorUser || (actorUser.role !== 'admin' && !actorUser.isCustomClaimAdmin)) {
    throw new Error('Missing or insufficient permissions: Administrator authorization required.');
  }
  if (!targetUserRecord || !targetUserRecord.uid) {
    throw new Error('Target user does not exist.');
  }

  // Preserve existing claims (such as departmentId or officer: true)
  const existingClaims = targetUserRecord.customClaims || {};
  const updatedClaims = {
    ...existingClaims,
    role: 'admin',
    admin: true,
  };

  const auditEntry = {
    id: `audit-${Date.now()}`,
    action: 'PROMOTE_ADMIN',
    actorUid: actorUser.uid,
    actorEmail: actorUser.email,
    targetUid: targetUserRecord.uid,
    targetEmail: targetUserRecord.email,
    targetName: targetUserRecord.fullName || targetUserRecord.email,
    previousRole: targetUserRecord.role || 'citizen',
    newRole: 'admin',
    timestamp: new Date().toISOString(),
  };

  const updatedTargetProfile = {
    ...targetUserRecord,
    role: 'admin',
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedClaims,
    updatedTargetProfile,
    auditEntry,
    tokensRevoked: true,
  };
}

function simulateRevokeAdmin({ actorUser, targetUserRecord }) {
  if (!actorUser || (actorUser.role !== 'admin' && !actorUser.isCustomClaimAdmin)) {
    throw new Error('Missing or insufficient permissions: Administrator authorization required.');
  }
  if (!targetUserRecord || !targetUserRecord.uid) {
    throw new Error('Target user does not exist.');
  }

  // Self-revocation lockout guard
  if (actorUser.uid === targetUserRecord.uid) {
    throw new Error('Safety guard: You cannot revoke your own administrator privileges.');
  }

  // Check fallback role: preserve officer/department claims if present
  const existingClaims = targetUserRecord.customClaims || {};
  const hasOfficerMembership = Boolean(existingClaims.officer || targetUserRecord.departmentId);
  const fallbackRole = hasOfficerMembership ? 'officer' : 'citizen';

  const updatedClaims = {
    ...existingClaims,
    role: fallbackRole,
    admin: false,
  };

  const auditEntry = {
    id: `audit-${Date.now()}`,
    action: 'REVOKE_ADMIN',
    actorUid: actorUser.uid,
    actorEmail: actorUser.email,
    targetUid: targetUserRecord.uid,
    targetEmail: targetUserRecord.email,
    targetName: targetUserRecord.fullName || targetUserRecord.email,
    previousRole: 'admin',
    newRole: fallbackRole,
    timestamp: new Date().toISOString(),
  };

  const updatedTargetProfile = {
    ...targetUserRecord,
    role: fallbackRole,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedClaims,
    updatedTargetProfile,
    auditEntry,
    tokensRevoked: true,
  };
}

test('Multi-Admin Promotion: Authenticated Admin can promote registered citizen while preserving claims', () => {
  const adminActor = { uid: 'adm-001', role: 'admin', isCustomClaimAdmin: true, email: 'admin@civic.gov' };
  const targetCitizen = {
    uid: 'cit-555',
    email: 'newadmin@civic.gov',
    fullName: 'Jane Doe',
    role: 'citizen',
    customClaims: { citizen: true },
  };

  const result = simulatePromoteAdmin({
    actorUser: adminActor,
    targetUserRecord: targetCitizen,
  });

  assert.strictEqual(result.updatedClaims.role, 'admin');
  assert.strictEqual(result.updatedClaims.admin, true);
  assert.strictEqual(result.updatedClaims.citizen, true, 'Existing claims must be preserved');
  assert.strictEqual(result.updatedTargetProfile.role, 'admin');
  assert.strictEqual(result.tokensRevoked, true);
  assert.strictEqual(result.auditEntry.action, 'PROMOTE_ADMIN');
  assert.strictEqual(result.auditEntry.actorUid, 'adm-001');
  assert.strictEqual(result.auditEntry.targetUid, 'cit-555');
  assert.strictEqual(result.auditEntry.previousRole, 'citizen');
  assert.strictEqual(result.auditEntry.newRole, 'admin');
});

test('Multi-Admin Promotion: Promoting Department Officer to Admin retains department and officer claims', () => {
  const adminActor = { uid: 'adm-001', role: 'admin', isCustomClaimAdmin: true, email: 'admin@civic.gov' };
  const targetOfficer = {
    uid: 'off-777',
    email: 'chief.officer@pwd.gov',
    fullName: 'Chief Officer Ramanathan',
    role: 'officer',
    departmentId: 'roads-bridges',
    customClaims: { role: 'officer', officer: true, departmentId: 'roads-bridges' },
  };

  const result = simulatePromoteAdmin({
    actorUser: adminActor,
    targetUserRecord: targetOfficer,
  });

  assert.strictEqual(result.updatedClaims.role, 'admin');
  assert.strictEqual(result.updatedClaims.admin, true);
  assert.strictEqual(result.updatedClaims.officer, true, 'Officer claim preserved');
  assert.strictEqual(result.updatedClaims.departmentId, 'roads-bridges', 'DepartmentId claim preserved');
  assert.strictEqual(result.updatedTargetProfile.role, 'admin');
});

test('Multi-Admin Revocation: Safety guard strictly prevents self-revocation', () => {
  const adminActor = { uid: 'adm-current', role: 'admin', isCustomClaimAdmin: true, email: 'admin@civic.gov' };
  const sameAdminRecord = {
    uid: 'adm-current',
    email: 'admin@civic.gov',
    fullName: 'Current Admin',
    role: 'admin',
    customClaims: { role: 'admin', admin: true },
  };

  assert.throws(
    () => {
      simulateRevokeAdmin({
        actorUser: adminActor,
        targetUserRecord: sameAdminRecord,
      });
    },
    /Safety guard: You cannot revoke your own administrator privileges/
  );
});

test('Multi-Admin Revocation: Revoking admin on officer falls back to officer role and preserves department', () => {
  const adminActor = { uid: 'adm-super', role: 'admin', isCustomClaimAdmin: true, email: 'super@civic.gov' };
  const targetAdminOfficer = {
    uid: 'adm-off-888',
    email: 'officer.admin@pwd.gov',
    fullName: 'Officer Admin',
    role: 'admin',
    departmentId: 'sanitation-waste',
    customClaims: { role: 'admin', admin: true, officer: true, departmentId: 'sanitation-waste' },
  };

  const result = simulateRevokeAdmin({
    actorUser: adminActor,
    targetUserRecord: targetAdminOfficer,
  });

  assert.strictEqual(result.updatedClaims.admin, false);
  assert.strictEqual(result.updatedClaims.role, 'officer');
  assert.strictEqual(result.updatedClaims.departmentId, 'sanitation-waste');
  assert.strictEqual(result.updatedTargetProfile.role, 'officer');
  assert.strictEqual(result.auditEntry.action, 'REVOKE_ADMIN');
  assert.strictEqual(result.auditEntry.previousRole, 'admin');
  assert.strictEqual(result.auditEntry.newRole, 'officer');
});

test('Multi-Admin Revocation: Revoking admin on citizen falls back to citizen role', () => {
  const adminActor = { uid: 'adm-super', role: 'admin', isCustomClaimAdmin: true, email: 'super@civic.gov' };
  const targetPureAdmin = {
    uid: 'adm-pure-999',
    email: 'exadmin@civic.gov',
    fullName: 'Former Admin',
    role: 'admin',
    customClaims: { role: 'admin', admin: true },
  };

  const result = simulateRevokeAdmin({
    actorUser: adminActor,
    targetUserRecord: targetPureAdmin,
  });

  assert.strictEqual(result.updatedClaims.admin, false);
  assert.strictEqual(result.updatedClaims.role, 'citizen');
  assert.strictEqual(result.updatedTargetProfile.role, 'citizen');
  assert.strictEqual(result.auditEntry.previousRole, 'admin');
  assert.strictEqual(result.auditEntry.newRole, 'citizen');
});

test('Multi-Admin Access Guard: Citizen cannot promote or revoke administrators', () => {
  const citizenActor = { uid: 'cit-attacker', role: 'citizen', isCustomClaimAdmin: false, email: 'attacker@evil.com' };
  const targetCitizen = { uid: 'cit-victim', email: 'victim@civic.gov', role: 'citizen' };

  assert.throws(
    () => {
      simulatePromoteAdmin({ actorUser: citizenActor, targetUserRecord: targetCitizen });
    },
    /Missing or insufficient permissions: Administrator authorization required/
  );

  assert.throws(
    () => {
      simulateRevokeAdmin({ actorUser: citizenActor, targetUserRecord: targetCitizen });
    },
    /Missing or insufficient permissions: Administrator authorization required/
  );
});

test('Multi-Admin Audit Log: Audit log entries are strictly immutable (no updates or deletes)', () => {
  function enforceAuditImmutability(operation) {
    if (operation === 'update' || operation === 'delete') {
      throw new Error('Permission Denied: Audit log records are cryptographically immutable.');
    }
    return true;
  }

  assert.strictEqual(enforceAuditImmutability('read'), true);
  assert.strictEqual(enforceAuditImmutability('create'), true);

  assert.throws(() => enforceAuditImmutability('update'), /Audit log records are cryptographically immutable/);
  assert.throws(() => enforceAuditImmutability('delete'), /Audit log records are cryptographically immutable/);
});
