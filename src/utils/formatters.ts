import { ComplaintPriority, ComplaintStatus, ComplaintCategory } from '../types/complaint';

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

export function getPriorityBadgeColor(priority: ComplaintPriority): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (priority) {
    case 'Critical':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'High':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'Medium':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'Low':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
  }
}

export function getStatusBadgeColor(status: ComplaintStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'Reported':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-400',
      };
    case 'Acknowledged':
    case 'Under Review':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'Assigned':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
      };
    case 'In Progress':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        dot: 'bg-amber-500',
      };
    case 'Resolution Submitted':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-300',
        dot: 'bg-purple-500',
      };
    case 'Resolved':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        dot: 'bg-teal-500',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-400',
      };
  }
}

export function getCategoryIconName(category: ComplaintCategory): string {
  switch (category) {
    case 'Roads and potholes':
      return 'AlertTriangle';
    case 'Garbage and sanitation':
      return 'Trash2';
    case 'Water supply and leakage':
      return 'Droplet';
    case 'Streetlights and electricity':
      return 'Zap';
    case 'Drainage and sewage':
      return 'Waves';
    case 'Public infrastructure':
      return 'Building2';
    default:
      return 'HelpCircle';
  }
}
