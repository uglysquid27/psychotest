import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { useRef, useState, useEffect } from 'react';
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
    const [photoRequired, setPhotoRequired] = useState(!employee.photo);
    const [showPhotoWarning, setShowPhotoWarning] = useState(false);

    const fileInputRef = useRef(null);

    // Check if photo is required on component mount
    useEffect(() => {
        if (!employee.photo) {
            setShowPhotoWarning(true);
        }
    }, [employee.photo]);

    const handlePhotoClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Hanya file gambar (JPEG, PNG, JPG, GIF) yang diperbolehkan!');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file maksimal 2MB!');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);

        // Store in form state
        setData('photo', file);
        setShowPhotoWarning(false);
    };

    const handlePhotoUpload = () => {
        if (!data.photo) {
            alert('Silakan pilih foto terlebih dahulu!');
            return;
        }

        post(route('employee.employees.photo.update', employee.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setPhotoRequired(false);
                setShowPhotoWarning(false);
                console.log('Photo updated successfully');
            },
            onError: (err) => {
                console.error('Error uploading photo:', err);
            }
        });
    };

    const removePhoto = () => {
        setPreview(employee.photo ? `/storage/${employee.photo}` : null);
        setData('photo', null);
        if (!employee.photo) {
            setShowPhotoWarning(true);
        }
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
                    {/* Photo Required Warning */}
                    {showPhotoWarning && (
                        <div className="mb-6 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                        Foto Profil Diperlukan
                                    </h3>
                                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                                        Anda harus mengupload foto profil untuk melengkapi data karyawan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* Profile Section */}
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg rounded-3xl border border-gray-100 dark:border-gray-700">
                            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-4 mb-6">
                                    {/* Photo */}
                                    <div className="relative">
                                        <div
                                            className={`relative flex-shrink-0 h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer group border-4 ${
                                                photoRequired ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-600'
                                            } hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors`}
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
                                                <div className="text-center">
                                                    <svg
                                                        className="h-8 w-8 text-gray-400 mx-auto"
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
                                                    {photoRequired && (
                                                        <div className="text-xs text-red-500 mt-1 font-medium">
                                                            Wajib
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200 rounded-full">
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
                                        
                                        {/* Required indicator */}
                                        {photoRequired && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">!</span>
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/png,image/jpg,image/gif"
                                        className="hidden"
                                    />

                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{employee.name}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={handlePhotoClick}
                                                className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                {preview ? 'Ganti Foto' : 'Upload Foto'} <span className="text-red-500">*</span>
                                            </button>
                                            {data.photo && (
                                                <button
                                                    onClick={removePhoto}
                                                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    Batal
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Format: JPEG, PNG, JPG, GIF. Maksimal 2MB.
                                        </p>
                                    </div>
                                </div>

                                {/* Save Photo Button */}
                                {data.photo && (
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                                    Foto siap diupload
                                                </p>
                                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                                    Klik "Simpan Foto" untuk menyimpan perubahan
                                                </p>
                                            </div>
                                            <button
                                                onClick={handlePhotoUpload}
                                                disabled={processing}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors flex items-center gap-2"
                                            >
                                                {processing ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Menyimpan...
                                                    </>
                                                ) : (
                                                    'Simpan Foto'
                                                )}
                                            </button>
                                        </div>
                                        {errors.photo && (
                                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.photo}</p>
                                        )}
                                    </div>
                                )}

                                {/* Profile completion status */}
                                {/* <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                Status Profil
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {photoRequired ? 'Profil belum lengkap' : 'Profil sudah lengkap'}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            photoRequired 
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {photoRequired ? 'Perlu Foto' : 'Lengkap'}
                                        </div>
                                    </div>
                                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                photoRequired ? 'bg-red-500 w-3/4' : 'bg-green-500 w-full'
                                            }`}
                                        ></div>
                                    </div>
                                </div> */}

                                {/* Profile Info Form */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
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
                          {/* <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg rounded-3xl border border-gray-100 dark:border-gray-700">
                            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Pengajuan Resign</h3>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                                    <div className="max-w-3xl">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Jika Anda ingin mengajukan resign, silakan kunjungi halaman pengajuan resign.
                                        </p>
                                        <Link
                                            href={route('employee.resign.index')}
                                            className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            Ajukan Resign
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}