export default function GenderFields({
  shift,
  slotData,
  requestedAmount,
  handleSlotChange,
  handleNumberFocus,
  sectionName // Add sectionName as a prop
}) {
  // Hide gender fields for these sections
  const hideGenderFields = ['Loader'].includes(sectionName);

  if (hideGenderFields) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-md">
      <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-3">
        Komposisi Gender
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor={`male_count_${shift.id}`} className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Laki-laki
          </label>
          <input
            type="number"
            id={`male_count_${shift.id}`}
            min="0"
            max={requestedAmount}
            value={slotData.male_count || ''}
            onChange={(e) => handleSlotChange('male_count', e.target.value)}
            onFocus={handleNumberFocus}
            onWheel={(e) => e.target.blur()}
            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor={`female_count_${shift.id}`} className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Perempuan
          </label>
          <input
            type="number"
            id={`female_count_${shift.id}`}
            min="0"
            max={requestedAmount}
            value={slotData.female_count || ''}
            onChange={(e) => handleSlotChange('female_count', e.target.value)}
            onFocus={handleNumberFocus}
            onWheel={(e) => e.target.blur()}
            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      {/* Validation message if gender counts exceed requested amount */}
      {(parseInt(slotData.male_count || 0) + parseInt(slotData.female_count || 0) > requestedAmount) && (
        <p className="mt-2 text-red-600 dark:text-red-400 text-sm">
          Total gender melebihi jumlah yang diminta!
        </p>
      )}
      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Terisi: <span className="font-medium">
            {parseInt(slotData.male_count || 0) + parseInt(slotData.female_count || 0)}
          </span> dari <span className="font-medium">
            {requestedAmount}
          </span> karyawan
        </p>
      </div>
    </div>
  );
}