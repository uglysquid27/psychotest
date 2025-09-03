import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeStatusBadge from './EmployeeStatusBadge';
import EmployeeActions from './EmployeeActions';

const EmployeeCards = ({ employees, isUser, selectedEmployees, toggleEmployeeSelection }) => {
  if (employees.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 text-center text-gray-500 dark:text-gray-400">
        Tidak ada data pegawai dengan kriteria filter atau pencarian ini.
      </div>
    );
  }

  return (
    <div className="sm:hidden grid grid-cols-1 gap-4 mb-6">
      {employees.map((employee) => {
        const isSelected = selectedEmployees.includes(employee.id);
        return (
          <div 
            key={employee.id} 
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              {!isUser && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEmployeeSelection(employee.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                />
              )}
              <div className="flex-1 ml-2">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.nik}</p>
              </div>
              <EmployeeStatusBadge status={employee.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tipe:</span>
                <p className="font-medium">{employee.type || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                <p className="font-medium">{employee.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Section:</span>
                <p className="font-medium">
                  {employee.sub_sections && employee.sub_sections.length > 0 
                    ? [...new Set(employee.sub_sections.map(ss => ss.section?.name || 'N/A'))].join(', ') 
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Sub Section:</span>
                <p className="font-medium">
                  {employee.sub_sections && employee.sub_sections.length > 0 
                    ? employee.sub_sections.map(ss => ss.name).join(', ') 
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <p className="font-medium">{employee.total_work_count || 0}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Minggu Ini:</span>
                <p className="font-medium">{employee.weekly_work_count || 0}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Workload:</span>
                <p className="font-medium">{employee.workload_point !== undefined ? employee.workload_point : 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cuti:</span>
                <p className="font-medium">
                  <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${employee.cuti === 'yes' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'}`}>
                    {employee.cuti}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Rating:</span>
                <p className="font-medium">
                  {employee.calculated_rating !== undefined ? employee.calculated_rating : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <EmployeeActions employee={employee} isUser={isUser} />
              <Link
                href={route('ratings.create', employee.id)}
                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                title="Rate Employee"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeCards;