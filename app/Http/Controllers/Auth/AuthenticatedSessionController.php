<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Employee; // Add this import

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $credential = $request->input('credential');
        $password = $request->input('password');
        $remember = $request->boolean('remember');

        $isNik = preg_match('/^EMP\d+$|^\d+$/', $credential);

        if ($isNik) {
            // First check if employee exists and is not deactivated
            $employee = Employee::where('nik', $credential)->first();
            
            // Check if employee exists and is not deactivated
            if (!$employee || $employee->status === 'deactivated') {
                throw ValidationException::withMessages([
                    'credential' => __('Akun telah dinonaktifkan dan tidak dapat login.'),
                ]);
            }

            if (!Auth::guard('employee')->attempt(
                ['nik' => $credential, 'password' => $password],
                $remember
            )) {
                throw ValidationException::withMessages([
                    'credential' => __('auth.failed'),
                ]);
            }

            // After successful employee login, load their sections and subsections
            $employee = Auth::guard('employee')->user();
            if ($employee) {
                // Load the employee's subsections with their sections
                $employee->load('subSections.section');
                
                // Store additional employee data in session for easy access
                $employeeSections = $employee->subSections->map(function($subSection) {
                    return [
                        'sub_section_id' => $subSection->id,
                        'sub_section_name' => $subSection->name,
                        'section_id' => $subSection->section ? $subSection->section->id : null,
                        'section_name' => $subSection->section ? $subSection->section->name : null,
                    ];
                });
                
                // Check if employee is a forklift operator
                $isForkliftOperator = $employee->subSections->contains(function ($sub) {
                    return $sub->section && $sub->section->name === 'Operator Forklift';
                });
                
                // Store in session
                session([
                    'employee_sections' => $employeeSections,
                    'is_forklift_operator' => $isForkliftOperator
                ]);

                // Debug: Log what we're storing in session (remove this after testing)
                \Log::info('Employee login - storing in session:', [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->name,
                    'sections' => $employeeSections,
                    'is_forklift_operator' => $isForkliftOperator
                ]);
            }

            $request->session()->regenerate();
            return redirect()->intended(route('employee.dashboard'));
        } else {
            if (!Auth::guard('web')->attempt(
                ['email' => $credential, 'password' => $password],
                $remember
            )) {
                throw ValidationException::withMessages([
                    'credential' => __('auth.failed'),
                ]);
            }

            $request->session()->regenerate();
            return redirect()->intended(route('dashboard'));
        }
    }

    public function destroy(Request $request): RedirectResponse
    {
        // Store current session ID before logout
        $sessionId = $request->session()->getId();

        // Logout from all guards
        Auth::guard('web')->logout();
        Auth::guard('employee')->logout();

        // Clear employee-specific session data
        $request->session()->forget(['employee_sections', 'is_forklift_operator']);

        // Invalidate and regenerate
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Explicitly delete the session record from database
        DB::table('sessions')->where('id', $sessionId)->delete();

        // Clear all session data
        $request->session()->flush();

        return redirect('/')
            ->withHeaders([
                'Cache-Control' => 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
                'Pragma' => 'no-cache',
                'Expires' => 'Fri, 01 Jan 1990 00:00:00 GMT',
            ]);
    }
}