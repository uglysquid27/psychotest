import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link, Head, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';

export default function SuratResignCreate({ auth, authenticatedEmployee }) {
    const { data, setData, post, processing, errors } = useForm({
        employee_id: authenticatedEmployee ? authenticatedEmployee.id : '',
        tanggal: '',
        reason: '',
    });

    // Calculate tomorrow's date for the minimum date
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

    const submit = (e) => {
        e.preventDefault();

        post(route('employee.resign.store'), {
            onSuccess: () => {
                router.visit(route('employee.resign.index'));
            },
            onError: (err) => {
                console.error('Error submitting resignation:', err);
            },
        });
    };

    // Show loading state if authenticatedEmployee is null
    if (!authenticatedEmployee) {
        return (
            <AuthenticatedLayout
                user={auth.user}
                header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Ajukan Surat Resign</h2>}
            >
                <Head title="Ajukan Surat Resign" />
                <div className="py-12">
                    <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-gray-900 text-center">
                                <p>Loading employee data...</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    Jika data tidak muncul, silakan refresh halaman atau hubungi administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Ajukan Surat Resign</h2>}
        >
            <Head title="Ajukan Surat Resign" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <form onSubmit={submit} className="space-y-6">
                                {/* Employee Information (Read-only) */}
                                <div>
                                    <InputLabel value="Karyawan" />
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-300">
                                        <p className="text-sm text-gray-800">
                                            <strong>{authenticatedEmployee.name}</strong> ({authenticatedEmployee.nik})
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {authenticatedEmployee.department} - {authenticatedEmployee.position}
                                        </p>
                                    </div>
                                    <input 
                                        type="hidden" 
                                        name="employee_id" 
                                        value={authenticatedEmployee.id} 
                                    />
                                </div>

                                {/* Resign Date Input */}
                                <div>
                                    <InputLabel htmlFor="tanggal" value="Tanggal Resign" />
                                    <TextInput
                                        id="tanggal"
                                        type="date"
                                        name="tanggal"
                                        value={data.tanggal}
                                        className="mt-1 block w-full"
                                        onChange={(e) => setData('tanggal', e.target.value)}
                                        min={tomorrow}
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Tanggal resign harus besok atau setelahnya
                                    </p>
                                    <InputError message={errors.tanggal} className="mt-2" />
                                </div>

                                {/* Reason Textarea */}
                                <div>
                                    <InputLabel htmlFor="reason" value="Alasan Resign" />
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        value={data.reason}
                                        className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                        onChange={(e) => setData('reason', e.target.value)}
                                        rows="4"
                                        placeholder="Jelaskan alasan mengajukan resign (minimal 10 karakter)..."
                                        required
                                    ></textarea>
                                    <InputError message={errors.reason} className="mt-2" />
                                </div>

                                <div className="flex items-center justify-end mt-4">
                                    <Link
                                        href={route('employee.resign.index')}
                                        className="mr-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                        Batal
                                    </Link>
                                    <PrimaryButton className="bg-red-600 hover:bg-red-700" disabled={processing}>
                                        {processing ? 'Mengajukan...' : 'Ajukan Resign'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}