<?php

use App\Http\Controllers\AdminPermitController;
use App\Http\Controllers\AnalogiController;
use App\Http\Controllers\DiscTestController;
use App\Http\Controllers\KetelitianController;
use App\Http\Controllers\PersonalityTestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubSectionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\BankAccountChangeController;
use App\Http\Controllers\PermitController;
use App\Http\Controllers\EmployeeSum;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\WhatsAppNotificationController;
use App\Http\Controllers\ManPowerRequestController;
use App\Http\Controllers\ManPowerRequestFulfillmentController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeBlindTestController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\LunchCouponController;
use App\Http\Controllers\RatingController;
use App\Http\Middleware\PreventBackAfterLogout;
use App\Http\Controllers\EmployeeProfileController;
use App\Http\Controllers\KraepelinController;
use App\Http\Controllers\WarteggTestController;
use App\Http\Controllers\HitunganController;
use App\Http\Controllers\TesDeretController;
use App\Http\Controllers\SpasialController;
use App\Http\Controllers\TesNumerikController;
use App\Http\Controllers\CronJobSettingController;
use App\Http\Controllers\ResignController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\HandoverController;
use App\Http\Controllers\EmployeePickingPriorityController;

// app/Http/Controllers/LicenseVerificationController.php
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

Route::get('/upload', function () {
    return Inertia::render('ImageUpload');
});

Route::get('/', function () {
    return redirect()->route('login');
});

// routes/web.php
use App\Http\Controllers\LicenseVerificationController;

Route::middleware(['auth', 'verified'])->group(function () {
    // GET route - shows the form
    Route::get('/license-check', [LicenseVerificationController::class, 'showForm'])
        ->name('license.check');

    // POST route - handles form submission
    Route::post('/verify-license', [LicenseVerificationController::class, 'verify'])
        ->name('license.verify');

    Route::get('/cronjob-settings', [CronJobSettingController::class, 'index'])
        ->name('cronjob-settings.index');
    Route::put('/cronjob-settings/{cronJobSetting}', [CronJobSettingController::class, 'update'])
        ->name('cronjob-settings.update');
    Route::post('/cronjob-settings/update-multiple', [CronJobSettingController::class, 'updateMultiple'])
        ->name('cronjob-settings.update-multiple');
});

// API-style endpoint
Route::middleware(['auth:sanctum'])->post(
    '/api/verify-license',
    [LicenseVerificationController::class, 'verify']
);

// 👉 IMAGEKIT AUTHENTICATION ROUTE - ADD THIS
Route::get('/api/imagekit/auth', function () {
    try {
        $privateKey = env('IMAGEKIT_PRIVATE_KEY');
        $token = uniqid();
        $expire = time() + 60 * 10; // 10 minutes
        $signature = hash_hmac('sha1', $token . $expire, $privateKey);

        return response()->json([
            'token' => $token,
            'expire' => $expire,
            'signature' => $signature
        ]);
    } catch (\Exception $e) {
        \Log::error('ImageKit auth error: ' . $e->getMessage());
        return response()->json(['error' => 'Authentication failed'], 500);
    }
})->name('imagekit.auth');

// Authentication routes
Route::middleware(['prevent.back'])->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
    Route::post('/employee/login', [AuthenticatedSessionController::class, 'store'])->name('employee.login');

    // Unified Logout Route with session cleanup
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->middleware(['auth:web,employee'])
        ->name('logout');
});

// Public routes that need cache prevention
Route::middleware(['prevent.back'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware(['auth', 'verified'])
        ->name('dashboard');

    // Dashboard summary detail routes
    Route::get('/dashboard/employees/active', [DashboardController::class, 'getActiveEmployees'])
        ->name('dashboard.employees.active');
    Route::get('/dashboard/requests/pending', [DashboardController::class, 'getPendingRequests'])
        ->name('dashboard.requests.pending');
    Route::get('/dashboard/requests/fulfilled', [DashboardController::class, 'getFulfilledRequests'])
        ->name('dashboard.requests.fulfilled');
    Route::get('/dashboard/schedules/upcoming', [DashboardController::class, 'getUpcomingSchedules'])
        ->name('dashboard.schedules.upcoming');
    Route::get('/dashboard/lunch-coupons/{date}', [DashboardController::class, 'getLunchCouponsByDate'])
        ->name('dashboard.lunch-coupons.by-date');

    Route::get('/permits', [PermitController::class, 'index'])->name('permits.index');
    Route::post('/permits', [PermitController::class, 'store'])->name('permits.store');
});

