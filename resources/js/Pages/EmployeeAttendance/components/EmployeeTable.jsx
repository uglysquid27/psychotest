import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import EmployeeStatusBadge from './EmployeeStatusBadge';
import EmployeeActions from './EmployeeActions';

const EmployeeTable = ({ employees, totalWorkCount, totalWeeklyWorkCount, isUser }) => {
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());

  const toggleExpand = (employeeId) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const renderSubSections = (employee) => {
    if (!employee.sub_sections || employee.sub_sections.length === 0) {
      return 'N/A';
    }

    const isExpanded = expandedEmployees.has(employee.id);
    const subSectionNames = employee.sub_sections.map(ss => ss.name);
    
    if (isExpanded || subSectionNames.length <= 3) {
      return subSectionNames.join(', ');
    }

    const firstThree = subSectionNames.slice(0, 3).join(', ');
    const remainingCount = subSectionNames.length - 3;

    return (
      <>
        {firstThree}
        <span 
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1"
          onClick={() => toggleExpand(employee.id)}
          title={`Show all ${subSectionNames.length} sub-sections`}
        >
          ...(+{remainingCount})
        </span>
      </>
    );
  };

  return (
    <div className="hidden sm:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gender</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NIK</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipe</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sub Section</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Section</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Minggu Ini</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Workload</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cuti</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {employees.length === 0 ? (
            <tr>
              <td colSpan={isUser ? 12 : 13} className="px-6 py-12 text-gray-500 dark:text-gray-400 text-center">
                Tidak ada data pegawai dengan kriteria filter atau pencarian ini.
              </td>
            </tr>
          ) : (
            employees.map((employee) => {
              return (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{employee.name}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{employee.gender}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{employee.nik}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {employee.type ? employee.type.charAt(0).toUpperCase() + employee.type.slice(1) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {renderSubSections(employee)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {employee.sub_sections && employee.sub_sections.length > 0 ? [...new Set(employee.sub_sections.map(ss => ss.section?.name || 'N/A'))].join(', ') : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-center">{employee.total_work_count || 0}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-center">{employee.weekly_work_count || 0}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-center">
                    {employee.workload_point !== undefined ? employee.workload_point : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${employee.cuti === 'yes' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'}`}>
                      {employee.cuti}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    <EmployeeActions employee={employee} isUser={isUser} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {employee.calculated_rating !== undefined ? employee.calculated_rating : 'N/A'}
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
                  </td>
                </tr>
              );
            })
          )}
          <tr className="bg-gray-100 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300">
            <td colSpan="6" className="px-4 py-3 text-right">Total Penugasan:</td>
            <td className="px-4 py-3 text-center">{totalWorkCount}</td>
            <td className="px-4 py-3 text-center">{totalWeeklyWorkCount}</td>
            <td colSpan={isUser ? 4 : 5} className="px-4 py-3 text-center"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;