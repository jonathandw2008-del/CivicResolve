import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from './complaint';

export interface CategoryStat {
  category: ComplaintCategory;
  count: number;
  percentage: number;
}

export interface PriorityStat {
  priority: ComplaintPriority;
  count: number;
  color: string;
}

export interface StatusStat {
  status: ComplaintStatus;
  count: number;
  color: string;
}

export interface DepartmentWorkload {
  department: string;
  total: number;
  inProgress: number;
  resolved: number;
  avgResolutionDays: number;
}

export interface AdminAnalyticsSummary {
  totalComplaints: number;
  newComplaints: number;
  highPriorityComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number; // percentage 0-100
  avgResolutionTimeDays: number;
  categories: CategoryStat[];
  priorities: PriorityStat[];
  statuses: StatusStat[];
  departmentWorkload: DepartmentWorkload[];
}
