import React from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function EditSubSection() {
  const { subSection, sections } = usePage().props;

  const { data, setData, put, processing, errors } = useForm({
    section_id: subSection.section_id,
    name: subSection.name,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route('sections.update-subsection', subSection.id));
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Edit Sub Section
        </h2>
      }
    >
      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
                  Edit Sub Section
                </h1>
                <Link
                  href={route('sections.index')}
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                >
                  Kembali ke Daftar
                </Link>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    Informasi Sub Section
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Section Selection */}
                    <div>
                      <label htmlFor="section_id" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Section <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="section_id"
                        value={data.section_id}
                        onChange={(e) => setData('section_id', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        required
                      >
                        <option value="">Pilih Section</option>
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                          </option>
                        ))}
                      </select>
                      {errors.section_id && <p className="mt-1 text-red-500 text-sm">{errors.section_id}</p>}
                    </div>

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Nama Sub Section <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="Masukkan nama sub section"
                        required
                      />
                      {errors.name && <p className="mt-1 text-red-500 text-sm">{errors.name}</p>}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Link
                    href={route('sections.index')}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-medium text-white text-sm transition-colors duration-200 text-center"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                  >
                    {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}