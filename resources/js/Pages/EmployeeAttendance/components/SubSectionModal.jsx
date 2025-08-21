import { useState, useEffect } from 'react';

export default function SubSectionModal({ 
  isOpen, 
  onClose, 
  section, 
  onSelect,
  selectedSubSections = [] 
}) {
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems([]);
    }
  }, [isOpen]);

  if (!isOpen || !section) return null;

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
      
      <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
            Select Sub Sections from {section.name}
          </h3>
          
          {availableSubSections.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">
                All subsections have already been selected.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {availableSubSections.map(subSection => (
                    <div 
                      key={subSection.id} 
                      className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id={`sub-section-${subSection.id}`}
                        checked={selectedItems.some(item => item.id === subSection.id)}
                        onChange={() => handleCheckboxChange(subSection)}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label 
                        htmlFor={`sub-section-${subSection.id}`}
                        className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {subSection.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Already selected subsections:
                </h4>
                {selectedSubSections.length > 0 ? (
                  <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    {section.sub_sections
                      .filter(subSection => selectedSubSections.includes(subSection.id))
                      .map(subSection => (
                        <li key={subSection.id}>
                          {subSection.name}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">None</p>
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