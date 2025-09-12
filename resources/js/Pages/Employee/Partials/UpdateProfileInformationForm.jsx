import { useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import ToastNotification from '../Components/ToastNotification';

export default function UpdateProfileInformationForm({ employee, className }) {
    const formattedBirthDate = employee.birth_date
        ? format(parseISO(employee.birth_date), 'yyyy-MM-dd')
        : '';

    const { data, setData, put, errors, processing, recentlySuccessful } = useForm({
        name: employee.name,
        ktp: employee.ktp,
        email: employee.email,
        type: employee.type,
        gender: employee.gender,
        group: employee.group,
        marital: employee.marital,
        birth_date: formattedBirthDate,
        religion: employee.religion,
        phone: employee.phone,
        street: employee.street,
        rt: employee.rt,
        rw: employee.rw,
        kelurahan: employee.kelurahan,
        kecamatan: employee.kecamatan,
        kabupaten_kota: employee.kabupaten_kota,
        provinsi: employee.provinsi || 'Jawa Timur',
        kode_pos: employee.kode_pos,
    });

    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Function to capitalize first letter of each word
    const toTitleCase = (str) => {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    };

    // Function to format RT/RW to 3 digits
    const formatRtRw = (value) => {
        const numOnly = value.replace(/\D/g, '');
        if (numOnly === '') return '';
        const num = parseInt(numOnly);
        return num.toString().padStart(3, '0');
    };

    // Check if address is locked (kelurahan and kecamatan are filled)
    const isAddressLocked = employee.kelurahan && employee.kecamatan;

    const submit = (e) => {
        e.preventDefault();

        // If address is locked, prevent submission
        if (isAddressLocked) {
            return;
        }

        // Format RT/RW before submitting
        const formattedData = {
            ...data,
            rt: data.rt ? data.rt.padStart(3, '0') : '',
            rw: data.rw ? data.rw.padStart(3, '0') : ''
        };

        put(route('employee.employees.update', employee.id), formattedData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowSuccessToast(true);
            },
        });
    };

    return (
        <section className={className}>
            <ToastNotification
                message="Berhasil Memperbarui Profil"
                show={showSuccessToast}
                onClose={() => setShowSuccessToast(false)}
                type="success"
            />

            <header>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Profil Karyawan
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Perbarui informasi pribadi dan detail kontak karyawan.
                </p>
                {isAddressLocked && (
                    <div className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
                        <p className="text-sm">Data karyawan telah terkunci dan tidak dapat diubah karena data diri sudah terisi.</p>
                    </div>
                )}
            </header>

            <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {/* NIK */}
                <div className="sm:col-span-3">
                    <label htmlFor="nik" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        NIK <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            id="nik"
                            type="text"
                            value={employee.nik}
                            readOnly
                            className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 sm:text-sm py-2 px-3"
                        />
                    </div>
                </div>

                {/* KTP */}
                <div className="sm:col-span-3">
                    <label htmlFor="ktp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nomor KTP <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative">
                        <input
                            id="ktp"
                            type="text"
                            value={data.ktp}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                                setData('ktp', value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 pr-12 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            maxLength={16}
                            readOnly={isAddressLocked}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {data.ktp ? data.ktp.length : 0}/16
                            </span>
                        </div>
                    </div>
                    {errors.ktp && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.ktp}</p>}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Masukkan 16 digit nomor KTP
                    </p>
                </div>

                {/* Name */}
                <div className="sm:col-span-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('name', toTitleCase(e.target.value));
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            readOnly={isAddressLocked}
                        />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="sm:col-span-6">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('email', e.target.value.toLowerCase());
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            readOnly={isAddressLocked}
                        />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.email}</p>}
                </div>

                {/* Type */}
                <div className="sm:col-span-3">
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tipe Karyawan <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('type', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${
                                isAddressLocked ? 'cursor-not-allowed' : ''
                            }`}
                            disabled={true} // Always disabled as per original code
                        >
                            <option value="harian">Harian</option>
                            <option value="bulanan">Bulanan</option>
                        </select>
                    </div>
                    {errors.type && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.type}</p>}
                </div>

                {/* Gender */}
                <div className="sm:col-span-3">
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Jenis Kelamin <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <select
                            id="gender"
                            value={data.gender}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('gender', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            disabled={isAddressLocked}
                        >
                            <option value="male">Laki-laki</option>
                            <option value="female">Perempuan</option>
                        </select>
                    </div>
                    {errors.gender && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.gender}</p>}
                </div>

                {/* Marital Status */}
                <div className="sm:col-span-3">
                    <label htmlFor="marital" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status Perkawinan
                    </label>
                    <div className="mt-1">
                        <select
                            id="marital"
                            value={data.marital}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('marital', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            disabled={isAddressLocked}
                        >
                            <option value="">Pilih Status</option>
                            <option value="K0">K/O - Nikah, Tanpa Anak</option>
                            <option value="K1">K/1 - Nikah, Anak 1</option>
                            <option value="K2">K/2 - Nikah, Anak 2</option>
                            <option value="K3">K/3 - Nikah, Anak 3</option>
                            <option value="BM">Belum Menikah</option>
                            <option value="TK1">TK/1 - Tidak Nikah, 1 Tanggungan</option>
                            <option value="TK2">TK/2 - Tidak Nikah, 2 Tanggungan</option>
                            <option value="TK3">TK/3 - Tidak Nikah, 3 Tanggungan</option>
                        </select>
                    </div>
                    {errors.marital && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.marital}</p>}
                </div>

                {/* Birth Date */}
                <div className="sm:col-span-3">
                    <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tanggal Lahir <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            id="birth_date"
                            type="date"
                            value={data.birth_date || ''}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('birth_date', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            readOnly={isAddressLocked}
                        />
                    </div>
                    {errors.birth_date && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.birth_date}</p>}
                </div>

                {/* Religion */}
                <div className="sm:col-span-3">
                    <label htmlFor="religion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Agama <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <select
                            id="religion"
                            value={data.religion}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('religion', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            required
                            disabled={isAddressLocked}
                        >
                            <option value="">Pilih Agama</option>
                            <option value="Islam">Islam</option>
                            <option value="Protestan">Protestan</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                            <option value="Konghucu">Konghucu</option>
                        </select>
                    </div>
                    {errors.religion && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.religion}</p>}
                </div>

                {/* Phone */}
                <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nomor Telepon <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            id="phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => {
                                if (isAddressLocked) return;
                                setData('phone', e.target.value);
                            }}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                            }`}
                            readOnly={isAddressLocked}
                        />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.phone}</p>}
                </div>

                {/* Address Fields */}
                <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alamat Lengkap
                    </label>
                    <div className="mt-1 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                        {/* Street */}
                        <div className="sm:col-span-6">
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Jalan/Dusun <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="street"
                                type="text"
                                value={data.street}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    setData('street', toTitleCase(e.target.value));
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.street && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.street}</p>}
                        </div>

                        {/* RT */}
                        <div className="sm:col-span-1">
                            <label htmlFor="rt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                RT <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="rt"
                                type="text"
                                value={data.rt}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    const value = e.target.value;
                                    // Only allow numbers and empty string
                                    if (value === '' || /^\d+$/.test(value)) {
                                        // Don't pad while typing, only when blurring or submitting
                                        setData('rt', value.slice(0, 3));
                                    }
                                }}
                                onBlur={(e) => {
                                    if (isAddressLocked) return;
                                    // Pad with zeros only when leaving the field
                                    if (e.target.value.length > 0) {
                                        setData('rt', e.target.value.padStart(3, '0'));
                                    }
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                maxLength={3}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.rt && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.rt}</p>}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Format: 001-999
                            </p>
                        </div>

                        {/* RW */}
                        <div className="sm:col-span-1">
                            <label htmlFor="rw" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                RW <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="rw"
                                type="text"
                                value={data.rw}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    const value = e.target.value;
                                    // Only allow numbers and empty string
                                    if (value === '' || /^\d+$/.test(value)) {
                                        // Don't pad while typing, only when blurring or submitting
                                        setData('rw', value.slice(0, 3));
                                    }
                                }}
                                onBlur={(e) => {
                                    if (isAddressLocked) return;
                                    // Pad with zeros only when leaving the field
                                    if (e.target.value.length > 0) {
                                        setData('rw', e.target.value.padStart(3, '0'));
                                    }
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                maxLength={3}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.rw && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.rw}</p>}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Format: 001-999
                            </p>
                        </div>

                        {/* Kelurahan/Kecamatan */}
                        <div className="sm:col-span-2">
                            <label htmlFor="kelurahan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Kelurahan/Desa <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="kelurahan"
                                type="text"
                                value={data.kelurahan}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    setData('kelurahan', toTitleCase(e.target.value));
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.kelurahan && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.kelurahan}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="kecamatan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Kecamatan <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="kecamatan"
                                type="text"
                                value={data.kecamatan}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    setData('kecamatan', toTitleCase(e.target.value));
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.kecamatan && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.kecamatan}</p>}
                        </div>

                        {/* Kabupaten/Kota */}
                        <div className="sm:col-span-3">
                            <label htmlFor="kabupaten_kota" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Kabupaten/Kota <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="kabupaten_kota"
                                type="text"
                                value={data.kabupaten_kota}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    setData('kabupaten_kota', toTitleCase(e.target.value));
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.kabupaten_kota && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.kabupaten_kota}</p>}
                        </div>

                        {/* Provinsi */}
                        <div className="sm:col-span-2">
                            <label htmlFor="provinsi" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Provinsi <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="provinsi"
                                type="text"
                                value={data.provinsi}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    setData('provinsi', toTitleCase(e.target.value));
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.provinsi && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.provinsi}</p>}
                        </div>

                        {/* Kode Pos */}
                        <div className="sm:col-span-1">
                            <label htmlFor="kode_pos" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Kode Pos <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="kode_pos"
                                type="text"
                                value={data.kode_pos}
                                onChange={(e) => {
                                    if (isAddressLocked) return;
                                    const numOnly = e.target.value.replace(/\D/g, '').slice(0, 5);
                                    setData('kode_pos', numOnly);
                                }}
                                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200 ${
                                    isAddressLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                                }`}
                                placeholder="12345"
                                maxLength={5}
                                required
                                readOnly={isAddressLocked}
                            />
                            {errors.kode_pos && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.kode_pos}</p>}
                        </div>
                    </div>
                </div>

                <div className="sm:col-span-6 flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div>
                        {recentlySuccessful && (
                            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Profil berhasil diperbarui
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className={`inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-sm text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm ${
                            isAddressLocked ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : ''
                        }`}
                        disabled={processing || isAddressLocked}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </section>
    );
}