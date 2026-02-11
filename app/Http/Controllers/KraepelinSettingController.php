<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\KraepelinSetting;

class KraepelinSettingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $search = $request->get('search', '');
        $difficulty = $request->get('difficulty', '');
        $status = $request->get('status', '');

        $settings = KraepelinSetting::query()
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($difficulty, function ($query, $difficulty) {
                return $query->where('difficulty', $difficulty);
            })
            ->when($status !== '', function ($query) use ($status) {
                return $query->where('is_active', $status === 'active');
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Psychotest/KraepelinTest/Settings/Index', [
            'settings' => $settings,
            'filters' => [
                'search' => $search,
                'difficulty' => $difficulty,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'difficultyOptions' => KraepelinSetting::getDifficultyOptions(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Psychotest/KraepelinTest/Settings/Create', [
            'difficultyOptions' => KraepelinSetting::getDifficultyOptions(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rows' => 'required|integer|min:20|max:100',
            'columns' => 'required|integer|min:20|max:100',
            'time_per_column' => 'required|integer|min:5|max:60',
            'difficulty' => 'required|in:mudah,sedang,sulit',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
        ]);

        KraepelinSetting::create($validated);

        return redirect()->route('admin.kraepelin.settings.index')
            ->with('success', 'Pengaturan Kraepelin berhasil dibuat!');
    }

    /**
     * Display the specified resource.
     */
    public function show(KraepelinSetting $setting)
    {
        return Inertia::render('Psychotest/KraepelinTest/Settings/Show', [
            'setting' => $setting,
            'difficultyOptions' => KraepelinSetting::getDifficultyOptions(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(KraepelinSetting $setting)
    {
        return Inertia::render('Psychotest/KraepelinTest/Settings/Edit', [
            'setting' => $setting,
            'difficultyOptions' => KraepelinSetting::getDifficultyOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, KraepelinSetting $setting)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rows' => 'required|integer|min:20|max:100',
            'columns' => 'required|integer|min:20|max:100',
            'time_per_column' => 'required|integer|min:5|max:60',
            'difficulty' => 'required|in:mudah,sedang,sulit',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:1000',
        ]);

        $setting->update($validated);

        return redirect()->route('admin.kraepelin.settings.index')
            ->with('success', 'Pengaturan Kraepelin berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(KraepelinSetting $setting)
    {
        $setting->delete();

        return redirect()->route('admin.kraepelin.settings.index')
            ->with('success', 'Pengaturan Kraepelin berhasil dihapus!');
    }

    /**
     * Toggle active status of multiple settings
     */
    public function bulkToggleActive(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'is_active' => 'required|boolean'
        ]);

        KraepelinSetting::whereIn('id', $request->ids)
            ->update(['is_active' => $request->is_active]);

        return response()->json(['message' => 'Status berhasil diperbarui!']);
    }

    /**
     * Bulk delete settings
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        KraepelinSetting::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Pengaturan berhasil dihapus!']);
    }

    /**
     * Get active settings for test
     */
    public function getActiveSettings()
    {
        $settings = KraepelinSetting::active()
            ->orderBy('difficulty')
            ->get()
            ->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'name' => $setting->name,
                    'rows' => $setting->rows,
                    'columns' => $setting->columns,
                    'time_per_column' => $setting->time_per_column,
                    'difficulty' => $setting->difficulty,
                    'description' => $setting->description,
                    'total_questions' => $setting->total_questions,
                    'total_time' => $setting->total_time,
                    'total_time_formatted' => $setting->total_time_formatted,
                ];
            });

        return response()->json([
            'success' => true,
            'settings' => $settings
        ]);
    }

    /**
     * Get default active setting
     */
    public function getDefaultSetting()
    {
        $setting = KraepelinSetting::active()->first();

        if (!$setting) {
            // Create default setting if none exists
            $setting = KraepelinSetting::create([
                'name' => 'Kraepelin Standar',
                'rows' => 45,
                'columns' => 60,
                'time_per_column' => 15,
                'difficulty' => 'sedang',
                'is_active' => true,
                'description' => 'Pengaturan standar tes Kraepelin',
            ]);
        }

        return response()->json([
            'success' => true,
            'setting' => [
                'id' => $setting->id,
                'name' => $setting->name,
                'rows' => $setting->rows,
                'columns' => $setting->columns,
                'time_per_column' => $setting->time_per_column,
                'difficulty' => $setting->difficulty,
                'description' => $setting->description,
                'total_questions' => $setting->total_questions,
                'total_time' => $setting->total_time,
                'total_time_formatted' => $setting->total_time_formatted,
            ]
        ]);
    }
}