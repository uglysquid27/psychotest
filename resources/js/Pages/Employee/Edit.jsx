import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { useRef, useState } from 'react';
import { Link } from '@inertiajs/react';

export default function Edit({ employee }) {
    // For profile update form
    const profileForm = useForm({});
    const { auth, incompleteProfile } = usePage().props;

    // For photo upload form
    const { data, setData, post, processing, errors } = useForm({
        photo: null,
        _method: 'PUT'
    });

    const [preview, setPreview] = useState(
        employee.photo ? `/storage/${employee.photo}` : null
    );

    const fileInputRef = useRef(null);

    const handlePhotoClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);

        // Store in form state
        setData('photo', file);
    };

    const handlePhotoUpload = () => {
        if (!data.photo) return;

        post(route('employee.employees.photo.update', employee.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                console.log('Photo updated successfully');
            },
            onError: (err) => {
                console.error('Error uploading photo:', err);
            }
        });
    };

    return (
        <AuthenticatedLayout
            user={auth?.user}
            hideSidebar={incompleteProfile}
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        Profil Karyawan
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Nomer Induk Karyawan: {employee.nik || 'N/A'}
                    </div>
                </div>
            }
        >
            <Head title="Employee Profile" />

            <div className="min-h-screen dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto py-6">
                    {/* Jika belum isi data diri */}
                    
                        <div className="space-y-8">
                            {/* Profile Section */}
                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center space-x-4 mb-6">
                                        {/* Photo */}
                                        <div
                                            className="relative flex-shrink-0 h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer group"
                                            onClick={handlePhotoClick}
                                            title="Klik untuk mengubah foto"
                                        >
                                            {preview ? (
                                                <img
                                                    src={preview}
                                                    alt="Employee photo"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <svg
                                                    className="h-8 w-8 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.5"
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            )}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                                                <svg
                                                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                                    ></path>
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                                    ></path>
                                                </svg>
                                            </div>
                                        </div>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />

                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{employee.name}</h3>
                                        </div>
                                    </div>

                                    {/* Save Photo Button */}
                                    {data.photo && (
                                        <div className="mt-2">
                                            <button
                                                onClick={handlePhotoUpload}
                                                disabled={processing}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-md"
                                            >
                                                {processing ? 'Menyimpan...' : 'Simpan Foto'}
                                            </button>
                                            {errors.photo && (
                                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.photo}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Profile Info Form */}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg mt-6">
                                        <UpdateProfileInformationForm
                                            employee={employee}
                                            className="max-w-3xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Security Section */}
                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Security Settings</h3>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                                        <UpdatePasswordForm
                                            employee={employee}
                                            className="max-w-3xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}