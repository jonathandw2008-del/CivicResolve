# CivicResolve
## AI-Powered Civic Issue Reporting and Resolution Platform

### 1. Project Overview

CivicResolve is an AI-powered civic issue management platform designed to improve how citizens report public infrastructure problems and how municipal teams manage and resolve them.

Traditional civic complaint systems can involve manual reporting, delayed assignment, limited progress visibility, and inefficient coordination between departments.

CivicResolve addresses these challenges through an integrated platform connecting citizens, municipal administrators, and department officers in a transparent complaint-resolution workflow.

The platform uses Google Gemini AI to analyse reported issues, assess urgency, classify complaints, and recommend the appropriate department.

### 2. Problem Statement

Citizens frequently encounter civic infrastructure problems such as:
- Potholes and damaged roads
- Garbage accumulation
- Broken streetlights
- Water leakage
- Blocked drainage systems
- Other public infrastructure issues

Managing these complaints efficiently requires proper classification, prioritisation, department coordination, assignment, and resolution tracking.

CivicResolve aims to streamline this process through AI-assisted analysis and role-based complaint management.

### 3. Proposed Solution

CivicResolve provides three dedicated portals:

**Citizen Portal**
- Submit civic complaints with descriptions, categories, and location details.
- Attach images as supporting evidence.
- Receive AI-assisted complaint analysis.
- Track complaint progress and resolution status.

**Municipal Admin Portal**
- View and manage submitted complaints.
- Review AI-generated classifications and urgency assessments.
- Assign complaints to the appropriate departments.
- Select primary and supporting department officers.
- Monitor progress and verify submitted resolutions.

**Department Officer Portal**
- View assigned complaints.
- Accept assignments and update progress.
- Add work notes and supporting evidence.
- Access complaint locations and smart route planning.
- Submit completed work for administrative verification.

### 4. Artificial Intelligence Integration

Google Gemini AI is integrated into the complaint analysis workflow.

It assists with:
- Identifying the nature and category of a complaint.
- Assessing the urgency of reported issues.
- Recommending the responsible department.
- Supporting more informed complaint prioritisation.

AI recommendations assist administrators; they do not replace the administrative verification process.

### 5. Smart Mapping and Route Planning

CivicResolve includes location-based functionality to support complaint management.

- Citizens can provide complaint locations.
- Administrators can view complaints geographically.
- Department officers can access assigned complaint locations.
- Smart route planning helps officers organise visits to multiple unresolved complaints.

The mapping implementation uses Leaflet, OpenStreetMap, and OSRM. Route ordering uses a nearest-neighbour approach rather than guaranteeing a mathematically optimal route.

### 6. Complaint Lifecycle

The platform follows a structured workflow:

1. A citizen submits a complaint.
2. Gemini AI analyses the complaint.
3. The complaint becomes available to administrators.
4. An administrator assigns a department and responsible officer.
5. The department officer accepts and works on the assignment.
6. The officer adds progress updates and evidence.
7. The officer submits the resolution.
8. The administrator reviews and verifies or rejects the resolution.
9. The citizen can track the updated complaint status.

### 7. Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend application |
| TypeScript | Type-safe development |
| Vite | Development and build tooling |
| Tailwind CSS | User interface styling |
| Firebase Authentication | User authentication |
| Cloud Firestore | Complaint and application data |
| Google Gemini AI | AI-powered complaint analysis |
| Firebase AI Logic | Gemini integration |
| Leaflet | Interactive maps |
| OpenStreetMap | Map data and tiles |
| OSRM | Route calculation |
| Vercel | Application deployment |
| GitHub | Source code management |

### 8. Security and Access Control

CivicResolve uses Firebase Authentication and Firestore security rules to support role-based access.

The application separates citizen, administrator, and department officer functionality.

Administrative privileges use Firebase custom claims, while Firestore security rules help control access to application data.

Sensitive configuration and service account credentials should remain outside the public source repository.

### 9. Key Advantages

- AI-assisted complaint classification and prioritisation.
- Dedicated portals for different user roles.
- Structured department and officer assignment.
- Real-time complaint status updates.
- Location-based complaint visualisation.
- Smart route planning for field officers.
- Administrative resolution verification.
- Improved transparency throughout the complaint lifecycle.

### 10. Future Scope

Potential future improvements include:
- Integration with official municipal complaint systems.
- SMS and email notifications.
- Advanced geospatial analytics.
- Automated duplicate complaint detection.
- More sophisticated route optimisation.
- Civic issue trend analysis and reporting.
- Multilingual citizen support.

These are proposed future enhancements, not claims about currently implemented functionality.

### 11. Conclusion

CivicResolve demonstrates how artificial intelligence, cloud infrastructure, and location-based technology can be combined to improve civic complaint management.

By connecting citizens, administrators, and department officers through a structured workflow, the platform aims to make civic issue reporting more accessible, complaint handling more organised, and resolution progress more transparent.

### 12. Project Links

**Live Application:**  
https://civic-resolve-lac.vercel.app

**GitHub Repository:**  
https://github.com/jonathandw2008-del/CivicResolve

**Project Name:** CivicResolve  
**Competition:** PromptWars
