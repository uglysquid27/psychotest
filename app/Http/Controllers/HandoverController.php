<?php

namespace App\Http\Controllers;

use App\Models\Handover;
use App\Models\WorkEquipment;
use App\Models\Employee;
use App\Models\Section;
use App\Models\Subsection;
use Illuminate\Http\Request;
use ImageKit\ImageKit;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class HandoverController extends Controller
{
    // Upload photo to ImageKit and update handover
    public function uploadPhoto(Request $request, Handover $handover)
    {
        $validator = Validator::make($request->all(), [
            'photo_url' => 'required|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()->first()
            ], 422);
        }

        try {
            $handover->update([
                'photo' => $request->photo_url,
                'date' => now(),
            ]);

            Log::info('Handover photo updated successfully', [
                'handover_id' => $handover->id,
                'photo_url' => $request->photo_url
            ]);

            return response()->json([
                'success' => true,
                'url' => $request->photo_url,
                'message' => 'Photo saved successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Handover photo update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to save photo: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update handover with date
    public function updateWithDate(Request $request, Handover $handover)
    {
        $request->validate([
            'date' => 'required|date',
            'photo_url' => 'nullable|string',
        ]);

        $updateData = [
            'date' => $request->date,
        ];

        if ($request->photo_url) {
            $updateData['photo'] = $request->photo_url;
        }

        $handover->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Handover updated successfully.'
        ]);
    }

    /**
     * Delete handover assignment and restore stock
     */
    public function destroy(Handover $handover)
    {
        try {
            DB::beginTransaction();

            $handoverId = $handover->id;
            $employeeName = $handover->employee->name;
            $equipmentType = $handover->equipment->type;
            $equipment = $handover->equipment;
            
            // Restore stock if equipment doesn't have sizes
            if (empty($equipment->size)) {
                $equipment->amount = $equipment->amount + 1;
                $equipment->save();
                Log::info('Stock restored for equipment without size', [
                    'equipment_id' => $equipment->id,
                    'equipment_type' => $equipment->type,
                    'new_stock' => $equipment->amount
                ]);
            } else if ($handover->size) {
                // Restore stock for specific size
                $sizes = explode(',', $equipment->size);
                $newSizes = [];
                
                foreach ($sizes as $sizeItem) {
                    if (strpos($sizeItem, ':') !== false) {
                        list($sizeName, $amount) = explode(':', $sizeItem);
                        if ($sizeName === $handover->size) {
                            $amount = intval($amount) + 1;
                        }
                        $newSizes[] = $sizeName . ':' . $amount;
                    }
                }
                
                $equipment->size = implode(',', $newSizes);
                $equipment->save();
                
                Log::info('Stock restored for equipment with size', [
                    'equipment_id' => $equipment->id,
                    'equipment_type' => $equipment->type,
                    'size' => $handover->size,
                    'new_sizes' => $equipment->size
                ]);
            }
            
            $handover->delete();

            DB::commit();

            Log::info('Handover assignment deleted successfully with stock restoration', [
                'handover_id' => $handoverId,
                'employee' => $employeeName,
                'equipment' => $equipmentType,
                'stock_restored' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Assignment deleted successfully and stock restored'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Handover deletion error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete assignment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display assign page with grouped handovers
     */
/**
 * Display assign page with grouped handovers
 */
public function assignPage(Request $request)
{
    // Get all equipments untuk available equipment list
    $allEquipments = WorkEquipment::orderBy('type')->get();

    // Get all active employees untuk employee selection with sections and subsections
    $allEmployees = Employee::active()
        ->with(['subSections.section'])
        ->orderBy('name')
        ->get();

    // Get all handovers dengan relasi
    $handovers = Handover::with(['employee.subSections.section', 'equipment'])
        ->when($request->search, function($q) use ($request) {
            $q->where(function($query) use ($request) {
                $query->whereHas('employee', function($empQuery) use ($request) {
                    $empQuery->where('name', 'like', "%{$request->search}%")
                            ->orWhere('nik', 'like', "%{$request->search}%");
                })->orWhereHas('equipment', function($eqQuery) use ($request) {
                    $eqQuery->where('type', 'like', "%{$request->search}%");
                });
            });
        })
        ->when($request->section && $request->section !== 'All', function($q) use ($request) {
            $q->whereHas('employee.subSections.section', function($sectionQuery) use ($request) {
                $sectionQuery->where('name', $request->section);
            });
        })
        ->when($request->sub_section && $request->sub_section !== 'All', function($q) use ($request) {
            $q->whereHas('employee.subSections', function($subSectionQuery) use ($request) {
                $subSectionQuery->where('name', $request->sub_section);
            });
        })
        ->orderBy('date', 'desc')
        ->paginate(10)
        ->withQueryString();

    // Get unique sections and subsections for filters
    $sections = Section::select('id', 'name')
        ->orderBy('name')
        ->get();
    
    $subSections = SubSection::select('id', 'name', 'section_id')
        ->with('section')
        ->orderBy('name')
        ->get();

    return inertia('apd/Assign', [
        'handovers' => $handovers,
        'equipments' => $allEquipments,
        'employees' => $allEmployees,
        'sections' => $sections,
        'subSections' => $subSections,
        'filters' => $request->only(['search', 'section', 'sub_section']),
    ]);
}

    /**
     * Quick assign equipment to employee
     */
    public function quickAssign(Request $request)
    {
        \Log::info('QuickAssign request received', $request->all());

        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'equipment_id' => 'required|exists:work_equipments,id',
                'size' => 'nullable|string|max:255',
                'quantity' => 'nullable|integer|min:1|max:10',
                'photo_url' => 'nullable|url',
            ]);

            $employeeId = $validated['employee_id'];
            $equipmentId = $validated['equipment_id'];
            $size = $validated['size'] ?? null;
            $quantity = $validated['quantity'] ?? 1;
            $photoUrl = $validated['photo_url'] ?? null;

            \Log::info('Processing assignment', [
                'employee_id' => $employeeId,
                'equipment_id' => $equipmentId,
                'size' => $size,
                'quantity' => $quantity,
                'photo_url' => $photoUrl
            ]);

            DB::beginTransaction();

            $equipment = WorkEquipment::findOrFail($equipmentId);

            // Check stock availability
            if ($equipment->size && $size) {
                // Check stock for specific size
                $sizeFound = false;
                $sizes = explode(',', $equipment->size);
                $newSizes = [];
                
                foreach ($sizes as $sizeItem) {
                    if (strpos($sizeItem, ':') !== false) {
                        list($sizeName, $amount) = explode(':', $sizeItem);
                        if ($sizeName === $size) {
                            $sizeFound = true;
                            if (intval($amount) < $quantity) {
                                throw new \Exception("Insufficient stock for {$equipment->type} (Size: {$size}). Available: {$amount}, Requested: {$quantity}");
                            }
                            $amount = intval($amount) - $quantity;
                        }
                        $newSizes[] = $sizeName . ':' . $amount;
                    }
                }
                
                if (!$sizeFound) {
                    throw new \Exception("Size {$size} not found for {$equipment->type}");
                }
                
                $equipment->size = implode(',', $newSizes);
                $equipment->save();
                
            } else if (empty($equipment->size)) {
                // Check stock for equipment without sizes
                if ($equipment->amount < $quantity) {
                    throw new \Exception("Insufficient stock for {$equipment->type}. Available: {$equipment->amount}, Requested: {$quantity}");
                }
                $equipment->amount = $equipment->amount - $quantity;
                $equipment->save();
            }

            // Create handover records
            $handovers = [];
            for ($i = 0; $i < $quantity; $i++) {
                $handover = Handover::create([
                    'employee_id' => $employeeId,
                    'equipment_id' => $equipmentId,
                    'size' => $size,
                    'date' => now(),
                    'photo' => $photoUrl,
                ]);
                $handovers[] = $handover;
            }

            DB::commit();

            \Log::info('Quick assignment completed successfully', [
                'handovers_created' => count($handovers),
                'employee_id' => $employeeId,
                'equipment_id' => $equipmentId,
                'quantity' => $quantity
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully assigned {$quantity} item(s)" . ($size ? " (Size: {$size})" : ""),
                'handovers' => $handovers
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            \Log::error('Validation error in quickAssign', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Quick assign error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign equipment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk assign multiple equipment to an employee
     */
    public function bulkAssign(Request $request)
    {
        \Log::info('BulkAssign request received', $request->all());

        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'equipment_ids' => 'required|array',
                'equipment_ids.*' => 'exists:work_equipments,id',
                'photo_url' => 'nullable|url',
            ]);

            $employeeId = $validated['employee_id'];
            $equipmentIds = $validated['equipment_ids'];
            $photoUrl = $validated['photo_url'] ?? null;

            \Log::info('Processing bulk assignment', [
                'employee_id' => $employeeId,
                'equipment_ids' => $equipmentIds,
                'photo_url' => $photoUrl
            ]);

            DB::beginTransaction();

            $handovers = [];
            $currentDate = now();

            foreach ($equipmentIds as $equipmentId) {
                $equipment = WorkEquipment::findOrFail($equipmentId);

                // Check stock for equipment without sizes
                if (empty($equipment->size)) {
                    if ($equipment->amount <= 0) {
                        throw new \Exception("Insufficient stock for {$equipment->type}");
                    }
                    $equipment->amount = $equipment->amount - 1;
                    $equipment->save();
                }

                $handover = Handover::create([
                    'employee_id' => $employeeId,
                    'equipment_id' => $equipmentId,
                    'size' => null,
                    'date' => $currentDate,
                    'photo' => $photoUrl,
                ]);

                $handovers[] = $handover;
            }

            DB::commit();

            \Log::info('Bulk assignment completed successfully', [
                'handovers_created' => count($handovers),
                'employee_id' => $employeeId
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully assigned " . count($equipmentIds) . " equipment(s) to employee",
                'handovers' => $handovers
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            \Log::error('Validation error in bulkAssign', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Bulk assign error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign equipment: ' . $e->getMessage()
            ], 500);
        }
    }

   /**
     * Get active employees without any equipment assignments with search filter
     */
  public function getUnassignedEmployees(Request $request)
{
    try {
        $search = $request->input('search', '');
        $section = $request->input('section', '');
        $subSection = $request->input('sub_section', '');
        
        \Log::info('Fetching unassigned employees', [
            'search' => $search,
            'section' => $section,
            'sub_section' => $subSection
        ]);
        
        // Get employees without handovers
        $unassignedEmployees = Employee::active()
            ->with(['subSections.section'])
            ->whereDoesntHave('handovers')
            ->when($search, function($query) use ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nik', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($section && $section !== 'All', function($query) use ($section) {
                $query->whereHas('subSections.section', function($q) use ($section) {
                    $q->where('name', $section);
                });
            })
            ->when($subSection && $subSection !== 'All', function($query) use ($subSection) {
                $query->whereHas('subSections', function($q) use ($subSection) {
                    $q->where('name', $subSection);
                });
            })
            ->orderBy('name')
            ->get(['id', 'nik', 'name', 'email']);

        \Log::info('Unassigned employees found', ['count' => $unassignedEmployees->count()]);

        return response()->json([
            'success' => true,
            'employees' => $unassignedEmployees
        ]);

    } catch (\Exception $e) {
        \Log::error('Get unassigned employees error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to get unassigned employees: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Get employee handovers
     */
    public function getEmployeeHandovers($employeeId)
    {
        try {
            $handovers = Handover::with(['employee', 'equipment'])
                ->where('employee_id', $employeeId)
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'handovers' => $handovers
            ]);

        } catch (\Exception $e) {
            \Log::error('Get employee handovers error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get handovers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update multiple handovers for an employee
     */
      public function updateEmployeeHandovers(Request $request, $employeeId)
    {
        \Log::info('UpdateEmployeeHandovers request received', $request->all());

        try {
            $validated = $request->validate([
                'date' => 'required|date',
                'photo_url' => 'nullable|url',
                'handovers' => 'required|array',
                'handovers.*.id' => 'required|exists:handovers,id',
                'handovers.*.size' => 'nullable|string|max:255',
                'handovers.*.original_size' => 'nullable|string|max:255', // Size sebelumnya untuk stock management
                'handovers.*.equipment_id' => 'required|exists:work_equipments,id',
            ]);

            $employee = Employee::findOrFail($employeeId);
            $date = $validated['date'];
            $photoUrl = $validated['photo_url'] ?? null;

            DB::beginTransaction();

            $updatedHandovers = [];
            $stockChanges = [];

            foreach ($validated['handovers'] as $handoverData) {
                $handover = Handover::with('equipment')->findOrFail($handoverData['id']);
                $newSize = $handoverData['size'] ?? null;
                $originalSize = $handoverData['original_size'] ?? $handover->size;
                $equipment = $handover->equipment;

                \Log::info('Processing handover update', [
                    'handover_id' => $handover->id,
                    'equipment_id' => $equipment->id,
                    'original_size' => $originalSize,
                    'new_size' => $newSize
                ]);

                // Handle stock management jika size berubah
                if ($originalSize !== $newSize) {
                    \Log::info('Size changed, managing stock', [
                        'from' => $originalSize,
                        'to' => $newSize
                    ]);

                    // 1. Kembalikan stock size lama
                    if ($originalSize && !empty($equipment->size)) {
                        $this->returnSizeToStock($equipment, $originalSize);
                        $stockChanges[] = [
                            'type' => 'returned',
                            'equipment_type' => $equipment->type,
                            'old_size' => $originalSize,
                            'equipment_id' => $equipment->id
                        ];
                        \Log::info('Returned stock for old size', [
                            'size' => $originalSize,
                            'equipment_id' => $equipment->id
                        ]);
                    } else if ($originalSize === null && empty($equipment->size)) {
                        // Kembalikan stock untuk equipment tanpa size
                        $equipment->amount += 1;
                        $equipment->save();
                        $stockChanges[] = [
                            'type' => 'returned',
                            'equipment_type' => $equipment->type,
                            'old_size' => 'No Size',
                            'equipment_id' => $equipment->id
                        ];
                        \Log::info('Returned stock for equipment without size', [
                            'equipment_id' => $equipment->id,
                            'new_amount' => $equipment->amount
                        ]);
                    }

                    // 2. Kurangi stock size baru
                    if ($newSize && !empty($equipment->size)) {
                        $this->assignSizeFromStock($equipment, $newSize);
                        $stockChanges[] = [
                            'type' => 'assigned',
                            'equipment_type' => $equipment->type,
                            'new_size' => $newSize,
                            'equipment_id' => $equipment->id
                        ];
                        \Log::info('Assigned stock for new size', [
                            'size' => $newSize,
                            'equipment_id' => $equipment->id
                        ]);
                    } else if ($newSize === null && empty($equipment->size)) {
                        // Kurangi stock untuk equipment tanpa size
                        if ($equipment->amount <= 0) {
                            throw new \Exception("Insufficient stock for {$equipment->type}");
                        }
                        $equipment->amount -= 1;
                        $equipment->save();
                        $stockChanges[] = [
                            'type' => 'assigned',
                            'equipment_type' => $equipment->type,
                            'new_size' => 'No Size',
                            'equipment_id' => $equipment->id
                        ];
                        \Log::info('Assigned stock for equipment without size', [
                            'equipment_id' => $equipment->id,
                            'new_amount' => $equipment->amount
                        ]);
                    }
                }

                // Update handover data
                $updateData = [
                    'date' => $date,
                    'size' => $newSize,
                ];

                if ($photoUrl) {
                    $updateData['photo'] = $photoUrl;
                }

                $handover->update($updateData);
                $updatedHandovers[] = $handover;

                \Log::info('Handover updated successfully', [
                    'handover_id' => $handover->id,
                    'new_size' => $newSize
                ]);
            }

            DB::commit();

            \Log::info('Employee handovers updated successfully with stock management', [
                'employee_id' => $employeeId,
                'handovers_updated' => count($updatedHandovers),
                'stock_changes' => $stockChanges,
                'date' => $date
            ]);

            $response = [
                'success' => true,
                'message' => 'Successfully updated ' . count($updatedHandovers) . ' handover(s)',
                'handovers' => $updatedHandovers
            ];

            // Tambahkan informasi stock changes jika ada
            if (!empty($stockChanges)) {
                $response['stock_changes'] = $stockChanges;
            }

            return response()->json($response);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            \Log::error('Validation error in updateEmployeeHandovers', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Update employee handovers error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update handovers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return size to stock (helper method)
     */
    private function returnSizeToStock(WorkEquipment $equipment, string $size)
    {
        $sizes = explode(',', $equipment->size);
        $newSizes = [];
        
        foreach ($sizes as $sizeItem) {
            if (strpos($sizeItem, ':') !== false) {
                list($sizeName, $amount) = explode(':', $sizeItem);
                if ($sizeName === $size) {
                    $amount = intval($amount) + 1;
                }
                $newSizes[] = $sizeName . ':' . $amount;
            }
        }
        
        $equipment->size = implode(',', $newSizes);
        $equipment->save();

        \Log::info('Size returned to stock', [
            'equipment_id' => $equipment->id,
            'size' => $size,
            'new_sizes' => $equipment->size
        ]);
    }

    /**
     * Assign size from stock (helper method)
     */
    private function assignSizeFromStock(WorkEquipment $equipment, string $size)
    {
        $sizes = explode(',', $equipment->size);
        $newSizes = [];
        $sizeFound = false;
        
        foreach ($sizes as $sizeItem) {
            if (strpos($sizeItem, ':') !== false) {
                list($sizeName, $amount) = explode(':', $sizeItem);
                if ($sizeName === $size) {
                    $sizeFound = true;
                    if (intval($amount) <= 0) {
                        throw new \Exception("Insufficient stock for {$equipment->type} (Size: {$size})");
                    }
                    $amount = intval($amount) - 1;
                }
                $newSizes[] = $sizeName . ':' . $amount;
            }
        }
        
        if (!$sizeFound) {
            throw new \Exception("Size {$size} not found for {$equipment->type}");
        }
        
        $equipment->size = implode(',', $newSizes);
        $equipment->save();

        \Log::info('Size assigned from stock', [
            'equipment_id' => $equipment->id,
            'size' => $size,
            'new_sizes' => $equipment->size
        ]);
    }

    /**
     * Upload file to ImageKit (utility method)
     */
    private function uploadToImageKit($file, $handoverId)
    {
        try {
            $imageKit = new ImageKit(
                config('services.imagekit.public_key'),
                config('services.imagekit.private_key'),
                config('services.imagekit.url_endpoint')
            );

            $filePath = $file->getPathname();
            $fileData = base64_encode(file_get_contents($filePath));

            $uploadResponse = $imageKit->uploadFile([
                'file' => $fileData,
                'fileName' => "handover_{$handoverId}_" . time() . '.jpg',
                'folder' => '/handovers',
                'useUniqueFileName' => true,
            ]);

            if (isset($uploadResponse->result) && isset($uploadResponse->result->url)) {
                Log::info('ImageKit upload successful', [
                    'handover_id' => $handoverId,
                    'url' => $uploadResponse->result->url
                ]);

                return [
                    'success' => true,
                    'url' => $uploadResponse->result->url
                ];
            } else {
                $error = 'Upload failed: ' . json_encode($uploadResponse);
                Log::error('ImageKit upload failed', ['error' => $error]);
                return [
                    'success' => false,
                    'error' => $error
                ];
            }

        } catch (\Exception $e) {
            Log::error('ImageKit upload error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
 * Get equipment counts for all employees
 */
public function getEmployeeEquipmentCounts()
{
    try {
        $counts = Handover::with(['employee', 'equipment'])
            ->select('employee_id', 'equipment_id', DB::raw('count(*) as total_count'))
            ->groupBy('employee_id', 'equipment_id')
            ->get()
            ->groupBy('employee_id')
            ->map(function ($employeeHandovers) {
                return $employeeHandovers->map(function ($handover) {
                    return [
                        'equipment_type' => $handover->equipment->type,
                        'total_count' => $handover->total_count
                    ];
                });
            })
            ->toArray();

        return response()->json([
            'success' => true,
            'counts' => $counts
        ]);

    } catch (\Exception $e) {
        \Log::error('Get employee equipment counts error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to get equipment counts: ' . $e->getMessage()
        ], 500);
    }
}
}