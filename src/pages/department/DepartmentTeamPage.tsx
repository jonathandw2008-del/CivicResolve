import React, { useState, useEffect } from 'react';
import { Building2, Users } from 'lucide-react';
import { departmentService } from '../../services/departmentService';
import { Department } from '../../types/department';
import { useAuth } from '../../context/AuthContext';

export const DepartmentTeamPage: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentService
      .getAllDepartments()
      .then((res) => setDepartments(res))
      .catch((err) => console.warn('Could not fetch departments:', err))
      .finally(() => setLoading(false));
  }, []);

  const myDept = departments.find(
    (d) => d.id === user?.departmentId || d.name === user?.departmentName
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Department Directory & Officers
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Active municipal divisions, engineering units and registered field officers.
        </p>
      </div>

      {/* My Department Highlight */}
      {myDept && (
        <div className="p-6 rounded-3xl bg-[#0D1B2E] border border-teal-500/30 shadow-card">
          <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" />
            <span>Your Assigned Municipal Division</span>
          </div>
          <h3 className="text-xl font-black text-white">{myDept.name}</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">{myDept.description}</p>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Registered Officers ({myDept.officers?.length || 0})
            </p>
            {(!myDept.officers || myDept.officers.length === 0) ? (
              <p className="text-xs text-slate-500">No other officers registered in this department yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myDept.officers.map((off) => (
                  <div
                    key={off.uid}
                    className="p-3 bg-[#071426] rounded-xl border border-slate-800 flex items-center space-x-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                      {off.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-white truncate">{off.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{off.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Departments Grid */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-white">
          All Municipal Divisions ({departments.length})
        </h3>
        {loading ? (
          <div className="p-12 text-center bg-[#0D1B2E] rounded-3xl border border-slate-800 text-slate-400">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading municipal directory...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-[#0D1B2E] rounded-2xl border border-slate-800 p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#10243B] text-teal-300 border border-teal-500/30">
                    {dept.code}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    <span>{dept.officerUids?.length || 0} Officers</span>
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{dept.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{dept.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
