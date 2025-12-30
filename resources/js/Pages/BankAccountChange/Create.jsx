import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function Create({ employee, pendingChange, incompleteProfile }) {
    const sigCanvas = useRef(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signature, setSignature] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [signatureError, setSignatureError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const { data, setData, post, processing, errors } = useForm({
        new_account_number: '',
        new_bank: '',
        signature: '',
    });
    
    // Cek apakah sudah ada pending request
    useEffect(() => {
        if (pendingChange) {
            setIsSubmitted(true);
        }
    }, [pendingChange]);
    
    // Cek apakah device mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Inisialisasi signature saat komponen mount
    useEffect(() => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    }, []);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Reset error
        setSignatureError('');
        
        // Validasi input dasar
        if (!data.new_account_number.trim()) {
            alert('Harap isi nomor rekening baru.');
            return;
        }
        
        if (!data.new_bank.trim()) {
            alert('Harap pilih bank baru.');
            return;
        }
        
        // Validasi tanda tangan
        if (!signature) {
            setSignatureError('Harap berikan tanda tangan terlebih dahulu.');
            alert('Harap berikan tanda tangan terlebih dahulu.');
            return;
        }
        
        // Check if canvas is empty using safe method
        try {
            const isEmpty = sigCanvas.current?.isEmpty();
            if (isEmpty === undefined || isEmpty) {
                setSignatureError('Harap berikan tanda tangan terlebih dahulu.');
                alert('Harap berikan tanda tangan terlebih dahulu.');
                return;
            }
        } catch (error) {
            console.error('Error checking signature:', error);
            if (!signature) {
                setSignatureError('Harap berikan tanda tangan terlebih dahulu.');
                alert('Harap berikan tanda tangan terlebih dahulu.');
                return;
            }
        }
        
        // Jika signature sudah ada di state, gunakan itu
        if (signature) {
            setData('signature', signature);
            post(route('employee.bank-account-change.store'), {
                onSuccess: () => {
                    setIsSubmitted(true);
                }
            });
            return;
        }
        
        // Jika signature belum disimpan di state, ambil dari canvas
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const signatureData = sigCanvas.current.toDataURL('image/png');
            setData('signature', signatureData);
            post(route('employee.bank-account-change.store'), {
                onSuccess: () => {
                    setIsSubmitted(true);
                }
            });
        } else {
            setSignatureError('Harap berikan tanda tangan terlebih dahulu.');
            alert('Harap berikan tanda tangan terlebih dahulu.');
        }
    };
    
    const handleClearSignature = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
            setSignature(null);
            setData('signature', '');
            setSignatureError('');
        }
    };
    
    const handleStartSigning = () => {
        setIsSigning(true);
        setSignatureError('');
    };
    
    const handleSignatureEnd = useCallback(() => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const sigData = sigCanvas.current.toDataURL('image/png');
            setSignature(sigData);
            setData('signature', sigData);
            setSignatureError('');
        }
    }, [setData]);
    
    const handleCancelSigning = () => {
        setIsSigning(false);
        if (!signature) {
            handleClearSignature();
        }
    };
    
    // Helper function untuk mendapatkan canvas width berdasarkan device
    const getCanvasWidth = () => {
        if (isMobile) {
            return Math.min(window.innerWidth - 100, 400);
        }
        return 550;
    };
    
    // Jika ada pending change dari server atau setelah submit
    // Jika ada pending change dari server atau setelah submit
