# CivicResolve — AI-Powered Civic Issue Reporting and Resolution Platform

> **PromptWars x GDG On-Campus PSG iTech Hackathon**  
> *Tagline: Report. Resolve. Rebuild.*  
> *Firebase Project:* `civicresolve-f212`

---

## 🏛️ Executive Summary

Everyday civic disruptions—crater potholes, contaminated water leakage, broken streetlights, overflowing waste, and choked storm drains—diminish the safety, hygiene, and livability of neighborhoods.

**CivicResolve** bridges the divide between citizens and municipal authorities. It simplifies reporting through automated AI classification, priority detection, department routing, and an end-to-end transparent lifecycle audit trail on Google Cloud.

---

## 🗄️ Phase 3: Cloud Firestore Integration

CivicResolve is fully integrated with **Google Cloud Firestore (Firebase Web SDK v10+)** using modular services, reactive real-time listeners, and zero-trust security rules.

### Firestore Collections & Data Model

#### 1. Citizen & Staff Profiles: `users/{uid}`
- `uid`: Unique Firebase Auth UID
- `fullName`: Display name or citizen identity
- `email`: Authenticated email address
- `photoURL`: Google avatar or uploaded profile image
- `role`: Strictly `'citizen'` upon creation; never self-assignable to `'admin'`
- `ward`: Residential municipal ward / electoral zone
- `createdAt`: Firestore server timestamp
- `updatedAt`: Firestore server timestamp

#### 2. Civic Complaints: `complaints/{complaintId}`
- `complaintId`: Human-readable identifier (e.g. `CR-2026-1042`)
- `userId`: Cryptographic Firebase Auth UID of the reporting citizen
- `userName`: Full name of reporting citizen
- `title`: Summary of civic disruption
- `description`: Detailed field description
- `category`: Civic category:
  - `Roads and Potholes`
  - `Garbage and Sanitation`
  - `Water Leakage`
  - `Streetlights and Electricity`
  - `Drainage and Sewage`
  - `Public Infrastructure`
  - `Other`
- `location`: Exact landmark or street address
- `ward`: Assigned municipal ward
- `priority`: Initialized to `'Medium'` (`Low`, `Medium`, `High`, `Critical`)
- `status`: Initialized to `'Reported'` (`Reported`, `Under Review`, `Assigned`, `In Progress`, `Resolved`)
- `assignedDepartment`: Initialized to `null` until delegated by an administrator
- `aiAnalysis`: Triage recommendation object
- `imageURL`: Optional photo attachment reference
- `createdAt`: Firestore server timestamp
- `updatedAt`: Firestore server timestamp

#### 3. Audit History Subcollection: `complaints/{complaintId}/history/{historyId}`
- `action`: Audit event (e.g. `'Complaint Registered'`, `'Status Progression'`, `'Department Allocation'`)
- `previousStatus`: Status prior to transition
- `newStatus`: New lifecycle status
- `updatedBy`: Name and role of actor
- `timestamp`: Firestore server timestamp
- `remarks`: Official field or inspection note

---

## 🔒 Firestore Security Rules (`firestore.rules`)

Rules enforce zero-trust role segregation:
1. **Creation**: Authenticated citizens can create complaints only with `request.resource.data.userId == request.auth.uid`, `status == 'Reported'`, `priority == 'Medium'`, and `assignedDepartment == null`.
2. **Citizen Read Isolation**: Citizens can read **only** their own complaints (`resource.data.userId == request.auth.uid`). They can never read other citizens' private records.
3. **Admin Privilege Enforcement**: Only verified administrators possessing cryptographic Firebase custom claims (`request.auth.token.role == 'admin'` or `request.auth.token.admin == true`) can read all complaints, update complaint statuses, and assign municipal departments.
4. **Immutable History**: Status history subcollection entries are append-only and cannot be altered or deleted.
5. **Profile Protection**: Users cannot modify their `role`, `uid`, or `createdAt` fields in `users/{uid}`.

### Deploying Security Rules & Indexes via Firebase CLI

```bash
# Login to Firebase
firebase login

# Set active project
firebase use civicresolve-f212

# Deploy Firestore Security Rules and Composite Indexes
firebase deploy --only firestore:rules,firestore:indexes
```

---

## ⚙️ Environment Configuration

Set up `.env.local` with your Firebase Web credentials:

```env
VITE_APP_NAME=CivicResolve
VITE_APP_TAGLINE="Report. Resolve. Rebuild."

VITE_FIREBASE_API_KEY=AIzaSy...your_web_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=civicresolve-f212d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=civicresolve-f212d
VITE_FIREBASE_STORAGE_BUCKET=civicresolve-f212d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
```

---

## 🚀 Getting Started

```bash
# 1. Install Dependencies
npm install

# 2. Run Local Development Server
npm run dev

# 3. Build for Production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
