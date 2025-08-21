import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Index() {
  const { sections } = usePage().props;
  const [deleteItem, setDeleteItem] = useState({ type: null, id: null, name: null });
  const [showModal, setShowModal] = useState(false);

  const openModal = (type, id, name) => {
    setDeleteItem({ type, id, name });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setDeleteItem({ type: null, id: null, name: null });
  };

  const handleDelete = () => {
    if (deleteItem.type === 'section') {
      router.delete(route('sections.destroy-section', deleteItem.id));
    } else if (deleteItem.type === 'subsection') {
      router.delete(route('sections.destroy-subsection', deleteItem.id));
    }
    closeModal();
  };
  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Daftar Section dan Sub Section
        </h2>
      }
    >
      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Konfirmasi Hapus
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-700 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus {deleteItem.type === 'section' ? 'section' : 'subsection'} ini?
              </p>
              <p className="font-medium text-gray-900 dark:text-white mt-2">"{deleteItem.name}"</p>
              {deleteItem.type === 'section' && (
                <p className="text-red-500 text-sm mt-2">
                  * Semua subsection dalam section ini juga akan dihapus.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

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
                  className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-white text-sm transition-colors duration-200 flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Tambah Baru
                </Link>
              </div>

              <div className="space-y-6">
                {sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Section Header - More prominent with different styling */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                      <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 text-lg">
                        {section.name}
                      </h3>
                      <div className="flex space-x-2">
                        <Link
                          href={route('sections.edit-section', section.id)}
                          className="bg-white dark:bg-indigo-700 text-indigo-600 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-600 p-1.5 rounded-md shadow-sm border border-indigo-200 dark:border-indigo-600 transition-colors duration-150"
                          title="Edit Section"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openModal('section', section.id, section.name)}
                          className="bg-white dark:bg-indigo-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md shadow-sm border border-red-200 dark:border-red-600 transition-colors duration-150"
                          title="Hapus Section"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {section.sub_sections.length > 0 ? (
                        section.sub_sections.map((subSection) => (
                          <div key={subSection.id} className="px-4 py-3 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                            <span className="text-gray-700 dark:text-gray-300">{subSection.name}</span>
                            <div className="flex space-x-2 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                              <Link
                                href={route('sections.edit-subsection', subSection.id)}
                                className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150"
                                title="Edit Sub Section"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => openModal('subsection', subSection.id, subSection.name)}
                                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150"
                                title="Hapus Sub Section"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
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