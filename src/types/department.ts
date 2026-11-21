export interface DepartmentOfficer {
  uid: string;
  name: string;
  fullName?: string;
  email: string;
  role: 'officer' | 'head_officer';
  departmentId: string;
  departmentName: string;
  joinedAt: string;
  active: boolean;
}

export interface Department {
  id: string; // e.g. "roads-bridges", "sanitation", "water", "electricity", "drainage", "infrastructure", "admin"
  name: string;
  code: string;
  description: string;
  officerUids: string[];
  officers?: DepartmentOfficer[];
  createdAt: any;
  updatedAt: any;
}

export interface CreateDepartmentInput {
  id: string;
  name: string;
  code: string;
  description: string;
}
