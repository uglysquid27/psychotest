<?php

namespace App\Http\Controllers;

use App\Models\Handover;
use Illuminate\Http\Request;
use ImageKit\ImageKit;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class HandoverController extends Controller
{
// In HandoverController.php
public function uploadPhoto(Request $request, Handover $handover)
{
    // Validate the request
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
        // Update the handover record with the ImageKit URL
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

    // Keep your existing methods for other functionality
    public function update(Request $request, Handover $handover)
    {
        $photoUrl = $request->input('photo_url', $handover->photo);

        $handover->update([
            'date' => $request->input('date') ?? now(),
            'photo' => $photoUrl,
        ]);

        return back()->with('success', 'Handover updated successfully.');
    }

    /**
     * Upload file to ImageKit (keep this for direct uploads if needed elsewhere)
     */
    private function uploadToImageKit($file, $handoverId)
    {
        try {
            // Initialize ImageKit
            $imageKit = new ImageKit(
                config('services.imagekit.public_key'),
                config('services.imagekit.private_key'),
                config('services.imagekit.url_endpoint')
            );

            // Get file contents and convert to base64
            $filePath = $file->getPathname();
            $fileData = base64_encode(file_get_contents($filePath));

            // Upload to ImageKit
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
     * Delete handover assignment
     */
    public function destroy(Handover $handover)
    {
        try {
            $handoverId = $handover->id;
            $employeeName = $handover->employee->name;
            $equipmentType = $handover->equipment->type;
            
            $handover->delete();

            Log::info('Handover assignment deleted successfully', [
                'handover_id' => $handoverId,
                'employee' => $employeeName,
                'equipment' => $equipmentType
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Assignment deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Handover deletion error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete assignment: ' . $e->getMessage()
            ], 500);
        }
    }
}