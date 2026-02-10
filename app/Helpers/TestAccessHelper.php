<?php
// app/Helpers/TestAccessHelper.php

namespace App\Helpers;

use App\Models\EmployeeTestAssignment;

class TestAccessHelper
{
    /**
     * Check if current user can access a test
     */
    public static function canAccess($user, $routeName): bool
    {
        // Admin can access everything
        if ($user->role === 'admin') {
            return true;
        }
        
        // Get test type from route
        $testType = EmployeeTestAssignment::getTestTypeFromRoute($routeName);
        
        // If route is not a test route, allow access
        if (!$testType) {
            return true;
        }
        
        // Check if employee is assigned to this test
        if ($user->nik) {
            return EmployeeTestAssignment::canAccessTest($user->nik, $testType);
        }
        
        return false;
    }
    
    /**
     * Get assigned tests for employee
     */
    public static function getAssignedTests($nik): array
    {
        return EmployeeTestAssignment::getAssignedTests($nik);
    }
    
    /**
     * Check if employee can access test type
     */
    public static function canAccessTestType($nik, $testType): bool
    {
        return EmployeeTestAssignment::canAccessTest($nik, $testType);
    }
}