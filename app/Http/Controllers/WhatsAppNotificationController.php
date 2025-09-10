<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Schedule;
use App\Models\Section;
use Carbon\Carbon;

class WhatsAppNotificationController extends Controller
{
private function getChannelUrl($sectionName)
{
    $channelMap = [
        'finished good' => 'https://whatsapp.com/channel/0029Vb5yFSoJP210x9EUlD35',
        'loader' => 'https://whatsapp.com/channel/0029VbBWUNfKGGG8PgMo1y1N',
        'delivery' => 'https://whatsapp.com/channel/0029VbAkjJLC1Fu3zYOXeZ1J',
        'rm/pm' => 'https://whatsapp.com/channel/0029VbCGRFPIyPtQvd2VfN0h',
        'operator forklift' => 'https://whatsapp.com/channel/0029Vb6iFOh59PwYZgjfSZ3A',
        'inspeksi' => 'https://whatsapp.com/channel/0029Vb6lyZkEFeXtq8FkMG2s',
        'produksi' => 'https://whatsapp.com/channel/0029VbBUb0o3WHTW6NF5oN10',
        'food & snackbar' => 'https://whatsapp.com/channel/0029Vb6XObFJJhzZx6JBAo1r',
        'food and snackbar' => 'https://whatsapp.com/channel/0029Vb6XObFJJhzZx6JBAo1r',
        'food' => 'https://whatsapp.com/channel/0029Vb6XObFJJhzZx6JBAo1r',
        'snackbar' => 'https://whatsapp.com/channel/0029Vb6XObFJJhzZx6JBAo1r'
    ];

    // Normalize section name for matching
    $normalizedSectionName = strtolower(trim($sectionName));
    $normalizedSectionName = preg_replace('/[^a-z0-9\s]/', '', $normalizedSectionName);
    
    // Find matching channel
    foreach ($channelMap as $key => $url) {
        if (str_contains($normalizedSectionName, $key) || str_contains($key, $normalizedSectionName)) {
            return $url;
        }
    }
    
    return 'https://whatsapp.com/channel/0029Vb6yHUYId7nVlpjQ3r2R'; // Default channel
}

public function sendScheduleNotification(Request $request)
{
    $request->validate([
        'date' => 'required|date',
        'section_id' => 'required|exists:sections,id',
    ]);
    
    try {
        $date = Carbon::parse($request->date);
        $section = Section::findOrFail($request->section_id);
        
        // Get the appropriate channel URL
        $channelUrl = $this->getChannelUrl($section->name);
        
        // Format tanggal dalam bahasa Indonesia
        $indonesianMonths = [
            'January' => 'Januari',
            'February' => 'Februari',
            'March' => 'Maret',
            'April' => 'April',
            'May' => 'Mei',
            'June' => 'Juni',
            'July' => 'Juli',
            'August' => 'Agustus',
            'September' => 'September',
            'October' => 'Oktober',
            'November' => 'November',
            'December' => 'Desember'
        ];

        $indonesianDays = [
            'Sunday' => 'Minggu',
            'Monday' => 'Senin',
            'Tuesday' => 'Selasa',
            'Wednesday' => 'Rabu',
            'Thursday' => 'Kamis',
            'Friday' => 'Jumat',
            'Saturday' => 'Sabtu'
        ];

        $englishDay = $date->format('l');
        $englishMonth = $date->format('F');
        
        $indonesianDay = $indonesianDays[$englishDay] ?? $englishDay;
        $indonesianMonth = $indonesianMonths[$englishMonth] ?? $englishMonth;
        
        $formattedDate = $indonesianDay . ', ' . $date->format('d') . ' ' . $indonesianMonth . ' ' . $date->format('Y');
        
        // Format pesan
        $message = "Jadwal untuk {$formattedDate} di bagian {$section->name} sudah dipublikasikan. Silakan cek aplikasi untuk detail lengkap.";
        
        // Kirim ke WhatsApp channel
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->post('https://sendwa.xyz/send-text-channel', [
            'api_key' => 'v3wrR6SeHcgCoGIchMQqMC0gEFZ3QZ',
            'sender' => '6281133318167',
            'url' => $channelUrl,
            'message' => $message,
            'footer' => 'otsuka.asystem.co.id'
        ]);
        
        if ($response->successful()) {
            Log::info('WhatsApp channel notification sent successfully', [
                'date' => $request->date,
                'section_id' => $request->section_id,
                'section_name' => $section->name,
                'indonesian_date' => $formattedDate,
                'channel_url' => $channelUrl,
                'response' => $response->json()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Notifikasi WhatsApp channel berhasil dikirim'
            ]);
        } else {
            Log::error('Failed to send WhatsApp channel notification', [
                'date' => $request->date,
                'section_id' => $request->section_id,
                'section_name' => $section->name,
                'channel_url' => $channelUrl,
                'response' => $response->json()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim notifikasi WhatsApp channel'
            ], 500);
        }
        
    } catch (\Exception $e) {
        Log::error('Error sending WhatsApp channel notification: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'Terjadi kesalahan: ' . $e->getMessage()
        ], 500);
    }
}
}