// Employee routes with proper session handling
Route::middleware(['auth:employee', 'prevent.back'])
    ->prefix('employee')
    ->as('employee.')
    ->group(function () {
        Route::get('/dashboard', [EmployeeDashboardController::class, 'index'])->name('dashboard');
        Route::get('/license', [LicenseVerificationController::class, 'showForm'])->name('license');

        // Schedule routes
        Route::post('/schedule/{schedule}/respond', [EmployeeDashboardController::class, 'respond'])->name('schedule.respond');
        Route::get('/schedule/{schedule}/same-day', [EmployeeDashboardController::class, 'sameDayEmployees'])
            ->name('schedule.same-day');
    
        Route::get('/employee/famday/check', [EmployeeDashboardController::class, 'checkFamdayAccount'])
            ->name('famday.check');

        Route::get('/employee/famday/data', [EmployeeDashboardController::class, 'getFamdayData'])
            ->name('famday.data');
        Route::get('/schedule/{schedule}/change-request-status', [EmployeeDashboardController::class, 'checkChangeRequestStatus'])
            ->name('employee.schedule.change-request-status');

        // Bank Account Change Routes - ADDED
        Route::get('/bank-account-change', [BankAccountChangeController::class, 'create'])
            ->name('bank-account-change.create');
        Route::post('/bank-account-change', [BankAccountChangeController::class, 'store'])
            ->name('bank-account-change.store');
        Route::get('/bank-account-change/history', [BankAccountChangeController::class, 'employeeHistory'])
            ->name('bank-account-change.history');

        // Other routes
        Route::resource('permits', PermitController::class);

        // Resignation routes - ADDED
        Route::resource('resign', ResignController::class);

        Route::post('/operator-license', [LicenseVerificationController::class, 'store']);
        Route::get('/employees/{employee}/edit', [EmployeeProfileController::class, 'edit'])
            ->name('employees.edit');
        Route::put('/employees/{employee}', [EmployeeProfileController::class, 'update'])
            ->name('employees.update');
        Route::put('/employees/{employee}/password', [EmployeeProfileController::class, 'updatePassword'])
            ->name('employees.password.update');
        Route::put('employees/{employee}/photo', [EmployeeProfileController::class, 'updatePhoto'])
            ->name('employees.photo.update');
    });

