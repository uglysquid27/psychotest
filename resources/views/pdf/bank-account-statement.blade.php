<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pernyataan Ganti Rekening Bank - {{ $changeLog->employee->name }}</title>
    <style>
        @page {
            margin: 20mm;
            size: A4 portrait;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.5;
            color: #000;
            font-size: 12pt;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .document-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .document-number {
            font-size: 10pt;
            color: #666;
        }
        
        .content {
            margin-top: 20px;
        }
        
        .section {
            margin-bottom: 15px;
        }
        
        .section-title {
            font-weight: bold;
            font-size: 13pt;
            margin-bottom: 10px;
            text-decoration: underline;
        }
        
        .data-row {
            display: flex;
            margin-bottom: 5px;
        }
        
        .data-label {
            width: 180px;
            font-weight: bold;
        }
        
        .data-value {
            flex: 1;
        }
        
        .signature-section {
            margin-top: 50px;
            text-align: center;
        }
        
        .signature-line {
            width: 300px;
            border-top: 1px solid #000;
            margin: 60px auto 10px;
        }
        
        .signature-name {
            font-weight: bold;
            margin-top: 5px;
        }
        
        .signature-nik {
            font-size: 10pt;
            color: #666;
        }
        
        .signature-date {
            margin-top: 5px;
            font-size: 10pt;
        }
        
        .footer {
            margin-top: 50px;
            font-size: 9pt;
            color: #666;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        .table th, .table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        
        .table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .bank-info {
            background-color: #f9f9f9;
            padding: 15px;
            border: 1px solid #ddd;
            margin: 15px 0;
            border-radius: 5px;
        }
        
        .bank-info-title {
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 10px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        /* Signature image styling */
        .signature-image {
            max-width: 200px;
            max-height: 100px;
            margin: 0 auto;
            display: block;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="company-name">PT. AMERTA INDAH OTSUKA</div>
        <div class="document-title">SURAT PERNYATAAN PERUBAHAN REKENING BANK</div>
        <div class="document-number">
            No: PRB/{{ $changeLog->id }}/{{ date('Y') }}
        </div>
    </div>
    
    <!-- Employee Information -->
    <div class="section">
        <div class="section-title">DATA KARYAWAN</div>
        <div class="data-row">
            <div class="data-label">NIK</div>
            <div class="data-value">: {{ $changeLog->employee->nik }}</div>
        </div>
        <div class="data-row">
            <div class="data-label">Nama Lengkap</div>
            <div class="data-value">: {{ $changeLog->employee->name }}</div>
        </div>
        <div class="data-row">
            <div class="data-label">Jabatan/Bagian</div>
            <div class="data-value">: {{ $changeLog->employee->subSection->section->name ?? 'N/A' }}</div>
        </div>
        <div class="data-row">
            <div class="data-label">Penempatan</div>
            <div class="data-value">: PT. Amerta Indah Otsuka</div>
        </div>
        <div class="data-row">
            <div class="data-label">Alamat</div>
            <div class="data-value">: {{ $changeLog->employee->address ?? 'N/A' }}</div>
        </div>
        <div class="data-row">
            <div class="data-label">Email</div>
            <div class="data-value">: {{ $changeLog->employee->email }}</div>
        </div>
    </div>
    
    <!-- Current Account Information -->
    <div class="section">
        <div class="section-title">REKENING SAAT INI</div>
        <div class="bank-info">
            <div class="bank-info-title">REKENING LAMA</div>
            <div class="data-row">
                <div class="data-label">Nomor Rekening</div>
                <div class="data-value">: {{ $changeLog->old_account_number ?: 'Tidak ada data' }}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Nama Bank</div>
                <div class="data-value">: {{ $changeLog->old_bank ?: 'Tidak ada data' }}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Atas Nama</div>
                <div class="data-value">: {{ $changeLog->employee->name }}</div>
            </div>
        </div>
    </div>
    
    <!-- New Account Information -->
    <div class="section">
        <div class="section-title">REKENING BARU</div>
        <div class="bank-info">
            <div class="bank-info-title">REKENING BARU</div>
            <div class="data-row">
                <div class="data-label">Nomor Rekening</div>
                <div class="data-value">: {{ $changeLog->new_account_number }}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Nama Bank</div>
                <div class="data-value">: {{ $changeLog->new_bank }}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Atas Nama</div>
                <div class="data-value">: {{ $changeLog->employee->name }}</div>
            </div>
        </div>
    </div>
    
    <!-- Statement -->
    <div class="section">
        <div class="section-title">PERNYATAAN</div>
        <p style="text-align: justify; line-height: 1.6;">
            Yang bertandatangan di bawah ini, saya <strong>{{ $changeLog->employee->name }}</strong> dengan NIK <strong>{{ $changeLog->employee->nik }}</strong>, menyatakan dengan sebenar-benarnya bahwa:
        </p>
        <ol style="text-align: justify; line-height: 1.6;">
            <li>Saya mengajukan perubahan data rekening bank untuk keperluan pembayaran gaji dan tunjangan lainnya;</li>
            <li>Data rekening baru yang saya berikan adalah benar dan sah sesuai dengan buku tabungan/buku rekening;</li>
            <li>Saya bertanggung jawab penuh atas kebenaran data yang diberikan;</li>
            <li>Perubahan rekening ini akan berlaku mulai pembayaran gaji periode berikutnya setelah disetujui;</li>
            <li>Saya tidak akan menuntut perusahaan atas kesalahan yang disebabkan oleh ketidakbenaran data yang saya berikan.</li>
        </ol>
        <p style="text-align: justify; line-height: 1.6;">
            Demikian surat pernyataan ini saya buat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.
        </p>
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
        <div class="signature-date">
            Pasuruan, {{ \Carbon\Carbon::parse($changeLog->signed_at ?? $changeLog->created_at)->translatedFormat('d F Y') }}
        </div>
        
        <div class="signature-line"></div>
        
        <div class="signature-name">{{ $changeLog->employee->name }}</div>
        <div class="signature-nik">NIK: {{ $changeLog->employee->nik }}</div>
        
        <!-- Digital Signature Image -->
        @if($changeLog->signature_data)
            <div style="margin-top: 20px;">
                <div style="font-size: 10pt; color: #666; margin-bottom: 5px;">Tanda Tangan Digital:</div>
                <img src="{{ $changeLog->signature_data }}" alt="Tanda Tangan Digital" class="signature-image">
            </div>
        @endif
    </div>
    
    <!-- Approval Section -->
    <div class="section page-break">
        <div class="section-title">PERSETUJUAN DAN CATATAN</div>
        
        <!-- Status Information -->
        <div class="bank-info">
            <div class="bank-info-title">STATUS PERMOHONAN</div>
            <div class="data-row">
                <div class="data-label">Status</div>
                <div class="data-value">: 
                    @if($changeLog->status == 'approved')
                        <strong style="color: green;">DISETUJUI</strong>
                    @elseif($changeLog->status == 'rejected')
                        <strong style="color: red;">DITOLAK</strong>
                    @else
                        <strong style="color: orange;">MENUNGGU</strong>
                    @endif
                </div>
            </div>
            
            @if($changeLog->approved_by && $changeLog->approved_at)
            <div class="data-row">
                <div class="data-label">Disetujui Oleh</div>
                <div class="data-value">: {{ $changeLog->approver->name ?? 'Admin' }}</div>
            </div>
            <div class="data-row">
                <div class="data-label">Tanggal Persetujuan</div>
                <div class="data-value">: {{ \Carbon\Carbon::parse($changeLog->approved_at)->translatedFormat('d F Y') }}</div>
            </div>
            @endif
            
            @if($changeLog->remarks)
            <div class="data-row">
                <div class="data-label">Catatan</div>
                <div class="data-value">: {{ $changeLog->remarks }}</div>
            </div>
            @endif
        </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <div>Dokumen ini dicetak pada: {{ $date }}</div>
        <div>ID Dokumen: PRB-{{ $changeLog->id }}-{{ date('YmdHis') }}</div>
        <div>Dokumen ini berlaku sebagai bukti perubahan rekening bank karyawan</div>
    </div>
</body>
</html>