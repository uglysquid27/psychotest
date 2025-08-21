<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

class SidebarController extends Controller
{
    public static function get()
    {
        \Log::info('SidebarController::get() called');
        
        // Get the current user (either from the "web" guard or the "employee" guard)
        $user = Auth::user();
        \Log::info('Current user:', ['user' => $user ? $user->toArray() : null]);
        \Log::info('Web guard check:', ['active' => Auth::guard('web')->check()]);
        \Log::info('Employee guard check:', ['active' => Auth::guard('employee')->check()]);

        $isAdmin = $user && $user->role === 'admin';
        $isUser  = $user && $user->role === 'user';

        $isForkliftOperator = false;
        
        // For employees, check if they're forklift operators
        if (Auth::guard('employee')->check() && $user) {
            \Log::info('Processing employee for forklift operator check');
            
            try {
                // Load the employee's subsections with their sections
                $user->load(['subSections' => function($query) {
                    $query->with('section');
                }]);
                
                \Log::info('Employee subsections loaded:', [
                    'subsections_count' => $user->subSections->count(),
                    'subsections' => $user->subSections->map(function($sub) {
                        return [
                            'id' => $sub->id,
                            'name' => $sub->name,
                            'section' => $sub->section ? [
                                'id' => $sub->section->id,
                                'name' => $sub->section->name
                            ] : null
                        ];
                    })->toArray()
                ]);
                
                // Check if any of their subsections belong to "Operator Forklift" section
                $isForkliftOperator = $user->subSections->contains(function ($subSection) {
                    $isOperatorForklift = $subSection->section && $subSection->section->name === 'Operator Forklift';
                    \Log::info('Checking subsection:', [
                        'subsection_name' => $subSection->name,
                        'section_name' => $subSection->section ? $subSection->section->name : null,
                        'is_operator_forklift' => $isOperatorForklift
                    ]);
                    return $isOperatorForklift;
                });
                
                \Log::info('Final forklift operator check:', ['is_forklift_operator' => $isForkliftOperator]);
                
            } catch (\Exception $e) {
                \Log::error('Error loading employee subsections:', ['error' => $e->getMessage()]);
            }
        }

        $result = [
            'user'               => $user,
            'isAdmin'            => $isAdmin,
            'isUser'             => $isUser,
            'isForkliftOperator' => $isForkliftOperator,
        ];

        \Log::info('SidebarController returning:', $result);
        return $result;
    }
}