// Admin routes with session protection
Route::middleware(['auth:web', 'prevent.back'])->group(function () {
    // Profile routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/inactive', [EmployeeSum::class, 'inactive'])->name('employee-attendance.inactive');
    Route::get('/employee-attendance/section-view', [EmployeeSum::class, 'sectionView'])->name('employee-attendance.section-view');
    Route::get('/employee-attendance/incomplete-profiles', [EmployeeSum::class, 'incompleteProfiles'])
        ->name('employee-attendance.incomplete-profiles');
    Route::post('/employee-attendance/{employee}/reset-cuti', [EmployeeSum::class, 'resetCuti'])->name('employee-attendance.reset-cuti');
    
    // Export routes
    Route::get('/employee-attendance/incomplete-profiles/export', [EmployeeSum::class, 'exportXls'])
        ->name('employee-attendance.incomplete-profiles.exports');
    Route::get('/employee-attendance/export-filtered', [EmployeeSum::class, 'exportFilteredXls'])
        ->name('employee-attendance.exports');
    Route::get('/employee-attendance/incomplete-profiles/exportIncomplete', [EmployeeSum::class, 'exportIncompleteXls'])
        ->name('employee-attendance.incomplete-profiles.exportIncomplete');
    
    // Bulk deactivate
    Route::post('/employee-attendance/bulk-deactivate', [EmployeeSum::class, 'bulkDeactivate'])
        ->name('employee-attendance.bulk-deactivate');

    // Bank Account Change Routes - PERBAIKI INI
    Route::prefix('bank-account-changes')->name('employee.bank-account-change.')->group(function () {
        Route::get('/', [BankAccountChangeController::class, 'index'])->name('index');
        Route::get('/{bankAccountChangeLog}', [BankAccountChangeController::class, 'show'])->name('show');
        Route::post('/{bankAccountChangeLog}/update-status', [BankAccountChangeController::class, 'updateStatus'])->name('update-status');
        
        // PDF Preview route - INI YANG SALAH
        // Route::get('/{bankAccountChangeLog}/pdf', [BankAccountChangeController::class, 'showPdfPreview'])->name('pdf-preview');
    });
    
    // PDF Preview route - PERBAIKI DI LUAR GROUP AGAR BISA DIAKSES
    Route::get('/bank-account-changes/{bankAccountChangeLog}/pdf-preview', [BankAccountChangeController::class, 'showPdfPreview'])
        ->name('employee.bank-account-change.pdf-preview');
    
    // Juga tambahkan generate-pdf route untuk compatibility
    Route::get('/bank-account-changes/{bankAccountChangeLog}/generate-pdf', [BankAccountChangeController::class, 'showPdfPreview'])
        ->name('employee.bank-account-change.generate-pdf');

    // Employee Attendance routes
    Route::prefix('employee-attendance')->group(function () {
        Route::get('/', [EmployeeSum::class, 'index'])->name('employee-attendance.index');
        Route::get('/create', [EmployeeSum::class, 'create'])->name('employee-attendance.create');
        Route::post('/', [EmployeeSum::class, 'store'])->name('employee-attendance.store');
        Route::post('/reset-all-statuses', [EmployeeSum::class, 'resetAllStatuses'])
            ->name('employee-attendance.reset-all-statuses');
        Route::post('/employee-attendance/update-workloads', [EmployeeSum::class, 'updateWorkloads'])
            ->name('employee-attendance.update-workloads')
            ->middleware(['auth', 'verified']);

        // Individual employee routes
        Route::prefix('/{employee}')->group(function () {
            Route::get('/', [EmployeeSum::class, 'show'])->name('employee-attendance.show');
            Route::get('/edit', [EmployeeSum::class, 'edit'])->name('employee-attendance.edit');
            Route::put('/', [EmployeeSum::class, 'update'])->name('employee-attendance.update');
            Route::get('/deactivate', [EmployeeSum::class, 'deactivate'])->name('employee-attendance.deactivate');
            Route::post('/activate', [EmployeeSum::class, 'activate'])
                ->name('employee-attendance.activate');
            Route::post('/process-deactivation', [EmployeeSum::class, 'processDeactivation'])
                ->name('employee-attendance.process-deactivation');
            Route::delete('/', [EmployeeSum::class, 'destroy'])
                ->name('employee-attendance.destroy');
        });
    });

    Route::prefix('sections')->group(function () {
        Route::get('/', [SubSectionController::class, 'index'])->name('sections.index');
        Route::get('/create', [SubSectionController::class, 'create'])->name('sections.create');
        Route::post('/', [SubSectionController::class, 'store'])->name('sections.store');

        // Section routes
        Route::get('/{section}/edit-section', [SubSectionController::class, 'editSection'])->name('sections.edit-section');
        Route::put('/{section}/update-section', [SubSectionController::class, 'updateSection'])->name('sections.update-section');
        Route::delete('/{section}/destroy-section', [SubSectionController::class, 'destroySection'])->name('sections.destroy-section');

        // SubSection routes
        Route::get('/{subSection}/edit-subsection', [SubSectionController::class, 'editSubSection'])->name('sections.edit-subsection');
        Route::put('/{subSection}/update-subsection', [SubSectionController::class, 'updateSubSection'])->name('sections.update-subsection');
        Route::delete('/{subSection}/destroy-subsection', [SubSectionController::class, 'destroySubSection'])->name('sections.destroy-subsection');
    });

    Route::get('/employees/{employee}/license', [LicenseVerificationController::class, 'showEmployeeLicense'])
        ->name('employees.license.show');
    Route::get('/employees/{employee}/rate', [RatingController::class, 'create'])->name('ratings.create');
    Route::post('/ratings', [RatingController::class, 'store'])->name('ratings.store');
    Route::put('/ratings/{rating}', [RatingController::class, 'update'])->name('ratings.update');

    // Manpower routes
    Route::resource('manpower-requests', ManPowerRequestController::class);
    Route::get('/manpower-requests/{id}/fulfill', [ManPowerRequestFulfillmentController::class, 'create'])
        ->name('manpower-requests.fulfill');
    Route::get('/manpower-requests/{request_id}/bulk-fulfillment', [ManPowerRequestFulfillmentController::class, 'bulkFulfillmentPage'])
        ->name('manpower-requests.bulk-fulfillment');
    Route::post('/manpower-requests/bulk-fulfill', [ManPowerRequestFulfillmentController::class, 'bulkStore'])
        ->name('manpower-requests.bulk-fulfill');
    Route::post('/manpower-requests/bulk-preview', [ManPowerRequestFulfillmentController::class, 'bulkPreview'])
        ->name('manpower-requests.bulk-preview');
    Route::get('/manpower-requests/create', [ManPowerRequestController::class, 'create'])
        ->name('manpower-requests.create');
    Route::post('/manpower-requests/{id}/fulfill', [ManPowerRequestFulfillmentController::class, 'store'])
        ->name('manpower-requests.fulfill.store');
    Route::post('/manpower-requests/{manpower_request}/request-revision', [ManPowerRequestController::class, 'requestRevision'])
        ->name('manpower-requests.request-revision');
    Route::post('/manpower-requests/bulk-fulfill-multi-subsection', [ManPowerRequestController::class, 'bulkFulfillMultiSubsection'])
        ->name('manpower-requests.bulk-fulfill-multi-subsection');
    Route::post('/manpower-requests/bulk-preview-multi-subsection', [ManPowerRequestController::class, 'bulkPreviewMultiSubsection'])
        ->name('manpower-requests.bulk-preview-multi-subsection');
    Route::get('/employees/available-for-request/{requestId}', [ManPowerRequestController::class, 'getAvailableEmployeesForRequest'])
        ->name('employees.available-for-request')
        ->where('requestId', '[0-9]+');
    Route::get('/manpower-requests/{requestId}/available-employees', [ManPowerRequestController::class, 'getAvailableEmployeesForRequest'])
        ->name('manpower-requests.get-available-employees');
    Route::get('/manpower-requests/{requestId}/bulk-available-employees', [ManPowerRequestController::class, 'bulkGetAvailableEmployees'])
        ->name('manpower-requests.bulk-get-available-employees');
    Route::get('/manpower-requests/{manpower_request}/revision', [ManPowerRequestController::class, 'edit'])
        ->name('manpower-requests.revision.edit');
    Route::post('/manpower-requests/check-dulicates', [ManPowerRequestController::class, 'checkDuplicates'])
        ->name('manpower-requests.check-duplicates');
    Route::get('/manpower-requests/{id}/can-revise', [ManPowerRequestController::class, 'canRevise'])
        ->name('manpower-requests.can-revise');
    Route::post('/manpower-requests/bulk-delete', [ManPowerRequestController::class, 'bulkDelete'])->name('manpower-requests.bulk-delete');
    
    // Revision routes for fulfilled requests
    Route::get('/manpower-requests/{id}/revise', [ManPowerRequestFulfillmentController::class, 'revise'])
        ->name('manpower-requests.revise');
    Route::put('/manpower-requests/{id}/update-revision', [ManPowerRequestFulfillmentController::class, 'updateRevision'])
        ->name('manpower-requests.update-revision');

    // Additional dashboard routes
    Route::get('/dashboard/requests/{month}/{status}', [DashboardController::class, 'getManpowerRequestsByMonth'])
        ->name('dashboard.requests.byMonth');
    Route::get('/dashboard/schedules/by-subsection/{subSectionId}', [DashboardController::class, 'getSchedulesBySubSection'])
        ->name('dashboard.schedules.bySubSection');
    Route::get('/dashboard/manpower-requests/filtered', [DashboardController::class, 'getFilteredManpowerRequests'])
        ->name('dashboard.manpower.requests.filtered');

    Route::get('/dashboard/employee-assignments/filtered', [DashboardController::class, 'getFilteredEmployeeAssignments'])
        ->name('dashboard.employee.assignments.filtered');

    Route::get('/dashboard/requests/{periodType}/{period}/{status}', [DashboardController::class, 'getManpowerRequestsByPeriod'])
        ->name('dashboard.requests.byPeriod');

    // Schedule routes
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::get('/schedules/{id}/edit', [ScheduleController::class, 'edit'])->name('schedules.edit');
    Route::post('/schedules', [ScheduleController::class, 'store'])->name('schedules.store');
    Route::post('/schedules/{manPowerRequest}/toggle-visibility', [ScheduleController::class, 'toggleVisibility'])
        ->name('schedules.toggle-visibility');
    Route::post('/schedules/toggle-visibility-group', [ScheduleController::class, 'toggleVisibilityGroup'])
        ->name('schedules.toggle-visibility-group');
    Route::get('/schedules/updates', [ScheduleController::class, 'getUpdatedSchedules'])
        ->name('schedules.updates');
    Route::get('/schedules/data', [ScheduleController::class, 'getScheduleData'])->name('schedules.data');
    Route::post('/whatsapp/send', [WhatsAppNotificationController::class, 'sendScheduleNotification'])->name('whatsapp.send');
    Route::get('/wa/test', [WhatsAppNotificationController::class, 'testSend']);

    Route::resource('employee-picking-priorities', \App\Http\Controllers\EmployeePickingPriorityController::class)
        ->except(['show', 'edit', 'update']);

    // Add the categories route
    Route::get('/employee-picking-priorities/categories', [EmployeePickingPriorityController::class, 'categories'])
        ->name('employee-picking-priorities.categories');

    Route::get('/employee-picking-priorities', [EmployeePickingPriorityController::class, 'index'])->name('employee-picking-priorities.index');
    Route::get('/employee-picking-priorities/create', [EmployeePickingPriorityController::class, 'create'])->name('employee-picking-priorities.create');
    Route::post('/employee-picking-priorities', [EmployeePickingPriorityController::class, 'store'])->name('employee-picking-priorities.store');
    Route::delete('/employee-picking-priorities/{id}', [EmployeePickingPriorityController::class, 'destroy'])->name('employee-picking-priorities.destroy');
    Route::get('/employee-picking-priorities/categories', [EmployeePickingPriorityController::class, 'categories'])->name('employee-picking-priorities.categories');

    // Lunch routes
    Route::resource('lunch-coupons', LunchCouponController::class)->only(['index', 'store']);
    Route::get('/lunch-coupons/by-date/{date}', [LunchCouponController::class, 'getByDate'])
        ->name('lunch-coupons.by-date');

    // Blind Test Routes
    Route::get('/employee-blind-test', [EmployeeBlindTestController::class, 'index'])
        ->name('employee-blind-test.index');
    Route::get('/employee-blind-test/create/{employee}', [EmployeeBlindTestController::class, 'create'])
        ->name('employee-blind-test.create');
    Route::post('/employee-blind-test/store/{employee}', [EmployeeBlindTestController::class, 'store'])
        ->name('employee-blind-test.store');
    Route::get('/employee-blind-test/{employee}', [EmployeeBlindTestController::class, 'show'])
        ->name('employee-blind-test.show');
    Route::delete('/employee-blind-test/{blindTest}', [EmployeeBlindTestController::class, 'destroy'])
        ->name('employee-blind-test.destroy');

    // Shift routes
    Route::resource('shifts', ShiftController::class);

    // Admin permit routes
    Route::get('/admin/permits', [AdminPermitController::class, 'index'])->name('admin.permits.index');
    Route::post('/admin/permits/{permit}/respond', [AdminPermitController::class, 'respond'])
        ->name('admin.permits.respond');
    Route::post('/admin/schedule-changes/{scheduleChange}/respond', [AdminPermitController::class, 'respondScheduleChange'])
        ->name('admin.permits.schedule-change.respond');

    Route::prefix('kraepelin')->name('kraepelin.')->group(function () {
        Route::get('/', [KraepelinController::class, 'index'])->name('index');
        Route::post('/start', [KraepelinController::class, 'start'])->name('start');
        Route::post('/submit', [KraepelinController::class, 'submit'])->name('submit');
        Route::get('/results', [KraepelinController::class, 'results'])->name('results');
        Route::get('/results/{id}', [KraepelinController::class, 'show'])->name('show');
        Route::delete('/results/{id}', [KraepelinController::class, 'destroy'])->name('destroy');
        Route::get('/employees', [KraepelinController::class, 'employees'])->name('employees');
    });
    
    Route::prefix('wartegg')->name('wartegg.')->group(function () {
        Route::get('/', [WarteggTestController::class, 'index'])->name('index');
        Route::post('/', [WarteggTestController::class, 'store'])->name('store');
        Route::get('/history', [WarteggTestController::class, 'history'])->name('history');
        Route::get('/{warteggTest}', [WarteggTestController::class, 'show'])->name('show');
    });

    Route::prefix('analogi')->name('analogi.')->group(function () {
        Route::get('/', [AnalogiController::class, 'index'])->name('index');
        Route::post('/submit', [AnalogiController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('ketelitian')->name('ketelitian.')->group(function () {
        Route::get('/', [KetelitianController::class, 'index'])->name('index');
        Route::post('/submit', [KetelitianController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('hitungan')->name('hitungan.')->group(function () {
        Route::get('/', [HitunganController::class, 'index'])->name('index');
        Route::post('/submit', [HitunganController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('deret')->name('deret.')->group(function () {
        Route::get('/', [TesDeretController::class, 'index'])->name('index');
        Route::post('/submit', [TesDeretController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('spasial')->name('spasial.')->group(function () {
        Route::get('/', [SpasialController::class, 'index'])->name('index');
        Route::post('/submit', [SpasialController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('numerik')->name('numerik.')->group(function () {
        Route::get('/', [TesNumerikController::class, 'index'])->name('index');
        Route::post('/submit', [TesNumerikController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('disc')->name('disc.')->group(function () {
        Route::get('/', [DiscTestController::class, 'index'])->name('index');
        Route::post('/submit', [DiscTestController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('personality')->name('personality.')->group(function () {
        Route::get('/', [PersonalityTestController::class, 'index'])->name('index');
        Route::post('/submit', [PersonalityTestController::class, 'submit'])->name('submit');
    });
    
    Route::prefix('equipments')->name('equipments.')->middleware(['auth'])->group(function () {
        Route::get('/', [EquipmentController::class, 'index'])->name('index');
        Route::get('/create', [EquipmentController::class, 'create'])->name('create');
        Route::post('/', [EquipmentController::class, 'store'])->name('store');
        Route::put('/{equipment}', [EquipmentController::class, 'update'])->name('update');
        Route::delete('/{equipment}', [EquipmentController::class, 'destroy'])->name('destroy');
        Route::get('/assign', [EquipmentController::class, 'assignPage'])->name('assign.page');
        Route::get('/{equipment}/assign', [EquipmentController::class, 'assignPage'])->name('assign.page.id');
        Route::post('/{equipment}/assign', [EquipmentController::class, 'assignStore'])->name('assign.store');
        Route::post('/assign/employees', [EquipmentController::class, 'getEmployeesForAssign'])->name('assign.employees');
        Route::post('/assign/store', [EquipmentController::class, 'assignStoreModal'])->name('assign.store.modal');
        Route::put('/handover/{handover}', [EquipmentController::class, 'handoverUpdate'])->name('handover.update');
    });

    Route::get('/equipments/export', [EquipmentController::class, 'exportEquipment'])
        ->name('equipments.export');

    Route::get('/handovers/assign', [HandoverController::class, 'assignPage'])->name('handovers.assign');
    Route::post('/handovers/bulk-assign', [HandoverController::class, 'bulkAssign'])->name('handovers.bulk-assign');
    Route::post('/handovers/{handover}/upload-photo', [HandoverController::class, 'uploadPhoto'])->name('handovers.upload-photo');
    Route::put('/handovers/{handover}', [HandoverController::class, 'updateWithDate'])->name('handovers.update');
    Route::delete('/handovers/{handover}', [HandoverController::class, 'destroy'])->name('handovers.destroy');

    // Employee routes 
    Route::get('/handovers/unassigned-employees', [HandoverController::class, 'getUnassignedEmployees'])->name('handovers.unassigned-employees');
    Route::get('/handovers/employee/{employee}/handovers', [HandoverController::class, 'getEmployeeHandovers'])->name('handovers.employee.handovers');
    Route::put('/handovers/employee/{employee}/update-handovers', [HandoverController::class, 'updateEmployeeHandovers'])->name('handovers.employee.update');
    Route::get('/handovers/employee-equipment-counts', [HandoverController::class, 'getEmployeeEquipmentCounts'])->name('handovers.employee.equipment-counts');
    Route::get('/handovers/export', [HandoverController::class, 'exportAssignments'])->name('handovers.export');
});