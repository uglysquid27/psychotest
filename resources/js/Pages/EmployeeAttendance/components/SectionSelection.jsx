// components/SectionSelection.jsx
export default function SectionSelection({ sections = [], onSelect }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Select Section
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <button
            type="button" // <- prevent form submit
            key={section.id ?? section.name}
            onClick={(e) => {
              e.preventDefault(); // extra safety
              onSelect(section);
            }}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-left bg-white dark:bg-gray-800 transition-colors"
          >
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {section.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {(section.sub_sections?.length ?? 0)} sub sections
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
