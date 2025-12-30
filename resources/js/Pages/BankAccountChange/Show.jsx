import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function BankAccountChangeShow({ auth, changeLog }) {
    const [remarks, setRemarks] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionType, setActionType] = useState(null);

    const handleStatusUpdate = (status) => {
        if (status === 'rejected' && !remarks.trim()) {
            alert('Harap masukkan alasan penolakan');
            return;
        }

        if (confirm(`Apakah Anda yakin ingin ${status === 'approved' ? 'menyetujui' : 'menolak'} permohonan ini?`)) {
            setIsProcessing(true);
            setActionType(status);
            
            router.post(route('employee.bank-account-change.update-status', changeLog.id), {
                status: status,
                remarks: status === 'approved' ? 'Permohonan disetujui' : remarks
            }, {
                preserveState: true,
                onSuccess: () => {
                    setIsProcessing(false);
                    setActionType(null);
                },
                onError: () => {
                    setIsProcessing(false);
                    setActionType(null);
                }
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'approved': return 'bg-green-100 text-green-800 border-green-300';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Menunggu Persetujuan';
            case 'approved': return 'Disetujui';
            case 'rejected': return 'Ditolak';
            default: return status;
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getCurrentDate = () => {
        return new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Surat Pernyataan Perubahan Rekening</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Times New Roman', serif;
                        padding: 1.5cm 2cm;
                        line-height: 1.4;
                        font-size: 11pt;
                        color: #000;
                        height: 100vh;
                        overflow: hidden;
                    }
                    
                    @media print {
                        html, body {
                            width: 210mm;
                            height: 297mm;
                            margin: 0;
                            padding: 0;
                        }
                        
                        body {
                            padding: 1.5cm 2cm;
                        }
                        
                        @page {
                            margin: 0;
                        }
                    }
                    
                    .title {
                        text-align: center;
                        font-weight: bold;
                        font-size: 12pt;
                        margin: 10px 0 15px 0;
                        text-decoration: underline;
                        letter-spacing: 0.5px;
                    }
                    
                    .content {
                        text-align: justify;
                        margin-bottom: 8px;
                        font-size: 11pt;
                    }
                    
                    .identity-section {
                        margin: 8px 0 8px 30px;
                    }
                    
                    .identity-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 3px;
                        font-size: 11pt;
                    }
                    
                    .identity-label {
                        display: table-cell;
                        width: 140px;
                        padding-right: 10px;
                    }
                    
                    .identity-colon {
                        display: table-cell;
                        width: 15px;
                    }
                    
                    .identity-value {
                        display: table-cell;
                    }
                    
                    .account-section {
                        margin: 8px 0 8px 30px;
                    }
                    
                    .closing-statement {
                        text-align: justify;
                        margin: 15px 0 20px 0;
                        text-indent: 40px;
                        font-size: 11pt;
                    }
                    
                    .signature-area {
                        margin-top: 20px;
                        margin-left: 55%;
                    }
                    
                    .signature-location {
                        margin-bottom: 5px;
                        font-size: 11pt;
                    }
                    
                    .signature-title {
                        margin-bottom: 50px;
                        font-size: 11pt;
                    }
                    
                    .signature-name {
                        font-weight: bold;
                        text-decoration: underline;
                        margin-top: 8px;
                        font-size: 11pt;
                    }
                    
                    .signature-nik {
                        font-size: 10pt;
                        margin-top: 2px;
                    }
                    
                    .signature-image {
                        max-width: 140px;
                        max-height: 50px;
                        margin-top: -48px;
                        margin-bottom: -2px;
                    }
                </style>
            </head>
            <body>
                <div class="title">SURAT PERNYATAAN PERUBAHAN REKENING</div>
                
                <div class="content">
                    Yang bertandatangan di bawah ini:
                </div>
                
                <div class="identity-section">
                    <div class="identity-row">
                        <div class="identity-label">Nama</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.employee?.name || 'N/A'}</div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">NIK</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.nik}</div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Bagian</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.employee?.section || 'N/A'}</div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Alamat</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.employee?.address || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="content">
                    Dengan ini menyatakan bahwa saya mengajukan perubahan nomor rekening bank untuk pembayaran gaji dari:
                </div>
                
                <div class="account-section">
                    <div class="identity-row">
                        <div class="identity-label">Nomor Rekening</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.old_account_number || 'Tidak ada data sebelumnya'}</div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Nama Bank</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.old_bank || 'Tidak ada data sebelumnya'}</div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Atas Nama</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value">${changeLog.employee?.name || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="content">
                    Menjadi:
                </div>
                
                <div class="account-section">
                    <div class="identity-row">
                        <div class="identity-label">Nomor Rekening</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value"><strong>${changeLog.new_account_number}</strong></div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Nama Bank</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value"><strong>${changeLog.new_bank}</strong></div>
                    </div>
                    <div class="identity-row">
                        <div class="identity-label">Atas Nama</div>
                        <div class="identity-colon">:</div>
                        <div class="identity-value"><strong>${changeLog.employee?.name || 'N/A'}</strong></div>
                    </div>
                </div>
                
                <div class="closing-statement">
                    Demikian surat pernyataan ini saya buat dengan sebenar-benarnya untuk dapat dipergunakan 
                    sebagaimana mestinya. Apabila dikemudian hari terdapat kesalahan data atau permasalahan yang 
                    timbul akibat perubahan rekening ini, maka saya bersedia bertanggung jawab sepenuhnya.
                </div>
                
                <div class="signature-area">
                    <div class="signature-location">
                        Pasuruan, ${changeLog.signed_at ? formatDateShort(changeLog.signed_at) : getCurrentDate()}
                    </div>
                    <div class="signature-title">
                        Yang membuat pernyataan,
                    </div>
                    ${changeLog.signature_data ? `
                        <img 
                            src="${changeLog.signature_data}" 
                            alt="Tanda Tangan" 
                            class="signature-image"
                        />
                    ` : ''}
                    <div class="signature-name">
                        ${changeLog.employee?.name || changeLog.nik}
                    </div>
                    <div class="signature-nik">
                        NIK: ${changeLog.nik}
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                    
                    window.onafterprint = function() {
                        setTimeout(function() {
                            window.close();
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadPdf = () => {
        handlePrint(); // Use the same print functionality
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Detail Permohonan Ganti Rekening
                    </h2>
                    <div className="mt-2 sm:mt-0">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(changeLog.status)}`}>
                            {getStatusText(changeLog.status)}
                        </span>
                    </div>
                </div>
            }
        >
            <Head title={`Detail Permohonan - ${changeLog.employee?.name || changeLog.nik}`} />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <div className="mb-6">
                        <Link
                            href={route('employee.bank-account-change.index')}
                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali ke Daftar
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Information */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Employee Information Card */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Data Karyawan
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                NIK
                                            </label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {changeLog.nik}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Nama Lengkap
                                            </label>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {changeLog.employee?.name || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Bagian
                                            </label>
                                            <p className="text-gray-900">
                                                {changeLog.employee?.section || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Penempatan
                                            </label>
                                            <p className="text-gray-900">
                                                PT. Amerta Indah Otsuka
                                            </p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Alamat
                                            </label>
                                            <p className="text-gray-900">
                                                {changeLog.employee?.address || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Email
                                            </label>
                                            <p className="text-gray-900">
                                                {changeLog.employee?.email || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Account Changes Card */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                                        Perubahan Rekening Bank
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {/* Old Account */}
                                        <div className="border-l-4 border-yellow-400 pl-4 py-2 bg-yellow-50 rounded-r">
                                            <div className="flex items-center mb-2">
                                                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h4 className="font-medium text-yellow-800">Rekening Saat Ini</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-yellow-600 mb-1">
                                                        Nomor Rekening
                                                    </label>
                                                    <p className="text-gray-900 font-medium">
                                                        {changeLog.old_account_number || 'Tidak ada data'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-yellow-600 mb-1">
                                                        Nama Bank
                                                    </label>
                                                    <p className="text-gray-900 font-medium">
                                                        {changeLog.old_bank || 'Tidak ada data'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow Icon */}
                                        <div className="text-center">
                                            <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>

                                        {/* New Account */}
                                        <div className="border-l-4 border-green-400 pl-4 py-2 bg-green-50 rounded-r">
                                            <div className="flex items-center mb-2">
                                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h4 className="font-medium text-green-800">Rekening Baru</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-green-600 mb-1">
                                                        Nomor Rekening
                                                    </label>
                                                    <p className="text-gray-900 font-medium">
                                                        {changeLog.new_account_number}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-green-600 mb-1">
                                                        Nama Bank
                                                    </label>
                                                    <p className="text-gray-900 font-medium">
                                                        {changeLog.new_bank}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Section */}
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Tanda Tangan Digital
                                    </h3>
                                    
                                    {changeLog.signature_data ? (
                                        <div className="text-center">
                                            <div className="inline-block p-4 border border-gray-300 rounded-lg bg-white">
                                                <img 
                                                    src={changeLog.signature_data} 
                                                    alt="Tanda tangan digital" 
                                                    className="mx-auto max-w-xs h-auto border border-gray-200 rounded"
                                                />
                                                <div className="mt-3 text-sm text-gray-600">
                                                    <p className="font-semibold">{changeLog.employee?.name || changeLog.nik}</p>
                                                    <p>NIK: {changeLog.nik}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Ditandatangani: {formatDate(changeLog.signed_at || changeLog.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Tanda tangan digital ini memiliki kekuatan hukum yang sama dengan tanda tangan basah.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="mt-2 text-sm text-gray-600">
                                                Tanda tangan tidak tersedia
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Action Panel & Timeline */}
                        <div className="space-y-6">
                            {/* Action Panel */}
                            {changeLog.status === 'pending' ? (
                                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                    <div className="p-6 border-b border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Tindakan
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <button
                                                onClick={() => handleStatusUpdate('approved')}
                                                disabled={isProcessing && actionType === 'approved'}
                                                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isProcessing && actionType === 'approved' ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Memproses...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Setujui Permohonan
                                                    </>
                                                )}
                                            </button>

                                            <div className="space-y-3">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Alasan Penolakan
                                                </label>
                                                <textarea
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    rows="3"
                                                    className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 p-2"
                                                    placeholder="Masukkan alasan penolakan..."
                                                />
                                                <button
                                                    onClick={() => handleStatusUpdate('rejected')}
                                                    disabled={isProcessing && actionType === 'rejected'}
                                                    className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isProcessing && actionType === 'rejected' ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Memproses...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            Tolak Permohonan
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Status Permohonan
                                        </h3>
                                        
                                        <div className={`p-4 rounded-lg border ${getStatusColor(changeLog.status)}`}>
                                            <div className="flex items-center mb-2">
                                                {changeLog.status === 'approved' ? (
                                                    <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                <span className="font-bold text-lg">
                                                    {getStatusText(changeLog.status)}
                                                </span>
                                            </div>
                                            
                                            {changeLog.approved_by && (
                                                <div className="mt-2">
                                                    <p className="text-sm">
                                                        <span className="font-medium">Disetujui oleh:</span> {changeLog.approver?.name || 'Admin'}
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        <span className="font-medium">Tanggal:</span> {formatDate(changeLog.approved_at)}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {changeLog.remarks && (
                                                <div className="mt-3 pt-3 border-t border-gray-300">
                                                    <p className="text-sm font-medium mb-1">Catatan:</p>
                                                    <p className="text-sm bg-white p-2 rounded border">
                                                        {changeLog.remarks}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {changeLog.status === 'approved' && (
                                            <div className="mt-4">
                                                <button
                                                    onClick={handleDownloadPdf}
                                                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                >
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Download PDF
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Timeline Card */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Timeline Permohonan
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Created */}
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Permohonan Diajukan
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(changeLog.created_at)}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Oleh: {changeLog.requester?.name || 'Karyawan'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Signed */}
                                        {changeLog.signed_at && (
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Tanda Tangan Digital
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatDate(changeLog.signed_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Approved/Rejected */}
                                        {changeLog.approved_at && (
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <div className={`w-3 h-3 rounded-full mt-1 ${changeLog.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {changeLog.status === 'approved' ? 'Permohonan Disetujui' : 'Permohonan Ditolak'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatDate(changeLog.approved_at)}
                                                    </p>
                                                    {changeLog.approver && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Oleh: {changeLog.approver.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Updated */}
                                        {changeLog.updated_at !== changeLog.created_at && (
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <div className="w-3 h-3 bg-gray-400 rounded-full mt-1"></div>
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Terakhir Diperbarui
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatDate(changeLog.updated_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Tindakan Cepat
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {/* <Link
                                            href={route('employee-attendance.show', changeLog.employee?.id)}
                                            className="flex items-center justify-between p-3 border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                            <span className="text-sm font-medium text-gray-900">
                                                Lihat Data Karyawan
                                            </span>
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </Link> */}
                                        
                                        <button
                                            onClick={handlePrint}
                                            className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                            <span className="text-sm font-medium text-gray-900">
                                                Cetak Surat Pernyataan
                                            </span>
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                        </button>
                                        
                                        {changeLog.status === 'approved' && (
                                            <button
                                                onClick={handleDownloadPdf}
                                                className="flex items-center justify-between p-3 border border-green-300 rounded-md hover:bg-green-50"
                                            >
                                                <span className="text-sm font-medium text-green-900">
                                                    Download Dokumen Resmi
                                                </span>
                                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}