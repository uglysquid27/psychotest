import { usePage } from '@inertiajs/react';

export default function SectionSelection({ sections, onSelect, employeeStats = {} }) {
  const { auth } = usePage().props;
  const user = auth?.user;

  // Define section access based on roles
  const getAccessibleSections = () => {
    if (!user) return [];

    const userRole = user.role;
    
    // Admin can access all sections
    if (userRole === 'admin') {
      return sections;
    }

    // Define role-based section access
    const roleAccess = {
      'logistic': ['Finished goods', 'Delivery', 'Loader', 'Operator Forklift', 'Inspeksi', 'Produksi'],
      'rm/pm': ['RM/PM'],
      'fsb': ['Food & Snackbar'],
      'user': sections.map(section => section.name) // Regular users can access all sections
    };

    // If role has specific access defined, filter sections
    if (roleAccess[userRole]) {
      return sections.filter(section => 
        roleAccess[userRole].includes(section.name)
      );
    }

    // Default: no access if role not defined
    return [];
  };

  const accessibleSections = getAccessibleSections();

  // Helper function to get stats for a section
  const getSectionStats = (sectionId) => {
    if (!employeeStats.sections || !employeeStats.sections[sectionId]) {
      return {
        total: 0,
        available: 0,
        assigned: 0,
        onLeave: 0
      };
    }
    
    return employeeStats.sections[sectionId];
  };

  // Helper function to calculate availability percentage
  const calculateAvailabilityPercentage = (stats) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.available / stats.total) * 100);
  };

  // Show message if no sections are accessible
  if (accessibleSections.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Select Section
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            No sections are accessible with your current role ({user?.role}). 
            Please contact administrator for section access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Select Section
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accessibleSections.map(section => {
          const stats = getSectionStats(section.id);
          const availabilityPercentage = calculateAvailabilityPercentage(stats);
          
          return (
            <button
              key={section.id}
              onClick={() => onSelect(section)}
              className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-left bg-white dark:bg-gray-800 transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {section.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {section.sub_sections.length} sub sections
                  </p>
                </div>
                
                {/* Availability indicator */}
                <div className="flex flex-col items-end ml-2">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    availabilityPercentage >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    availabilityPercentage >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {availabilityPercentage}% available
                  </div>
                </div>
              </div>
              
              {/* Employee Statistics */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="ml-1 font-medium">{stats.total}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Available:</span>
                  <span className="ml-1 font-medium">{stats.available}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Assigned:</span>
                  <span className="ml-1 font-medium">{stats.assigned}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">On Leave:</span>
                  <span className="ml-1 font-medium">{stats.onLeave}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      availabilityPercentage >= 70 ? 'bg-green-500' :
                      availabilityPercentage >= 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${availabilityPercentage}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Status Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Total: All employees in this section</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Available: Ready for assignment</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Assigned: Already scheduled today</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">On Leave: Cuti or sick leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}