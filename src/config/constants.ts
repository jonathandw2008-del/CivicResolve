import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '../types/complaint';

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Roads and Potholes',
  'Garbage and Sanitation',
  'Water Leakage',
  'Streetlights and Electricity',
  'Drainage and Sewage',
  'Public Infrastructure',
  'Other',
];

export const COMPLAINT_PRIORITIES: ComplaintPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  'Reported',
  'Acknowledged',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolution Submitted',
  'Resolved',
];

export const CIVIC_DEPARTMENTS: string[] = [
  'Public Works Department (PWD)',
  'Solid Waste Management & Sanitation',
  'Water Supply & Sewerage Board',
  'Electricity & Street Lighting Division',
  'Drainage & Stormwater Engineering',
  'Municipal Infrastructure Directorate',
  'Civic General Administration',
];

export const CIVIC_WARDS: string[] = [
  'Ward 01 - North Zone',
  'Ward 06 - West Zone',
  'Ward 08 - Market Zone',
  'Ward 11 - South Industrial Zone',
  'Ward 14 - Central Zone',
  'Ward 21 - South Residential Zone',
];

export const CATEGORY_DEPARTMENT_MAP: Record<string, string> = {
  'Roads and Potholes': 'Public Works Department (PWD)',
  'Garbage and Sanitation': 'Solid Waste Management & Sanitation',
  'Water Leakage': 'Water Supply & Sewerage Board',
  'Streetlights and Electricity': 'Electricity & Street Lighting Division',
  'Drainage and Sewage': 'Drainage & Stormwater Engineering',
  'Public Infrastructure': 'Municipal Infrastructure Directorate',
  'Other': 'Civic General Administration',
  'Roads and potholes': 'Public Works Department (PWD)',
  'Garbage and sanitation': 'Solid Waste Management & Sanitation',
  'Water supply and leakage': 'Water Supply & Sewerage Board',
  'Streetlights and electricity': 'Electricity & Street Lighting Division',
  'Drainage and sewage': 'Drainage & Stormwater Engineering',
  'Public infrastructure': 'Municipal Infrastructure Directorate',
};
