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
     * Show the form for editing a section.
     */
    public function editSection(Section $section)
    {
        return Inertia::render('Sections/EditSection', [
            'section' => $section,
        ]);
    }

    /**
     * Show the form for editing a sub section.
     */
    public function editSubSection(SubSection $subSection)
    {
        $sections = Section::orderBy('name')->get();

        return Inertia::render('Sections/EditSubSection', [
            'subSection' => $subSection,
            'sections' => $sections,
        ]);
    }

    /**
     * Update a section.
     */
    public function updateSection(Request $request, Section $section)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:sections,name,' . $section->id,
        ]);

        $section->update([
            'name' => $request->name,
        ]);

        return redirect()->route('sections.index')
            ->with('success', 'Section updated successfully.');
    }

    /**
     * Update a sub section.
     */
    public function updateSubSection(Request $request, SubSection $subSection)
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
     * Remove a section.
     */
    public function destroySection(Section $section)
    {
        // Delete all subsections first
        $section->subSections()->delete();
        $section->delete();

        return redirect()->route('sections.index')
            ->with('success', 'Section and all its subsections deleted successfully.');
    }

    /**
     * Remove a sub section.
     */
    public function destroySubSection(SubSection $subSection)
    {
        $subSection->delete();

        return redirect()->route('sections.index')
            ->with('success', 'Sub Section deleted successfully.');
    }
}