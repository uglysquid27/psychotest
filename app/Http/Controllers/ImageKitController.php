<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ImageKitController extends Controller
{
    public function auth(Request $request)
    {
        $privateKey = config('services.imagekit.private_key');

        if (empty($privateKey)) {
            return response()->json([
                'error' => 'IMAGEKIT_PRIVATE_KEY not loaded. Check .env and config/services.php'
            ], 500);
        }

        $token = bin2hex(random_bytes(16));
        $expire = time() + 240; // 4 menit
        $signature = hash_hmac('sha1', $token . $expire, $privateKey);

        return response()->json([
            'token' => $token,
            'expire' => $expire,
            'signature' => $signature,
        ]);
    }
}
