import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Create() {
  const { sections } = usePage().props;
  const [isSection, setIsSection] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    section_id: '',
    name: '',
    is_section: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('sections.store'));
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          {isSection ? 'Tambah Section Baru' : 'Tambah Sub Section Baru'}
        </h2>
      }
    >
      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
                  {isSection ? 'Formulir Section Baru' : 'Formulir Sub Section Baru'}
                </h1>
                <Link
                  href={route('sections.index')}
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                >
                  Kembali ke Daftar
                </Link>
              </div>

              {/* Toggle pilih Section / SubSection */}
              <div className="mb-6">
                <label className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSection}
                    onChange={(e) => {
                      setIsSection(e.target.checked);
                      setData("is_section", e.target.checked);
                      if (e.target.checked) {
                        setData("section_id", ""); // reset section_id kalau buat Section
                      }
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Tambah Section (bukan Sub Section)
                  </span>
                </label>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    {isSection ? 'Informasi Section' : 'Informasi Sub Section'}
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Kalau Sub Section, tampilkan pilihan Section */}
                    {!isSection && (
                      <div>
                        <label htmlFor="section_id" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                          Section <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="section_id"
                          value={data.section_id}
                          onChange={(e) => setData('section_id', e.target.value)}
                          className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                          required={!isSection}
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
                    )}

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {isSection ? 'Nama Section' : 'Nama Sub Section'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="capitalize w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder={isSection ? "Masukkan nama Section" : "Masukkan nama Sub Section"}
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
                    {processing ? 'Menyimpan...' : (isSection ? 'Simpan Section' : 'Simpan Sub Section')}
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
