<?php

namespace App\Http\Controllers;

use App\Models\CronJobSetting;
   use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CronJobSettingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $cronJobs = CronJobSetting::all();
        return inertia('CronjobSettings/Index', [
            'cronJobs' => $cronJobs
        ]);
    }

    /**
     * Update the specified resource in storage.
     */


public function update(Request $request, $id)
{
    // Your update logic here
    $cronJob = CronJobSetting::findOrFail($id);
    $cronJob->update(['is_enabled' => $request->is_enabled]);
    
    // Return an Inertia response instead of plain JSON
    return redirect()->back()->with([
        'success' => true,
        'message' => 'Cron job setting updated successfully'
    ]);
    
    // OR if you want to return JSON for API calls, check if it's an Inertia request:
    // If you want to support both, you can use an if/else structure, but not after a return.
    // Example:
    // if ($request->header('X-Inertia')) {
    //     return redirect()->back()->with([
    //         'success' => true,
    //         'message' => 'Cron job setting updated successfully'
    //     ]);
    // }
    // return response()->json([
    //     'success' => true,
    //     'message' => 'Cron job setting updated successfully'
    // ]);
}

    /**
     * Update multiple cron job settings at once
     */
   public function updateMultiple(Request $request)
{
    // Your update logic here
    foreach ($request->settings as $setting) {
        CronJobSetting::where('id', $setting['id'])
                     ->update(['is_enabled' => $setting['is_enabled']]);
    }
    
    // Return an Inertia response
    return redirect()->back()->with([
        'success' => true,
        'message' => 'Cron job settings updated successfully'
    ]);
}

    /**
     * Get all cron job settings
     */
    public function getAll()
    {
        $cronJobs = CronJobSetting::all();
        return response()->json($cronJobs);
    }
}