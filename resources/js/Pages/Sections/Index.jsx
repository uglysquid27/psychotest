import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index() {
  const { sections } = usePage().props;

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Daftar Section dan Sub Section
        </h2>
      }
    >
      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
                  Section dan Sub Section
                </h1>
                <Link
                  href={route('sections.create')}
                  className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                >
                  Tambah Sub Section
                </Link>
              </div>

              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200 text-lg">
                        {section.name}
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {section.sub_sections.length > 0 ? (
                        section.sub_sections.map((subSection) => (
                          <div key={subSection.id} className="px-4 py-3 flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300">{subSection.name}</span>
                            <div className="flex space-x-2">
                              <Link
                                href={route('sections.edit', subSection.id)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium"
                              >
                                Edit
                              </Link>
                              <Link
                                href={route('sections.destroy', subSection.id)}
                                method="delete"
                                as="button"
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm font-medium"
                                confirm="Are you sure you want to delete this sub section?"
                              >
                                Hapus
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                          Tidak ada sub section untuk section ini.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}