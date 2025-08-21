<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\SubSection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubSectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get all sections with their subsections ordered by name
        $sections = Section::with(['subSections' => function($query) {
            $query->orderBy('name');
        }])->orderBy('name')->get();

        return Inertia::render('Sections/Index', [
            'sections' => $sections,
        ]);
    }

    /**
     * Show the form for creating a new sub section OR section.
     */
    public function create()
    {
        $sections = Section::orderBy('name')->get();

        return Inertia::render('Sections/Create', [
            'sections' => $sections,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * Bisa create Section atau SubSection
     */
    public function store(Request $request)
    {
        if ($request->has('is_section') && $request->is_section) {
            // Buat Section baru
            $request->validate([
                'name' => 'required|string|max:255|unique:sections,name',
            ]);

            Section::create([
                'name' => $request->name,
            ]);

            return redirect()->route('sections.index')
                ->with('success', 'Section created successfully.');
        } else {
            // Buat SubSection baru
            $request->validate([
                'section_id' => 'required|exists:sections,id',
                'name' => 'required|string|max:255|unique:sub_sections,name,NULL,id,section_id,' . $request->section_id,
            ]);

            SubSection::create([
                'section_id' => $request->section_id,
                'name' => $request->name,
            ]);

            return redirect()->route('sections.index')
                ->with('success', 'Sub Section created successfully.');
        }
    }

    /**
     * Show the form for editing the specified sub section.
     */
    public function edit(SubSection $subSection)
    {
        $sections = Section::orderBy('name')->get();

        return Inertia::render('Sections/Edit', [
            'subSection' => $subSection,
            'sections' => $sections,
        ]);
    }

    /**
     * Update the specified sub section.
     */
    public function update(Request $request, SubSection $subSection)
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'name' => 'required|string|max:255|unique:sub_sections,name,' . $subSection->id . ',id,section_id,' . $request->section_id,
        ]);

        $subSection->update([
            'section_id' => $request->section_id,
            'name' => $request->name,
        ]);

        return redirect()->route('sections.index')
            ->with('success', 'Sub Section updated successfully.');
    }

    /**
     * Remove the specified sub section.
     */
    public function destroy(SubSection $subSection)
    {
        $subSection->delete();

        return redirect()->route('sections.index')
            ->with('success', 'Sub Section deleted successfully.');
    }
}
