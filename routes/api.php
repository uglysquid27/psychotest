<?php
// routes/api.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImageKitController;

Route::get('/imagekit/auth', [ImageKitController::class, 'auth']);
