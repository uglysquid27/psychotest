<?php

use App\Http\Controllers\AnalogiController;
use App\Http\Controllers\DiscTestController;
use App\Http\Controllers\KetelitianController;
use App\Http\Controllers\PersonalityTestController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\KraepelinController;
use App\Http\Controllers\WarteggTestController;
use App\Http\Controllers\HitunganController;
use App\Http\Controllers\TesDeretController;
use App\Http\Controllers\SpasialController;
use App\Http\Controllers\TesNumerikController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeSum;
use App\Http\Controllers\BankAccountChangeController;
use App\Http\Controllers\PermitController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\ManPowerRequestController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\SubSectionController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\EmployeeProfileController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Redirect root URL to login page
Route::get('/', function () {
    return redirect()->route('login');
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================
Route::middleware(['prevent.back'])->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
    Route::post('/employee/login', [AuthenticatedSessionController::class, 'store'])->name('employee.login');

    // Unified Logout Route with session cleanup
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->middleware(['auth:web,employee'])
        ->name('logout');
});

// ============================================
// EMPLOYEE ROUTES (KEEP ALL)
// ============================================
Route::middleware(['auth:employee', 'prevent.back'])
    ->prefix('employee')
    ->as('employee.')
    ->group(function () {
        Route::get('/dashboard', [EmployeeDashboardController::class, 'index'])->name('dashboard');

        // Bank Account Change Routes
        Route::get('/bank-account-change', [BankAccountChangeController::class, 'create'])
            ->name('bank-account-change.create');
        Route::post('/bank-account-change', [BankAccountChangeController::class, 'store'])
            ->name('bank-account-change.store');
        Route::get('/bank-account-change/history', [BankAccountChangeController::class, 'employeeHistory'])
            ->name('bank-account-change.history');

        // Other routes
        Route::resource('permits', PermitController::class);

        Route::get('/employees/{employee}/edit', [EmployeeProfileController::class, 'edit'])
            ->name('employees.edit');
        Route::put('/employees/{employee}', [EmployeeProfileController::class, 'update'])
            ->name('employees.update');
    });

