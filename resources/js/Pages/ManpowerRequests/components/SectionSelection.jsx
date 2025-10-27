// components/SectionSelection.jsx
import { usePage } from '@inertiajs/react';

export default function SectionSelection({ sections, onSelect }) {
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
        {accessibleSections.map(section => (
          <button
            key={section.id}
            onClick={() => onSelect(section)}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-left bg-white dark:bg-gray-800 transition-colors"
          >
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {section.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {section.sub_sections.length} sub sections
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}