if (pendingChange || isSubmitted) {
    // Jika masih processing, tampilkan loading
    if (processing) {
        return (
            <AuthenticatedLayout>
                <Head title="Permohonan Ganti Rekening" />
                <div className="py-8">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-center">
                                <div className="mb-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Mengirim Permohonan...
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Sedang mengirim permohonan perubahan rekening Anda.
                                </p>
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }
    
    // Jika sudah selesai processing, tampilkan sukses dengan data
    return (
        <AuthenticatedLayout>
            <Head title="Permohonan Ganti Rekening" />
            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center">
                            <div className="mb-4">
                                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Permohonan Berhasil Diajukan
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Permohonan perubahan rekening Anda telah berhasil diajukan dan sedang menunggu persetujuan.
                            </p>
                            
                            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 max-w-2xl mx-auto">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h4 className="text-md font-semibold text-green-800 mb-2">
                                            Detail Permohonan
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>Nama:</strong><br />
                                                    {employee.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>NIK:</strong><br />
                                                    {employee.nik}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>Rekening Baru:</strong><br />
                                                    {data.new_account_number || pendingChange?.new_account_number}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>Bank Baru:</strong><br />
                                                    {data.new_bank || pendingChange?.new_bank}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>Rekening Lama:</strong><br />
                                                    {employee.bank_account || 'Tidak ada data'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-700">
                                                    <strong>Bank Lama:</strong><br />
                                                    {employee.bank_name || 'Tidak ada data'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <p className="text-sm text-green-700">
                                                <strong>Status:</strong>{' '}
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <svg className="mr-1.5 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                                                        <circle cx="4" cy="4" r="3" />
                                                    </svg>
                                                    Menunggu Persetujuan Admin
                                                </span>
                                            </p>
                                            <p className="text-sm text-green-700 mt-1">
                                                <strong>Tanggal Pengajuan:</strong>{' '}
                                                {pendingChange ? 
                                                    new Date(pendingChange.created_at).toLocaleDateString('id-ID', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 
                                                    new Date().toLocaleDateString('id-ID', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Preview Tanda Tangan */}
                            <div className="mb-6 max-w-2xl mx-auto">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Tanda Tangan Digital</h4>
                                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                                    <div className="text-center">
                                        {signature ? (
                                            <>
                                                <img 
                                                    src={signature} 
                                                    alt="Tanda tangan digital" 
                                                    className="mx-auto border border-gray-300 rounded max-w-xs"
                                                />
                                                <p className="mt-2 text-sm text-gray-600">
                                                    {employee.name}<br />
                                                    <span className="text-xs text-gray-500">NIK: {employee.nik}</span><br />
                                                    <span className="text-xs text-gray-500">
                                                        Ditandatangani: {new Date().toLocaleDateString('id-ID', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </p>
                                            </>
                                        ) : pendingChange?.signature_data ? (
                                            <>
                                                <img 
                                                    src={pendingChange.signature_data} 
                                                    alt="Tanda tangan digital" 
                                                    className="mx-auto border border-gray-300 rounded max-w-xs"
                                                />
                                                <p className="mt-2 text-sm text-gray-600">
                                                    {employee.name}<br />
                                                    <span className="text-xs text-gray-500">NIK: {employee.nik}</span><br />
                                                    <span className="text-xs text-gray-500">
                                                        Ditandatangani: {new Date(pendingChange.signed_at).toLocaleDateString('id-ID', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </p>
                                            </>
                                        ) : (
                                            <div className="py-8">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                                <p className="mt-2 text-sm text-gray-600">
                                                    Tanda tangan tidak tersedia
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 text-center">
                                    Tanda tangan digital ini memiliki kekuatan hukum yang sama dengan tanda tangan basah.
                                </p>
                            </div>
                            
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 max-w-2xl mx-auto">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-700">
                                            <strong>Proses Selanjutnya:</strong><br />
                                            1. Permohonan akan diproses dalam 1-3 hari kerja<br />
                                            2. Anda akan menerima notifikasi via email ketika permohonan disetujui<br />
                                            3. Setelah disetujui, rekening baru akan aktif untuk pembayaran berikutnya
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Link
                                    href={route('employee.dashboard')}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                >
                                    Kembali ke Dashboard
                                </Link>
                                <Link
                                    href={route('employee.bank-account-change.history')}
                                    className="inline-flex items-center ml-3 px-4 py-2 bg-gray-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                >
                                    Lihat Riwayat
                                </Link>
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center ml-3 px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 focus:bg-green-700 active:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Cetak Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CSS untuk Print */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    
                    .print-confirmation, 
                    .print-confirmation * {
                        visibility: visible;
                    }
                    
                    .print-confirmation {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    @page {
                        size: A4 portrait;
                        margin: 20mm;
                    }
                }
                
                .printable-content {
                    display: none;
                }
                
                @media print {
                    .printable-content {
                        display: block;
                    }
                }
            `}</style>
            
            {/* Printable Content (Hidden until print) */}
            <div className="printable-content">
                <div className="print-confirmation p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mb-2">PT. AMERTA INDAH OTSUKA</h1>
                        <h2 className="text-xl font-semibold">KONFIRMASI PERMOHONAN PERUBAHAN REKENING BANK</h2>
                        <p className="text-sm text-gray-600 mt-2">No: PRB/{pendingChange?.id || 'NEW'}/{new Date().getFullYear()}</p>
                    </div>
                    
                    <div className="border-2 border-gray-300 p-6 rounded-lg mb-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="font-semibold">Nama Karyawan:</p>
                                <p>{employee.name}</p>
                            </div>
                            <div>
                                <p className="font-semibold">NIK:</p>
                                <p>{employee.nik}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Bagian:</p>
                                <p>{employee.section}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Penempatan:</p>
                                <p>PT. Amerta Indah Otsuka</p>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 pt-4 mb-4">
                            <h3 className="font-bold text-lg mb-2">Perubahan Rekening Bank</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold">Rekening Sebelumnya:</p>
                                    <p>{employee.bank_account || 'Tidak ada data'} - {employee.bank_name || 'Tidak ada data'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Rekening Baru:</p>
                                    <p>{data.new_account_number || pendingChange?.new_account_number} - {data.new_bank || pendingChange?.new_bank}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 pt-4">
                            <h3 className="font-bold text-lg mb-2">Tanda Tangan Digital</h3>
                            <div className="text-center">
                                {signature || pendingChange?.signature_data ? (
                                    <div>
                                        <img 
                                            src={signature || pendingChange?.signature_data} 
                                            alt="Tanda Tangan Digital" 
                                            className="mx-auto border border-gray-400 rounded max-w-xs mb-2"
                                            style={{ maxHeight: '120px' }}
                                        />
                                        <div className="border-t-2 border-gray-400 mx-auto" style={{ width: '300px' }}></div>
                                        <p className="font-semibold mt-2">{employee.name}</p>
                                        <p className="text-sm">NIK: {employee.nik}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Ditandatangani: {new Date().toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-red-500">[TANDA TANGAN TIDAK TERSEDIA]</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-2">Status Permohonan</h3>
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
                            <p className="font-semibold text-yellow-800">
                                <span className="inline-flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    MENUNGGU PERSETUJUAN ADMIN
                                </span>
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                                Permohonan akan diproses dalam 1-3 hari kerja. Anda akan menerima notifikasi via email ketika permohonan disetujui.
                            </p>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-300 pt-4">
                        <h3 className="font-bold text-lg mb-2">Catatan Penting</h3>
                        <ul className="list-disc pl-5 text-sm">
                            <li>Dokumen ini merupakan bukti pengajuan perubahan rekening bank</li>
                            <li>Tanda tangan digital memiliki kekuatan hukum yang sama dengan tanda tangan basah</li>
                            <li>Rekening baru akan aktif setelah persetujuan dari bagian keuangan</li>
                            <li>Pastikan data rekening baru sudah sesuai dengan buku tabungan</li>
                            <li>Untuk pertanyaan, hubungi HRD atau bagian keuangan</li>
                        </ul>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
                        <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}</p>
                        <p>ID Dokumen: PRB-{pendingChange?.id || 'NEW'}-{new Date().getTime()}</p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
    
    // If profile is incomplete (sama seperti sebelumnya)
    if (incompleteProfile) {
        return (
            <AuthenticatedLayout>
                <Head title="Permohonan Ganti Rekening" />
                <div className="py-8">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-center">
                                <div className="mb-4">
                                    <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Profil Belum Lengkap
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Harap lengkapi data profil Anda terlebih dahulu sebelum mengajukan perubahan rekening.
                                </p>
                                <p className="text-sm text-gray-500 mb-6">
                                    Data yang perlu dilengkapi: kelurahan dan kecamatan
                                </p>
                                <Link
                                    href={route('employee.employees.edit', { employee: employee.id })}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                >
                                    Lengkapi Profil
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }
    
    return (
        <AuthenticatedLayout>
            <Head title="Permohonan Ganti Rekening" />
            <div className="py-8">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-semibold text-gray-900">
                                Formulir Perubahan Rekening Bank
                            </h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Silakan isi formulir berikut untuk mengajukan perubahan rekening bank.
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Current Information */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Data Diri Saat Ini
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            NIK
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.nik}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nama Lengkap
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.name}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Bagian
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.section}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Penempatan
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.placement}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Current Bank Account */}
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Rekening Saat Ini
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nomor Rekening
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.bank_account || 'Tidak ada data'}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nama Bank
                                        </label>
                                        <input
                                            type="text"
                                            value={employee.bank_name || 'Tidak ada data'}
                                            disabled
                                            className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                </div>
                                {!employee.has_bank_account && (
                                    <p className="mt-2 text-sm text-yellow-600">
                                        Saat ini Anda belum memiliki data rekening bank.
                                    </p>
                                )}
                            </div>
                            
                            {/* New Bank Account */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Rekening Baru
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nomor Rekening Baru *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.new_account_number}
                                            onChange={e => setData('new_account_number', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                            placeholder="Contoh: 1234567890"
                                        />
                                        {errors.new_account_number && (
                                            <p className="mt-1 text-sm text-red-600">{errors.new_account_number}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Masukkan nomor rekening baru tanpa spasi atau tanda baca
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nama Bank Baru *
                                        </label>
                                        <select
                                            value={data.new_bank}
                                            onChange={e => setData('new_bank', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        >
                                            <option value="">Pilih Bank</option>
                                            <option value="BNI">BNI</option>
                                            <option value="BRI">BRI</option>
                                            <option value="Mandiri">Mandiri</option>
                                            <option value="BCA">BCA</option>
                                            <option value="BSI">BSI</option>
                                            <option value="Bank Jatim">Bank Jatim</option>
                                            <option value="Bank Lainnya">Bank Lainnya</option>
                                        </select>
                                        {errors.new_bank && (
                                            <p className="mt-1 text-sm text-red-600">{errors.new_bank}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Alamat
                                </label>
                                <textarea
                                    value={employee.address}
                                    disabled
                                    rows="3"
                                    className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                            
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={employee.email}
                                    disabled
                                    className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                            
                            {/* Tanda Tangan Digital */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Tanda Tangan Digital *
                                </h3>
                                
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <p className="text-sm text-yellow-700">
                                                <strong>Petunjuk Tanda Tangan:</strong> {isMobile ? 
                                                    "Gunakan jari Anda untuk memberikan tanda tangan di area bawah." : 
                                                    "Gunakan mouse atau touchpad untuk memberikan tanda tangan di area bawah."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {!isSigning ? (
                                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <p className="mt-2 text-sm text-gray-600">
                                            Klik tombol di bawah untuk mulai memberikan tanda tangan
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleStartSigning}
                                            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            Mulai Tanda Tangan
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                                            <SignatureCanvas
                                                ref={sigCanvas}
                                                penColor="black"
                                                backgroundColor="white"
                                                canvasProps={{
                                                    width: getCanvasWidth(),
                                                    height: 200,
                                                    className: 'signature-canvas w-full border border-gray-200 rounded'
                                                }}
                                                onEnd={handleSignatureEnd}
                                                clearOnResize={false}
                                            />
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={handleClearSignature}
                                                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:bg-red-700 active:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Hapus Tanda Tangan
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={handleCancelSigning}
                                                className="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Selesai
                                            </button>
                                        </div>
                                        
                                        {signature && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Preview Tanda Tangan:</p>
                                                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                                    <img 
                                                        src={signature} 
                                                        alt="Preview tanda tangan" 
                                                        className="border border-gray-300 rounded max-w-full sm:max-w-xs max-h-24 mx-auto sm:mx-0"
                                                    />
                                                    <div className="text-sm text-gray-600">
                                                        <p><strong>Nama:</strong> {employee.name}</p>
                                                        <p><strong>NIK:</strong> {employee.nik}</p>
                                                        <p className="text-xs text-green-600 mt-1">
                                                            ✓ Tanda tangan siap digunakan
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!signature && (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-700">
                                                    <strong>Perhatian:</strong> Silakan berikan tanda tangan Anda di atas sebelum mengirim formulir.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <p className="mt-3 text-sm text-gray-600">
                                    Dengan menandatangani, saya menyetujui dan menyatakan kebenaran data perubahan rekening bank yang saya ajukan.
                                </p>
                                
                                {signatureError && (
                                    <p className="mt-2 text-sm text-red-600">{signatureError}</p>
                                )}
                                
                                {errors.signature && (
                                    <p className="mt-2 text-sm text-red-600">{errors.signature}</p>
                                )}
                            </div>
                            
                            {/* Persetujuan */}
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-700">
                                            <strong>Perhatian:</strong> 
                                            1. Permohonan perubahan rekening akan diproses dalam 1-3 hari kerja setelah persetujuan admin.<br/>
                                            2. Pastikan data yang Anda masukkan sudah benar dan sesuai dengan buku tabungan.<br/>
                                            3. Tanda tangan digital ini memiliki kekuatan hukum yang sama dengan tanda tangan basah.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-200 space-y-3 sm:space-y-0">
                                <Link
                                    href={route('employee.dashboard')}
                                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 w-full sm:w-auto justify-center"
                                >
                                    Batal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing || !signature}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 w-full sm:w-auto justify-center"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mengirim...
                                        </>
                                    ) : (
                                        'Ajukan Permohonan'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            {/* CSS untuk mobile optimization */}
            <style jsx global>{`
                @media (max-width: 640px) {
                    .signature-canvas {
                        touch-action: none;
                        -webkit-user-select: none;
                        -moz-user-select: none;
                        -ms-user-select: none;
                        user-select: none;
                    }
                }
                
                .signature-canvas {
                    cursor: crosshair;
                }
                
                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}