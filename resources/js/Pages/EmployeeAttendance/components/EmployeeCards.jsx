import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeStatusBadge from './EmployeeStatusBadge';
import EmployeeActions from './EmployeeActions';

const EmployeeCards = ({ employees, isAdmin, isUser, selectedEmployees, toggleEmployeeSelection }) => {
  if (employees.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 text-center text-gray-500 dark:text-gray-400">
        Tidak ada data pegawai dengan kriteria filter atau pencarian ini.
      </div>
    );
  }

  // For non-admin users, show simplified cards
  if (!isAdmin) {
    return (
      <div className="sm:hidden grid grid-cols-1 gap-4 mb-6">
        {employees.map((employee) => {
          return (
            <div 
              key={employee.id} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</h3>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Rating:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {employee.calculated_rating !== undefined ? employee.calculated_rating : 'N/A'}
                  </span>
                </div>
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
  }

  // For admin users, show full cards
  return (
    <div className="sm:hidden grid grid-cols-1 gap-4 mb-6">
      {employees.map((employee) => {
        const isSelected = selectedEmployees.includes(employee.id);
        return (
          <div 
            key={employee.id} 
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{employee.nik}</p>
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleEmployeeSelection(employee.id)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{employee.gender}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tipe:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">
                  {employee.type ? employee.type.charAt(0).toUpperCase() + employee.type.slice(1) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Section:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">
                  {employee.sub_sections && employee.sub_sections.length > 0 
                    ? [...new Set(employee.sub_sections.map(ss => ss.section?.name || 'N/A'))].join(', ') 
                    : 'N/A'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Sub Section:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">
                  {employee.sub_sections && employee.sub_sections.length > 0 
                    ? employee.sub_sections.map(ss => ss.name).join(', ') 
                    : 'N/A'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{employee.total_work_count || 0}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Minggu Ini:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{employee.weekly_work_count || 0}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Workload:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">
                  {employee.workload_point !== undefined ? employee.workload_point : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cuti:</span>
                <span className={`ml-1 px-2 py-1 inline-flex text-xs font-semibold rounded-full ${employee.cuti === 'yes' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'}`}>
                  {employee.cuti}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-3">
              <EmployeeStatusBadge status={employee.status} />
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">Rating:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {employee.calculated_rating !== undefined ? employee.calculated_rating : 'N/A'}
                </span>
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

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <EmployeeActions employee={employee} isAdmin={isAdmin} isUser={isUser} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeCards;