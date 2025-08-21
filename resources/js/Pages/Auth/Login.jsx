import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';

// Icons dari Heroicons (pastikan sudah terinstal atau ganti dengan icon lain)
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        credential: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    // Reset route to /login when component mounts
    useEffect(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
            router.replace('/login', {}, { preserveState: true });
        }
    }, []);

    const submit = (e) => {
        e.preventDefault();

        const isNik = /^EMP\d+$/.test(data.credential) || /^\d+$/.test(data.credential);
        const routeName = isNik ? 'employee.login' : 'login';

        post(route(routeName), {
            onFinish: () => reset('password'),
            onError: (err) => {
                if (err.nik) errors.credential = err.nik;
                if (err.email) errors.credential = err.email;
            }
        });
    };

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="w-full rounded-lg bg-white dark:bg-gray-900 p-8 shadow-xl md:max-w-md">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
                    Selamat Datang Kembali!
                </h2>

                {status && (
                    <div className="mb-4 rounded-md bg-green-100 dark:bg-green-900 p-3 text-sm font-medium text-green-600 dark:text-green-300">
                        {status}
                    </div>
                )}

                <form onSubmit={submit}>
                    <div className="mb-5">
                        <InputLabel
                            htmlFor="credential"
                            value="Email / NIK"
                            className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                        />

                        <TextInput
                            id="credential"
                            type="text"
                            name="credential"
                            value={data.credential}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 shadow-sm transition duration-200 ease-in-out focus:border-indigo-500 focus:ring-indigo-500"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('credential', e.target.value)}
                            placeholder="Masukkan Email atau NIK"
                        />

                        <InputError
                            message={errors.credential || errors.nik || errors.email}
                            className="mt-2 text-red-500"
                        />
                    </div>

                    <div className="relative mb-6">
                        <InputLabel
                            htmlFor="password"
                            value="Password"
                            className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                        />

                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 pr-10 shadow-sm transition duration-200 ease-in-out focus:border-indigo-500 focus:ring-indigo-500"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Masukkan Password Anda"
                        />

                        <span
                            className="absolute inset-y-0 right-0 top-6 flex cursor-pointer items-center pr-3 text-gray-400 dark:text-gray-500"
                            onClick={toggleShowPassword}
                            role="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                                <EyeIcon className="h-5 w-5" />
                            )}
                        </span>

                        <InputError
                            message={errors.password}
                            className="mt-2 text-red-500"
                        />
                    </div>

                    <div className="mb-6 flex items-center justify-between">
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="rounded-md text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors duration-200 ease-in-out hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Lupa password?
                            </Link>
                        )}
                    </div>

                    <PrimaryButton
                        className={`w-full rounded-md py-3 font-semibold transition duration-200 ease-in-out flex items-center justify-center ${processing
                                ? 'cursor-not-allowed bg-indigo-400 dark:bg-indigo-500'
                                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                            }`}
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>Masuk</span>
                        )}
                    </PrimaryButton>
                </form>
            </div>
        </GuestLayout>
    );
}