import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ToastNotification from '../Components/ToastNotification';

export default function UpdatePasswordForm({ className, employee }) {
    const { data, setData, put, errors, processing, recentlySuccessful, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        put(route('employee.employees.password.update', { employee: employee.id }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowSuccessToast(true);
            },
        });
    };

    return (
        <section className={className}>
            <ToastNotification
                message="Berhasil Memperbarui Password!"
                show={showSuccessToast}
                onClose={() => setShowSuccessToast(false)}
                type="success"
            />

            <header>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Perbarui Kata Sandi</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Gunakan kata sandi yang kuat dengan minimal 8 karakter termasuk angka, simbol, dan huruf besar/kecil.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                {/* Current Password */}
                <div className="relative">
                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Kata Sandi Saat Ini
                    </label>
                    <div className="relative">
                        <input
                            id="current_password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200"
                            autoComplete="current-password"
                            placeholder="Masukkan kata sandi saat ini"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            aria-label={showCurrentPassword ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
                        >
                            {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.current_password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.current_password}</p>
                    )}
                </div>

                {/* New Password */}
                <div className="relative">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Kata Sandi Baru
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showNewPassword ? "text" : "password"}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200"
                            autoComplete="new-password"
                            placeholder="Masukkan kata sandi baru"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label={showNewPassword ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                        >
                            {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.password}</p>}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Kata sandi harus minimal 8 karakter.</p>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Konfirmasi Kata Sandi Baru
                    </label>
                    <div className="relative">
                        <input
                            id="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500 sm:text-sm py-2 px-3 dark:bg-gray-700 dark:text-gray-200"
                            autoComplete="new-password"
                            placeholder="Konfirmasi kata sandi baru"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    {errors.password_confirmation && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.password_confirmation}</p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div>
                        {recentlySuccessful && (
                            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Kata sandi berhasil diperbarui
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-sm text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 shadow-sm"
                        disabled={processing}
                    >
                        {processing ? (
                            <div className="flex items-center">
                                <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
                                <span>Memperbarui...</span>
                            </div>
                        ) : (
                            'Perbarui Kata Sandi'
                        )}
                    </button>
                </div>
            </form>
        </section>

    );
}