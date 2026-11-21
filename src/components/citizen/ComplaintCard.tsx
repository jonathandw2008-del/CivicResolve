import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { formatRelativeTime } from '../../utils/formatters';

interface ComplaintCardProps {
  complaint: Complaint;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  return (
    <div className="bg-[#0D1B2E] rounded-2xl border border-slate-800 hover:border-teal-500/40 p-5 shadow-lg card-hover group flex flex-col justify-between relative overflow-hidden transition-all">
      <div>
        {/* Top bar: ID, Category & Priority */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#10243B] text-teal-300 border border-slate-700">
              {complaint.id}
            </span>
            <span className="text-xs text-slate-400 font-semibold truncate max-w-[140px]">
              {complaint.category}
            </span>
          </div>
          <PriorityBadge priority={complaint.priority} size="sm" />
        </div>

        {/* Title */}
        <Link
          to={`/citizen/complaints/${complaint.id}`}
          className="text-sm sm:text-base font-bold text-white group-hover:text-teal-400 transition-colors line-clamp-2 mb-2 block leading-snug"
        >
          {complaint.title}
        </Link>

        {/* Description snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-normal">
          {complaint.description}
        </p>

        {/* Location & Image indication */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{complaint.location}</span>
          </div>
          {(complaint.imageUrl || complaint.imageURL) && (
            <div className="flex items-center space-x-1.5 text-teal-400 font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo evidence attached</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Status, Submission Date & Link */}
      <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StatusBadge status={complaint.status} size="sm" />
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-flex sm:items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formatRelativeTime(complaint.createdAt)}
          </span>
        </div>

        <Link
          to={`/citizen/complaints/${complaint.id}`}
          className="inline-flex items-center text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors group-hover:translate-x-1"
        >
          <span>Track</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
};
