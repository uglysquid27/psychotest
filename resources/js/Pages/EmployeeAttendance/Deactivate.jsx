import React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Deactivate({ employee, reasons }) {
  const { data, setData, post, processing, errors } = useForm({
    deactivation_reason: '',
    deactivation_notes: '',
    deactivated_at: new Date().toISOString().split('T')[0] // Default to today
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('employee-attendance.process-deactivation', employee.id));
  };

  return (
    <AuthenticatedLayout>
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Deactivate {employee.name}</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-medium text-sm text-gray-700">
                  Deactivation Date *
                </label>
                <input
                  type="date"
                  value={data.deactivated_at}
                  onChange={(e) => setData('deactivated_at', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  max={new Date().toISOString().split('T')[0]} // Max date is today
                />
                {errors.deactivated_at && (
                  <p className="mt-2 text-sm text-red-600">{errors.deactivated_at}</p>
                )}
              </div>

              <div>
                <label className="block font-medium text-sm text-gray-700">
                  Reason for Deactivation *
                </label>
                <select
                  value={data.deactivation_reason}
                  onChange={(e) => setData('deactivation_reason', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select a reason</option>
                  {Object.entries(reasons).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.deactivation_reason && (
                  <p className="mt-2 text-sm text-red-600">{errors.deactivation_reason}</p>
                )}
              </div>

              <div>
                <label className="block font-medium text-sm text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  value={data.deactivation_notes}
                  onChange={(e) => setData('deactivation_notes', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Deactivation'}
                </button>
                <a 
                  href={route('employee-attendance.index')} 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}