// ============================================
// ADMIN ROUTES (CLEANED UP - ONLY ESSENTIALS)
// ============================================
Route::middleware(['auth:web', 'prevent.back'])->group(function () {
    // ============ DASHBOARD ============
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    // ============ EMPLOYEE ATTENDANCE ============
    Route::prefix('employee-attendance')->group(function () {
        Route::get('/', [EmployeeSum::class, 'index'])->name('employee-attendance.index');

        // Individual employee routes
        Route::prefix('/{employee}')->group(function () {
            Route::get('/', [EmployeeSum::class, 'show'])->name('employee-attendance.show');
        });
    });

    // ============ PSIKOTES ROUTES ============

    // 1. Kraepelin Test
    Route::prefix('kraepelin')->name('kraepelin.')->group(function () {
        Route::get('/', [KraepelinController::class, 'index'])->name('index');
        Route::post('/start', [KraepelinController::class, 'start'])->name('start');
        Route::post('/submit', [KraepelinController::class, 'submit'])->name('submit');
        Route::get('/results', [KraepelinController::class, 'results'])->name('results');
        Route::get('/results/{id}', [KraepelinController::class, 'show'])->name('show');
        Route::delete('/results/{id}', [KraepelinController::class, 'destroy'])->name('destroy');
        Route::get('/employees', [KraepelinController::class, 'employees'])->name('employees');
    });

    // 2. Wartegg Test
    Route::prefix('wartegg')->name('wartegg.')->group(function () {
        Route::get('/', [WarteggTestController::class, 'index'])->name('index');
        Route::post('/', [WarteggTestController::class, 'store'])->name('store');
        Route::get('/history', [WarteggTestController::class, 'history'])->name('history');
        Route::get('/{warteggTest}', [WarteggTestController::class, 'show'])->name('show');
    });

    // 3. Analogi Test
    Route::prefix('analogi')->name('analogi.')->group(function () {
        Route::get('/', [AnalogiController::class, 'index'])->name('index');
        Route::post('/submit', [AnalogiController::class, 'submit'])->name('submit');
    });

    Route::prefix('ketelitian')->name('ketelitian.')->group(function () {
        Route::get('/', [KetelitianController::class, 'index'])->name('index');
        Route::post('/submit', [KetelitianController::class, 'submit'])->name('submit');
    });

    // Admin question management routes
    Route::prefix('admin/ketelitian-questions')->name('admin.ketelitian.')->group(function () {
        Route::get('/', [KetelitianController::class, 'questionsIndex'])->name('questions.index');
        Route::get('/create', [KetelitianController::class, 'create'])->name('questions.create');
        Route::post('/', [KetelitianController::class, 'store'])->name('questions.store');
        Route::get('/{question}/edit', [KetelitianController::class, 'edit'])->name('questions.edit');
        Route::put('/{question}', [KetelitianController::class, 'update'])->name('questions.update');
        Route::delete('/{question}', [KetelitianController::class, 'destroy'])->name('questions.destroy');
        Route::get('/download-template', [KetelitianController::class, 'downloadTemplate'])->name('questions.download-template');
        Route::post('/import', [KetelitianController::class, 'import'])->name('questions.import');
    });


    Route::get('/hitungan', [HitunganController::class, 'index'])->name('hitungan.test');
    Route::post('/hitungan/submit', [HitunganController::class, 'submit'])->name('hitungan.submit');

    // Admin question management routes for Hitungan
    Route::prefix('admin/hitungan-questions')->name('admin.hitungan.')->group(function () {
        Route::get('/', [HitunganController::class, 'questionsIndex'])->name('questions.index');
        Route::get('/create', [HitunganController::class, 'create'])->name('questions.create');
        Route::post('/', [HitunganController::class, 'store'])->name('questions.store');
        Route::get('/{question}/edit', [HitunganController::class, 'edit'])->name('questions.edit');
        Route::put('/{question}', [HitunganController::class, 'update'])->name('questions.update');
        Route::delete('/{question}', [HitunganController::class, 'destroy'])->name('questions.destroy');
        Route::get('/download-template', [HitunganController::class, 'downloadTemplate'])->name('questions.download-template');
        Route::post('/import', [HitunganController::class, 'import'])->name('questions.import');

        // Optional: Add bulk actions if you need them (similar to ketelitian)
        Route::post('/bulk-toggle-active', [HitunganController::class, 'bulkToggleActive'])->name('questions.bulk-toggle-active');
        Route::post('/bulk-delete', [HitunganController::class, 'bulkDelete'])->name('questions.bulk-delete');
    });

    // 6. Deret Test
    Route::prefix('deret')->name('deret.')->group(function () {
        Route::get('/', [TesDeretController::class, 'index'])->name('index');
        Route::post('/submit', [TesDeretController::class, 'submit'])->name('submit');
    });

    // 7. Spasial Test
    Route::prefix('spasial')->name('spasial.')->group(function () {
        Route::get('/', [SpasialController::class, 'index'])->name('index');
        Route::post('/submit', [SpasialController::class, 'submit'])->name('submit');
    });

    // 8. Numerik Test
    Route::prefix('numerik')->name('numerik.')->group(function () {
        Route::get('/', [TesNumerikController::class, 'index'])->name('index');
        Route::post('/submit', [TesNumerikController::class, 'submit'])->name('submit');
    });

    // 9. DISC Test
    Route::prefix('disc')->name('disc.')->group(function () {
        Route::get('/', [DiscTestController::class, 'index'])->name('index');
        Route::post('/submit', [DiscTestController::class, 'submit'])->name('submit');
    });

    // 10. Personality Test
    Route::prefix('personality')->name('personality.')->group(function () {
        Route::get('/', [PersonalityTestController::class, 'index'])->name('index');
        Route::post('/submit', [PersonalityTestController::class, 'submit'])->name('submit');
    });
});