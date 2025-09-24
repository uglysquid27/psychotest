<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ImageKitController extends Controller
{
    public function auth(Request $request)
    {
        $privateKey = env('IMAGEKIT_PRIVATE_KEY');

        $token = bin2hex(random_bytes(16));
        $expire = time() + 240; // valid 4 menit
        $signature = hash_hmac('sha1', $token . $expire, $privateKey);

        return response()->json([
            'token' => $token,
            'expire' => $expire,
            'signature' => $signature
        ]);
    }
}
