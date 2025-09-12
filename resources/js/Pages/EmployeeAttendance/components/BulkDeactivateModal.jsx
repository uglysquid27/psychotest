import React from 'react';
import { useForm } from '@inertiajs/react';

const BulkDeactivateModal = ({ show, onClose, employeeIds, employeeCount }) => {
  const { data, setData, post, processing, errors } = useForm({
    deactivation_reason: '',
    deactivation_notes: '',
    deactivated_at: '', // ⬅️ tambahkan ini
    employee_ids: employeeIds
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('employee-attendance.bulk-deactivate'), {
      onSuccess: () => {
        onClose();
      }
    });
  };

  if (!show) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all">
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Bulk Deactivate Employees
          </h3>
          
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You are about to deactivate {employeeCount} employee(s). This action cannot be undone.
            </p>
          </div>

          {/* Field tanggal deaktifasi */}
          <div className="mb-4">
            <label className="block font-medium text-sm text-gray-700 dark:text-gray-300">
              Deactivation Date *
            </label>
            <input
              type="date"
              value={data.deactivated_at}
              onChange={(e) => setData('deactivated_at', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              required
            />
            {errors.deactivated_at && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.deactivated_at}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium text-sm text-gray-700 dark:text-gray-300">
              Reason for Deactivation *
            </label>
            <select
              value={data.deactivation_reason}
              onChange={(e) => setData('deactivation_reason', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              required
            >
              <option value="">Select a reason</option>
              <option value="resignation">Resignation</option>
              <option value="termination">Termination</option>
              <option value="retirement">Retirement</option>
              <option value="other">Other</option>
            </select>
            {errors.deactivation_reason && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.deactivation_reason}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium text-sm text-gray-700 dark:text-gray-300">
              Additional Notes
            </label>
            <textarea
              value={data.deactivation_notes}
              onChange={(e) => setData('deactivation_notes', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              rows={4}
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="submit"
            disabled={processing}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {processing ? 'Processing...' : `Deactivate ${employeeCount} Employee(s)`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkDeactivateModal;
