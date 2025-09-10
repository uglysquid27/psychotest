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
            'Finished Good' => 'https://whatsapp.com/channel/0029Vb5yFSoJP210x9EUlD35',
            'Loader' => 'https://whatsapp.com/channel/0029VbBWUNfKGGG8PgMo1y1N',
            'Delivery' => 'https://whatsapp.com/channel/0029VbAkjJLC1Fu3zYOXeZ1J',
            'RM/PM' => 'https://whatsapp.com/channel/0029VbCGRFPIyPtQvd2VfN0h',
            'Operator Forklift' => 'https://whatsapp.com/channel/0029Vb6iFOh59PwYZgjfSZ3A',
            'Inspeksi' => 'https://whatsapp.com/channel/0029Vb6lyZkEFeXtq8FkMG2s',
            'Produksi' => 'https://whatsapp.com/channel/0029VbBUb0o3WHTW6NF5oN10',
            'Food & Snackbar' => 'https://whatsapp.com/channel/0029Vb6XObFJJhzZx6JBAo1r'
        ];

        return $channelMap[$sectionName] ?? 'https://whatsapp.com/channel/0029Vb6yHUYId7nVlpjQ3r2R'; // Default channel
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
            
            // Format pesan
            $message = "Jadwal untuk {$date->translatedFormat('l, d F Y')} di bagian {$section->name} sudah dipublikasikan. Silakan cek aplikasi untuk detail lengkap.";
            
            // Kirim ke WhatsApp channel menggunakan endpoint yang benar
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post('https://sendwa.xyz/send-text-channel', [
                'api_key' => 'v3wrR6SeHcgCoGIchMQqMC0gEFZ3QZ',
                'sender' => '6281133318167', // Updated number
                'url' => $channelUrl,
                'message' => $message,
                'footer' => 'otsuka.asystem.co.id'
            ]);
            
            if ($response->successful()) {
                Log::info('WhatsApp channel notification sent successfully', [
                    'date' => $request->date,
                    'section_id' => $request->section_id,
                    'section_name' => $section->name,
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

    public function testSend()
    {
        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post('https://sendwa.xyz/send-text-channel', [
                'api_key' => 'v3wrR6SeHcgCoGIchMQqMC0gEFZ3QZ',
                'sender'  => '6281133318167', // Updated number
                'url'  => 'https://whatsapp.com/channel/0029Vb6yHUYId7nVlpjQ3r2R',
                'message' => 'Halo ini testing kirim kata doang',
                'footer'  => 'Sent via mpwa',
            ]);

            $data = $response->json();

            if ($response->successful() && isset($data['status']) && $data['status'] === true) {
                return [
                    'status'  => 'success',
                    'message' => 'Pesan berhasil dikirim ke channel',
                    'data'    => $data
                ];
            } else {
                return [
                    'status'  => 'error',
                    'message' => 'Gagal mengirim pesan ke channel: ' . ($data['msg'] ?? $response->status()),
                    'data'    => $data
                ];
            }
        } catch (\Exception $e) {
            return [
                'status'  => 'error',
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ];
        }
    }
}