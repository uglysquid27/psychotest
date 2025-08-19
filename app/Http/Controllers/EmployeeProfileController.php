<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\JpegEncoder;

class EmployeeProfileController extends Controller
{
    public function edit(Employee $employee)
    {
        $incompleteProfile = false;
        if (is_null($employee->kelurahan) || is_null($employee->kecamatan)) {
            $incompleteProfile = true;
        }

        return inertia('Employee/Edit', [
            'employee' => $employee->only([
                'id',
                'email',
                'nik',
                'ktp',
                'name',
                'marital',
                'gender',
                'birth_date',
                'religion',
                'phone',
                'street',
                'rt',
                'rw',
                'kelurahan',
                'kecamatan',
                'kabupaten_kota',
                'provinsi',
                'kode_pos',
                'type',
                'group',
                'photo',
            ]),
            'incompleteProfile' => $incompleteProfile,
            'auth' => [
                'user' => $employee,
            ],
        ]);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'ktp' => [
                'required',
                'string',
                'max:16',
                Rule::unique('employees')->ignore($employee->id),
            ],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('employees')->ignore($employee->id),
            ],
            'type' => 'required|in:harian,bulanan',
            'gender' => 'required|in:male,female',
            'group' => 'nullable|string|max:255',
            'marital' => 'nullable|in:K0,K1,K2,K3,BM,TK1,TK2,TK3',
            'birth_date' => 'required|date',
            'religion' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'street' => 'required|string|max:255',
            'rt' => 'required|string|max:5',
            'rw' => 'required|string|max:5',
            'kelurahan' => 'required|string|max:255',
            'kecamatan' => 'required|string|max:255',
            'kabupaten_kota' => 'required|string|max:255',
            'provinsi' => 'required|string|max:255',
            'kode_pos' => 'required|string|max:10',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048'
        ]);

        if ($request->hasFile('photo')) {
            if ($employee->photo && Storage::disk('public')->exists($employee->photo)) {
                Storage::disk('public')->delete($employee->photo);
            }
            $path = $request->file('photo')->store('employee_photos', 'public');
            $validated['photo'] = $path;
        } else {
            unset($validated['photo']);
        }

        $employee->update($validated);

        return back()->with('success', 'Profil karyawan berhasil diperbarui.');
    }

    public function updatePassword(Request $request, Employee $employee)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if (!Hash::check($request->current_password, $employee->password)) {
            return back()->withErrors([
                'current_password' => ['The provided password does not match our records.']
            ]);
        }

        try {
            $employee->update([
                'password' => Hash::make($request->password),
            ]);

            Log::info('Employee password updated', ['employee_id' => $employee->id]);
            return back()->with('success', 'Password updated successfully.');
        } catch (\Exception $e) {
            Log::error('Error updating employee password', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to update password. Please try again.']);
        }
    }

    public function updatePhoto(Request $request, Employee $employee)
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
        ]);

        try {
            if ($request->hasFile('photo')) {
                $manager = new ImageManager(new Driver());
                $image = $manager->read($request->file('photo'));

                // Resize to max 500px width
                $image->scale(width: 500);

                // Encode JPEG at quality 80
                $encoded = $image->encode(new JpegEncoder(quality: 80));

                // Reduce until < 500 KB
                $quality = 80;
                while (strlen((string) $encoded) > 500 * 1024 && $quality > 10) {
                    $quality -= 5;
                    $encoded = $image->encode(new JpegEncoder(quality: $quality));
                }

                // Build relative path
                $filename = 'employee_' . $employee->id . '_' . time() . '.jpg';
                $path = 'employee-photos/' . $filename;

                // Save to public disk
                Storage::disk('public')->put($path, (string) $encoded);

                // Delete old photo if exists
                if ($employee->photo && Storage::disk('public')->exists($employee->photo)) {
                    Storage::disk('public')->delete($employee->photo);
                }

                // Save new photo path in DB
                $employee->photo = $path;
                $employee->save();
            }

            return back()->with('success', 'Photo updated successfully.');
        } catch (\Exception $e) {
            Log::error('Error updating employee photo', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to update photo. Please try again.']);
        }
    }
}