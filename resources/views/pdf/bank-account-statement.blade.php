<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Surat Pernyataan Perubahan Rekening - {{ $changeLog->employee->name ?? $changeLog->nik }}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                margin: 1.2cm 1.8cm;
            }
            .no-print {
                display: none !important;
            }
            .container {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        body {
            font-family: 'Times New Roman', Georgia, serif;
            line-height: 1.35;
            font-size: 11pt;
            color: #000;
            background: #ffffff;
            max-width: 100%;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 15px;
        }
        
        .header {
            margin-bottom: 20px;
        }
        
        .header-top {
            display: flex;
            align-items: center;
            justify-content: center;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
            margin-bottom: 15px;
        }
        
        .logo {
            max-width: 100px;
            max-height: 60px;
            margin-right: 20px;
        }
        
        .company-name {
            font-weight: bold;
            font-size: 18pt;
            letter-spacing: 0.5px;
            color: #2596be;
        }
        
        .title {
            font-weight: bold;
            font-size: 13pt;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
            text-align: center;
        }
        
        .content {
            text-align: justify;
            margin-bottom: 8px;
            font-size: 11pt;
        }
        
        .identity-section {
            margin: 10px 0 10px 40px;
        }
        
        .identity-row {
            margin-bottom: 3px;
            display: flex;
            font-size: 11pt;
        }
        
        .identity-label {
            width: 160px;
            padding-right: 10px;
            flex-shrink: 0;
        }
        
        .identity-colon {
            width: 10px;
            flex-shrink: 0;
        }
        
        .identity-value {
            flex: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        
        .account-section {
            margin: 10px 0 10px 40px;
        }
        
        .closing-statement {
            text-align: justify;
            margin: 15px 0 20px 0;
            text-indent: 40px;
            font-size: 11pt;
            line-height: 1.35;
        }
        
        .signature-area {
            margin-top: 30px;
            margin-left: 55%;
            font-size: 11pt;
        }
        
        .signature-location {
            margin-bottom: 3px;
        }
        
        .signature-title {
            margin-bottom: 45px;
        }
        
        .signature-name {
            font-weight: bold;
            text-decoration: underline;
            margin-top: 5px;
            word-wrap: break-word;
        }
        
        .signature-nik {
            font-size: 10pt;
            margin-top: 2px;
        }
        
        .signature-image {
            max-width: 120px;
            max-height: 40px;
            margin-top: -40px;
            margin-bottom: -3px;
        }
        
        .approval-section {
            margin-top: 50px;
        }
        
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 8pt;
            color: #666;
            text-align: center;
            border-top: 1px solid #eee;
            padding: 8px 0;
            background: white;
        }
        
        @media print {
            .footer {
                position: fixed;
                bottom: 0;
            }
            body {
                margin: 1.2cm 1.8cm 3cm 1.8cm;
            }
        }
        
        /* Mobile Styles */
        @media screen and (max-width: 768px) {
            body {
                font-size: 10pt;
                padding: 10px;
            }
            
            .container {
                padding: 12px;
            }
            
            .identity-label {
                width: 140px;
            }
            
            .signature-area {
                margin-left: 0;
                margin-top: 25px;
            }
            
            .header {
                margin-bottom: 15px;
            }
            
            .title {
                font-size: 12pt;
            }
        }
        
        /* Print Control Bar */
        .print-controls {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #ddd;
            z-index: 1000;
            display: flex;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .print-btn {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .print-btn:hover {
            background: #0056b3;
        }
        
        .back-btn {
            padding: 10px 20px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .back-btn:hover {
            background: #545b62;
        }
        
        @media print {
            .print-controls {
                display: none;
            }
        }
    </style>
    <script>
        function printDocument() {
            window.print();
        }
        
        function goBack() {
            // Try to close the window/tab first
            window.close();
            
            // If window.close() doesn't work (browser restrictions), go back
            setTimeout(function() {
                if (!window.closed) {
                    window.history.back();
                }
            }, 100);
        }
        
        // Auto-print after 2 seconds if coming from print button
        if (window.location.search.includes('autoprint')) {
            setTimeout(function() {
                window.print();
            }, 2000);
        }
        
        // Close window after print on mobile
        window.addEventListener('afterprint', function() {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                setTimeout(function() {
                    window.close();
                }, 500);
            }
        });
    </script>
</head>
<body>
    <!-- Print Control Bar -->
    <div class="print-controls no-print">
        <button onclick="printDocument()" class="print-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
                <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
            </svg>
            Cetak Dokumen
        </button>
        <button onclick="goBack()" class="back-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            Kembali
        </button>
    </div>
    
    <div class="container">
        <div class="header">
            <div class="header-top">
                <img src="/applogo.png" alt="App Logo" class="logo" onerror="this.style.display='none'">
                <div class="company-name">PT. ARINA MULTIKARYA</div>
            </div>
            <div class="title">SURAT PERNYATAAN PERUBAHAN REKENING</div>
        </div>
        
        <div class="content">
            Yang bertandatangan di bawah ini:
        </div>
        
        <div class="identity-section">
            <div class="identity-row">
                <div class="identity-label">Nama Lengkap</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $changeLog->employee->name ?? 'N/A' }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">NIK</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $changeLog->nik }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Bagian</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $section }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Sub Bagian</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $subSection }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Penempatan</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">PT. Amerta Indah Otsuka</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Alamat Lengkap</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $fullAddress }}</div>
            </div>
        </div>
        
        <div class="content">
            Dengan ini menyatakan bahwa saya mengajukan perubahan nomor rekening bank untuk pembayaran gaji dari:
        </div>
        
        <div class="account-section">
            <div class="identity-row">
                <div class="identity-label">Nomor Rekening</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $changeLog->old_account_number ?? 'Tidak ada data sebelumnya' }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Nama Bank</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $changeLog->old_bank ?? 'Tidak ada data sebelumnya' }}</div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Atas Nama</div>
                <div class="identity-colon">:</div>
                <div class="identity-value">{{ $changeLog->employee->name ?? 'N/A' }}</div>
            </div>
        </div>
        
        <div class="content">
            Menjadi:
        </div>
        
        <div class="account-section">
            <div class="identity-row">
                <div class="identity-label">Nomor Rekening</div>
                <div class="identity-colon">:</div>
                <div class="identity-value"><strong>{{ $changeLog->new_account_number }}</strong></div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Nama Bank</div>
                <div class="identity-colon">:</div>
                <div class="identity-value"><strong>{{ $changeLog->new_bank }}</strong></div>
            </div>
            <div class="identity-row">
                <div class="identity-label">Atas Nama</div>
                <div class="identity-colon">:</div>
                <div class="identity-value"><strong>{{ $changeLog->employee->name ?? 'N/A' }}</strong></div>
            </div>
        </div>
        
        <div class="closing-statement">
            Demikian surat pernyataan ini saya buat dengan sebenar-benarnya untuk dapat dipergunakan 
            sebagaimana mestinya. Apabila dikemudian hari terdapat kesalahan data atau permasalahan yang 
            timbul akibat perubahan rekening ini, maka saya bersedia bertanggung jawab sepenuhnya.
        </div>
        
        <div class="signature-area">
            <div class="signature-location">
                Pasuruan, {{ $signedDate }}
            </div>
            <div class="signature-title">
                Yang membuat pernyataan,
            </div>
            
            @if($changeLog->signature_data)
                <img 
                    src="{{ $changeLog->signature_data }}" 
                    alt="Tanda Tangan Digital" 
                    class="signature-image"
                    onerror="this.style.display='none'"
                />
            @endif
            
            <div class="signature-name">
                {{ $changeLog->employee->name ?? $changeLog->nik }}
            </div>
            <div class="signature-nik">
                NIK: {{ $changeLog->nik }}
            </div>
        </div>
        
        <div class="footer">
            Dokumen ini dicetak secara otomatis pada {{ $currentDate }}<br>
            Hak Cipta © {{ $year }} PT. Amerta Indah Otsuka
        </div>
    </div>
</body>
</html>