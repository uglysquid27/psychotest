import { useState, useEffect } from 'react';

export default function SubSectionModal({ 
  isOpen, 
  onClose, 
  section, 
  onSelect,
  selectedSubSections = [],
  employeeStats = {}
}) {
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems([]);
    }
  }, [isOpen]);

  if (!isOpen || !section) return null;

  // Helper function to get stats for a subsection
  const getSubSectionStats = (subSectionId) => {
    if (!employeeStats.subsections || !employeeStats.subsections[subSectionId]) {
      return {
        total: 0,
        available: 0,
        assigned: 0,
        onLeave: 0
      };
    }
    
    return employeeStats.subsections[subSectionId];
  };

  // Helper function to calculate availability percentage
  const calculateAvailabilityPercentage = (stats) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.available / stats.total) * 100);
  };

  const handleCheckboxChange = (subSection) => {
    setSelectedItems(prev => {
      if (prev.some(item => item.id === subSection.id)) {
        return prev.filter(item => item.id !== subSection.id);
      } else {
        return [...prev, subSection];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems);
    }
  };

  // Filter out subsections that are already selected
  const availableSubSections = section.sub_sections.filter(
    subSection => !selectedSubSections.includes(subSection.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" onClick={onClose}></div>
      
      <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                Select Sub Sections from {section.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select one or more subsections to add to your request
              </p>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {availableSubSections.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">All subsections selected</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                All subsections have already been added to your request.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {availableSubSections.map(subSection => {
                    const stats = getSubSectionStats(subSection.id);
                    const availabilityPercentage = calculateAvailabilityPercentage(stats);
                    
                    return (
                      <div 
                        key={subSection.id} 
                        className={`flex items-center p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedItems.some(item => item.id === subSection.id)
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleCheckboxChange(subSection)}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            id={`sub-section-${subSection.id}`}
                            checked={selectedItems.some(item => item.id === subSection.id)}
                            onChange={() => handleCheckboxChange(subSection)}
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                        
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <label 
                                htmlFor={`sub-section-${subSection.id}`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                              >
                                {subSection.name}
                              </label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Employee availability
                              </p>
                            </div>
                            
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              availabilityPercentage >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              availabilityPercentage >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {stats.available}/{stats.total} available
                            </div>
                          </div>
                          
                          {/* Employee Statistics Grid */}
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{stats.total}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.available}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Available</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{stats.assigned}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Assigned</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-red-600 dark:text-red-400">{stats.onLeave}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">On Leave</div>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>Availability</span>
                              <span>{availabilityPercentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Already selected subsections:
                </h4>
                {selectedSubSections.length > 0 ? (
                  <ul className="space-y-2">
                    {section.sub_sections
                      .filter(subSection => selectedSubSections.includes(subSection.id))
                      .map(subSection => {
                        const stats = getSubSectionStats(subSection.id);
                        return (
                          <li key={subSection.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-gray-700 dark:text-gray-300">{subSection.name}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {stats.available}/{stats.total} available
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No subsections selected yet</p>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedItems.length === 0 || availableSubSections.length === 0}
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-base font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
              selectedItems.length === 0 || availableSubSections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Add Selected ({selectedItems.length})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}