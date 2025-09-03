import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { format, parseISO } from 'date-fns';

export default function Edit() {
    const { employee, sections: allSections } = usePage().props;
    const [selectedSection, setSelectedSection] = useState(null);
    const [showSubSectionModal, setShowSubSectionModal] = useState(false);
    const [tempSelectedSubSections, setTempSelectedSubSections] = useState([]);
    const [photoPreview, setPhotoPreview] = useState(
        employee.photo ? `/storage/${employee.photo}` : null
    );
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Format birth date
    const formattedBirthDate = employee.birth_date
        ? format(parseISO(employee.birth_date), 'yyyy-MM-dd')
        : '';

    // Prepare sections data with sub_sections
    const sections = allSections.map(section => ({
        ...section,
        sub_sections: section.sub_sections || []
    }));

    // Function to capitalize first letter of each word
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    };

    // Function to format RT/RW to 3 digits
    const formatRtRw = (value) => {
        if (!value) return '';
        const numOnly = value.replace(/\D/g, '');
        if (numOnly === '') return '';
        const num = parseInt(numOnly);
        return num.toString().padStart(3, '0');
    };

    const { data, setData, put, processing, errors } = useForm({
        // Basic employee data
        name: employee.name || '',
        nik: employee.nik || '',
        password: '',
        password_confirmation: '',
        type: employee.type || 'harian',
        status: employee.status || 'available',
        cuti: employee.cuti || 'no',
        gender: employee.gender || 'male',
        sub_sections: employee.sub_sections || [],

        // Profile information
        ktp: employee.ktp || '',
        email: employee.email || '',
        group: employee.group || '',
        marital: employee.marital || '',
        birth_date: formattedBirthDate,
        religion: employee.religion || '',
        phone: employee.phone || '',
        street: employee.street || '',
        rt: employee.rt ? formatRtRw(employee.rt) : '',
        rw: employee.rw ? formatRtRw(employee.rw) : '',
        kelurahan: employee.kelurahan || '',
        kecamatan: employee.kecamatan || '',
        kabupaten_kota: employee.kabupaten_kota || '',
        provinsi: employee.provinsi || 'Jawa Timur',
        kode_pos: employee.kode_pos || '',
        photo: null,
    });

    const handleSectionSelect = (section) => {
        setSelectedSection(section);
        // Pre-select any subsections that are already selected for this section
        const currentSectionSubs = data.sub_sections.filter(subName =>
            section.sub_sections.some(sub => sub.name === subName)
        );
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
        if (!selectedSection) return;

        if (tempSelectedSubSections.length === selectedSection.sub_sections.length) {
            // If all are selected, deselect all
            setTempSelectedSubSections([]);
        } else {
            // Select all subsections
            setTempSelectedSubSections(selectedSection.sub_sections.map(sub => sub.name));
        }
    };

    const applySubSectionSelection = () => {
        if (!selectedSection) return;

        // Merge with existing selections from other sections
        const otherSectionsSubs = data.sub_sections.filter(
            name => !selectedSection.sub_sections.some(sub => sub.name === name)
        );
        const updated = [...otherSectionsSubs, ...tempSelectedSubSections];
        setData('sub_sections', updated);
        setShowSubSectionModal(false);
    };

    const handleRemoveSubSection = (subSectionName) => {
        const updated = data.sub_sections.filter(name => name !== subSectionName);
        setData('sub_sections', updated);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('photo', file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setData('photo', null);
        // Revert to original photo if it exists, otherwise null
        setPhotoPreview(employee.photo ? `/storage/${employee.photo}` : null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Format RT/RW before submitting
        const formattedData = {
            ...data,
            rt: data.rt ? formatRtRw(data.rt) : '',
            rw: data.rw ? formatRtRw(data.rw) : ''
        };

        put(route('employee-attendance.update', employee.id), {
            data: formattedData,
            onError: (errors) => {
                if (errors.password) {
                    setData('password', '');
                    setData('password_confirmation', '');
                }
            },
            onSuccess: () => {
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Edit Employee: {employee.name}
                </h2>
            }
        >
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            {/* Success Toast */}
                            {showSuccessToast && (
                                <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                                    <span className="block sm:inline">Employee updated successfully.</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-2xl font-bold">Edit Employee Data</h1>
                                <Link
                                    href={route('employee-attendance.index')}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                                >
                                    Back to List
                                </Link>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Photo Upload Section */}
                                {/* Photo Upload Section */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                                        Profile Photo
                                    </h3>

                                    <div className="flex items-center space-x-6">
                                        <div className="shrink-0">
                                            <img
                                                className="h-24 w-24 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                                                src={photoPreview || (employee.photo ? `/storage/${employee.photo}` : '/images/default-avatar.png')}
                                                alt={`Profile of ${employee.name}`}
                                                onError={(e) => {
                                                    // If the image fails to load, show default avatar
                                                    e.target.src = '/images/default-avatar.png';
                                                }}
                                                onClick={() => {
                                                    // Create a modal for enlarged image
                                                    const modal = document.createElement('div');
                                                    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
                                                    modal.innerHTML = `
                        <div class="relative max-w-4xl max-h-full">
                            <img 
                                src="${photoPreview || (employee.photo ? `/storage/${employee.photo}` : '/images/default-avatar.png')}" 
                                alt="Enlarged profile of ${employee.name}"
                                class="max-w-full max-h-screen object-contain"
                            />
                            <button 
                                class="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 rounded-full p-2 transition-all ease-in-out "
                                onclick="this.parentElement.parentElement.remove()"
                            >
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                                                    modal.addEventListener('click', (e) => {
                                                        if (e.target === modal) {
                                                            modal.remove();
                                                        }
                                                    });
                                                    document.body.appendChild(modal);
                                                }}
                                            />
                                        </div>

                                    </div>
                                    {errors.photo && <p className="mt-2 text-red-500 text-sm">{errors.photo}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>

                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium mb-1">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="nik" className="block text-sm font-medium mb-1">
                                                Employee ID (NIK)
                                            </label>
                                            <input
                                                type="text"
                                                id="nik"
                                                value={data.nik}
                                                onChange={(e) => setData('nik', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                            {errors.nik && <p className="text-red-500 text-sm mt-1">{errors.nik}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="ktp" className="block text-sm font-medium mb-1">
                                                KTP Number
                                            </label>
                                            <input
                                                type="text"
                                                id="ktp"
                                                value={data.ktp}
                                                onChange={(e) => setData('ktp', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                maxLength={16}
                                            />
                                            {errors.ktp && <p className="text-red-500 text-sm mt-1">{errors.ktp}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value.toLowerCase())}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="gender" className="block text-sm font-medium mb-1">
                                                Gender
                                            </label>
                                            <select
                                                id="gender"
                                                value={data.gender}
                                                onChange={(e) => setData('gender', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="type" className="block text-sm font-medium mb-1">
                                                Employee Type
                                            </label>
                                            <select
                                                id="type"
                                                value={data.type}
                                                onChange={(e) => setData('type', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="harian">Daily Worker</option>
                                                <option value="bulanan">Monthly Worker</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Status & Personal Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium border-b pb-2">Status & Personal Details</h3>

                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium mb-1">
                                                Status
                                            </label>
                                            <select
                                                id="status"
                                                value={data.status}
                                                onChange={(e) => setData('status', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="available">Available</option>
                                                <option value="assigned">Assigned</option>
                                                <option value="on leave">On Leave</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="cuti" className="block text-sm font-medium mb-1">
                                                Leave Status
                                            </label>
                                            <select
                                                id="cuti"
                                                value={data.cuti}
                                                onChange={(e) => setData('cuti', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            >
                                                <option value="no">Not on Leave</option>
                                                <option value="yes">On Leave</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="marital" className="block text-sm font-medium mb-1">
                                                Marital Status
                                            </label>
                                            <select
                                                id="marital"
                                                value={data.marital}
                                                onChange={(e) => setData('marital', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Select Status</option>
                                                <option value="K0">K/O - Married, No Children</option>
                                                <option value="K1">K/1 - Married, 1 Child</option>
                                                <option value="K2">K/2 - Married, 2 Children</option>
                                                <option value="K3">K/3 - Married, 3 Children</option>
                                                <option value="BM">Not Married</option>
                                                <option value="TK1">TK/1 - Single, 1 Dependent</option>
                                                <option value="TK2">TK/2 - Single, 2 Dependents</option>
                                                <option value="TK3">TK/3 - Single, 3 Dependents</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="birth_date" className="block text-sm font-medium mb-1">
                                                Birth Date
                                            </label>
                                            <input
                                                type="date"
                                                id="birth_date"
                                                value={data.birth_date}
                                                onChange={(e) => setData('birth_date', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.birth_date && <p className="text-red-500 text-sm mt-1">{errors.birth_date}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="religion" className="block text-sm font-medium mb-1">
                                                Religion
                                            </label>
                                            <select
                                                id="religion"
                                                value={data.religion}
                                                onChange={(e) => setData('religion', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Select Religion</option>
                                                <option value="Islam">Islam</option>
                                                <option value="Protestan">Protestan</option>
                                                <option value="Katolik">Katolik</option>
                                                <option value="Hindu">Hindu</option>
                                                <option value="Buddha">Buddha</option>
                                                <option value="Konghucu">Konghucu</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium mb-1">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Address Information */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                                        Address Information
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="street" className="block text-sm font-medium mb-1">
                                                Street
                                            </label>
                                            <input
                                                type="text"
                                                id="street"
                                                value={data.street}
                                                onChange={(e) => setData('street', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="rt" className="block text-sm font-medium mb-1">
                                                    RT
                                                </label>
                                                <input
                                                    type="text"
                                                    id="rt"
                                                    value={data.rt}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || /^\d+$/.test(value)) {
                                                            setData('rt', value.slice(0, 3));
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (e.target.value.length > 0) {
                                                            setData('rt', e.target.value.padStart(3, '0'));
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    maxLength={3}
                                                />
                                                {errors.rt && <p className="text-red-500 text-sm mt-1">{errors.rt}</p>}
                                            </div>

                                            <div>
                                                <label htmlFor="rw" className="block text-sm font-medium mb-1">
                                                    RW
                                                </label>
                                                <input
                                                    type="text"
                                                    id="rw"
                                                    value={data.rw}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || /^\d+$/.test(value)) {
                                                            setData('rw', value.slice(0, 3));
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (e.target.value.length > 0) {
                                                            setData('rw', e.target.value.padStart(3, '0'));
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    maxLength={3}
                                                />
                                                {errors.rw && <p className="text-red-500 text-sm mt-1">{errors.rw}</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="kelurahan" className="block text-sm font-medium mb-1">
                                                Kelurahan/Desa
                                            </label>
                                            <input
                                                type="text"
                                                id="kelurahan"
                                                value={data.kelurahan}
                                                onChange={(e) => setData('kelurahan', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.kelurahan && <p className="text-red-500 text-sm mt-1">{errors.kelurahan}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="kecamatan" className="block text-sm font-medium mb-1">
                                                Kecamatan
                                            </label>
                                            <input
                                                type="text"
                                                id="kecamatan"
                                                value={data.kecamatan}
                                                onChange={(e) => setData('kecamatan', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.kecamatan && <p className="text-red-500 text-sm mt-1">{errors.kecamatan}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="kabupaten_kota" className="block text-sm font-medium mb-1">
                                                Kabupaten/Kota
                                            </label>
                                            <input
                                                type="text"
                                                id="kabupaten_kota"
                                                value={data.kabupaten_kota}
                                                onChange={(e) => setData('kabupaten_kota', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.kabupaten_kota && <p className="text-red-500 text-sm mt-1">{errors.kabupaten_kota}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="provinsi" className="block text-sm font-medium mb-1">
                                                Provinsi
                                            </label>
                                            <input
                                                type="text"
                                                id="provinsi"
                                                value={data.provinsi}
                                                onChange={(e) => setData('provinsi', toTitleCase(e.target.value))}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.provinsi && <p className="text-red-500 text-sm mt-1">{errors.provinsi}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="kode_pos" className="block text-sm font-medium mb-1">
                                                Postal Code
                                            </label>
                                            <input
                                                type="text"
                                                id="kode_pos"
                                                value={data.kode_pos}
                                                onChange={(e) => {
                                                    const numOnly = e.target.value.replace(/\D/g, '').slice(0, 5);
                                                    setData('kode_pos', numOnly);
                                                }}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="12345"
                                                maxLength={5}
                                            />
                                            {errors.kode_pos && <p className="text-red-500 text-sm mt-1">{errors.kode_pos}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section + Subsection */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                                        Section and Sub Section Assignment
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Section Selection */}
                                        <div>
                                            <h4 className="text-md font-medium mb-3">Select Section</h4>
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
                                                            {data.sub_sections.filter(name =>
                                                                section.sub_sections.some(sub => sub.name === name)
                                                            ).length} of {section.sub_sections.length} sub sections selected
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Selected SubSections */}
                                        <div>
                                            <h4 className="text-md font-medium mb-3">Selected Sub Sections</h4>
                                            {data.sub_sections.length === 0 ? (
                                                <p className="text-sm text-gray-500">No sub sections selected yet</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {data.sub_sections.map((name) => (
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

                                {/* Password Section */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 sm:p-6 rounded-lg">
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 text-lg mb-4">
                                        Change Password
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium mb-1">
                                                New Password (leave blank to keep current)
                                            </label>
                                            <input
                                                type="password"
                                                id="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="password_confirmation" className="block text-sm font-medium mb-1">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                id="password_confirmation"
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}

                                                className="w-full bg-white dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : 'Save Changes'}
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
                                Select Sub Sections from {selectedSection.name}
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
                                            className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${tempSelectedSubSections.includes(subSection.name) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
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
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSubSectionModal(false)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}