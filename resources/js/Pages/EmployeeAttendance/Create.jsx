import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Create() {
  const { sections } = usePage().props;
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSubSectionModal, setShowSubSectionModal] = useState(false);
  const [selectedSubSections, setSelectedSubSections] = useState([]);
  const [tempSelectedSubSections, setTempSelectedSubSections] = useState([]);

  const { data, setData, post, processing, errors } = useForm({
    name: '',
    nik: '',
    password: '',
    password_confirmation: '',
    type: 'harian',
    status: 'available',
    cuti: 'no',
    gender: 'male',
    sub_sections: [],
  });

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    // Pre-select any subsections that are already selected for this section
    const currentSectionSubs = section.sub_sections
      .filter(sub => selectedSubSections.includes(sub.name))
      .map(sub => sub.name);
    setTempSelectedSubSections(currentSectionSubs);
    setShowSubSectionModal(true);
  };

  const handleSubSectionCheckboxChange = (subSectionName) => {
    setTempSelectedSubSections(prev => {
      if (prev.includes(subSectionName)) {
        return prev.filter(name => name !== subSectionName);
      } else {
        return [...prev, subSectionName];
      }
    });
  };

  const handleSelectAll = () => {
    if (tempSelectedSubSections.length === selectedSection.sub_sections.length) {
      // If all are selected, deselect all
      setTempSelectedSubSections([]);
    } else {
      // Select all subsections
      setTempSelectedSubSections(selectedSection.sub_sections.map(sub => sub.name));
    }
  };

  const applySubSectionSelection = () => {
    // Merge with existing selections from other sections
    const otherSectionsSubs = selectedSubSections.filter(
      name => !selectedSection.sub_sections.some(sub => sub.name === name)
    );
    const updated = [...otherSectionsSubs, ...tempSelectedSubSections];
    setSelectedSubSections(updated);
    setData('sub_sections', updated);
    setShowSubSectionModal(false);
  };

  const handleRemoveSubSection = (subSectionName) => {
    const updated = selectedSubSections.filter(name => name !== subSectionName);
    setSelectedSubSections(updated);
    setData('sub_sections', updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('employee-attendance.store'), {
      onSuccess: () => {
        setSelectedSubSections([]);
      },
    });
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          Tambah Pegawai Baru
        </h2>
      }
    >
      <div className="py-4 sm:py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl sm:text-2xl">
                  Formulir Pegawai Baru
                </h1>
                <Link
                  href={route('employee-attendance.index')}
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                >
                  Kembali ke Daftar
                </Link>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    Informasi Dasar
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                      {errors.name && <p className="mt-1 text-red-500 text-sm">{errors.name}</p>}
                    </div>

                    {/* NIK */}
                    <div>
                      <label htmlFor="nik" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        NIK <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="nik"
                        value={data.nik}
                        onChange={(e) => setData('nik', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="Masukkan NIK"
                        required
                      />
                      {errors.nik && <p className="mt-1 text-red-500 text-sm">{errors.nik}</p>}
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="gender" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Jenis Kelamin <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="gender"
                        value={data.gender}
                        onChange={(e) => setData('gender', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        required
                      >
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </select>
                      {errors.gender && <p className="mt-1 text-red-500 text-sm">{errors.gender}</p>}
                    </div>

                    {/* Type */}
                    <div>
                      <label htmlFor="type" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Tipe Pegawai <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="type"
                        value={data.type}
                        onChange={(e) => setData('type', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        required
                      >
                        <option value="harian">Harian</option>
                        <option value="bulanan">Bulanan</option>
                      </select>
                      {errors.type && <p className="mt-1 text-red-500 text-sm">{errors.type}</p>}
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    Kata Sandi
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="Masukkan kata sandi"
                        required
                      />
                      {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password}</p>}
                    </div>

                    {/* Password Confirmation */}
                    <div>
                      <label htmlFor="password_confirmation" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="Ulangi kata sandi"
                        required
                      />
                      {errors.password_confirmation && <p className="mt-1 text-red-500 text-sm">{errors.password_confirmation}</p>}
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    Status
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label htmlFor="status" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Status Pegawai
                      </label>
                      <select
                        id="status"
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="on leave">On Leave</option>
                      </select>
                      {errors.status && <p className="mt-1 text-red-500 text-sm">{errors.status}</p>}
                    </div>

                    {/* Cuti */}
                    <div>
                      <label htmlFor="cuti" className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Status Cuti
                      </label>
                      <select
                        id="cuti"
                        value={data.cuti}
                        onChange={(e) => setData('cuti', e.target.value)}
                        className="w-full bg-white dark:bg-gray-600 shadow-sm px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="no">Tidak</option>
                        <option value="yes">Ya</option>
                      </select>
                      {errors.cuti && <p className="mt-1 text-red-500 text-sm">{errors.cuti}</p>}
                    </div>
                  </div>
                </div>

                {/* Section + Subsection */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                    Pilih Section dan Sub Section
                  </h3>

                  <div className="space-y-6">
                    {/* Section Selection */}
                    <div>
                      <h4 className="text-md font-medium mb-3">Pilih Section</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sections.map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => handleSectionSelect(section)}
                            className="p-4 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-left transition-colors duration-200"
                          >
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {section.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {selectedSubSections.filter(name => 
                                section.sub_sections.some(sub => sub.name === name)
                              ).length} of {section.sub_sections.length} sub sections selected
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected SubSections */}
                    <div>
                      <h4 className="text-md font-medium mb-3">Sub Section Terpilih</h4>
                      {selectedSubSections.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada sub section yang dipilih</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedSubSections.map((name) => (
                            <div key={name} className="flex items-center bg-indigo-100 dark:bg-gray-600 px-3 py-1 rounded-full text-sm">
                              <span className="text-indigo-800 dark:text-gray-100">{name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubSection(name)}
                                className="ml-2 text-indigo-600 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-gray-100"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.sub_sections && <p className="mt-2 text-red-500 text-sm">{errors.sub_sections}</p>}
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Link
                    href={route('employee-attendance.index')}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-medium text-white text-sm transition-colors duration-200 text-center"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-md font-medium text-white text-sm transition-colors duration-200"
                  >
                    {processing ? 'Menyimpan...' : 'Simpan Pegawai'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Section Modal */}
      {showSubSectionModal && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
            onClick={() => setShowSubSectionModal(false)}
          ></div>
          
          <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Pilih Sub Section dari {selectedSection.name}
              </h3>
              
              <div className="mb-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  {tempSelectedSubSections.length === selectedSection.sub_sections.length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tempSelectedSubSections.length} selected
                </span>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedSection.sub_sections.map((subSection) => (
                    <label 
                      key={subSection.id}
                      className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        tempSelectedSubSections.includes(subSection.name) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tempSelectedSubSections.includes(subSection.name)}
                        onChange={() => handleSubSectionCheckboxChange(subSection.name)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        {subSection.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={applySubSectionSelection}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Terapkan
              </button>
              <button
                type="button"
                onClick={() => setShowSubSectionModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}