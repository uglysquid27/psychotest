// js/pages/ManpowerRequests/Create/components/RequestForm.jsx
import { useState } from 'react';
import GenderFields from './GenderFields';
import TimeFields from './TimeFields';

export default function RequestForm({ 
  request, 
  shifts, 
  errors, 
  onChange, 
  onSlotChange, 
  globalDate = null, 
  hideDate = false 
}) {
  const today = new Date().toISOString().split('T')[0];
  const [duplicateRequests, setDuplicateRequests] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleNumberFocus = (e) => {
    if (e.target.value === '0') {
      e.target.value = '';
    }
  };

  const handleSlotChange = (shiftId, slotIndex, field, value) => {
    if (field === 'requested_amount' || field === 'male_count' || field === 'female_count') {
      if (value === '' || value === '0') {
        value = '';
      } else if (value.startsWith('0') && value.length > 1) {
        value = value.replace(/^0+/, '');
      }
    }

    onSlotChange(shiftId, slotIndex, field, value);
  };

  const addTimeSlot = (shiftId) => {
    const shiftSlots = request.time_slots[shiftId] || [];
    const defaultShift = shifts.find(s => s.id === shiftId);
    
    let newStartTime = '';
    let newEndTime = '';
    
    if (defaultShift && defaultShift.start_time && defaultShift.end_time) {
      // Calculate new times based on the number of existing additional slots
      const hourOffset = shiftSlots.length; // +1 hour for first additional, +2 for second, etc.
      
      const formatTime = (timeString, offsetHours) => {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        let newHours = hours + offsetHours;
        
        // Handle overflow (24-hour format)
        if (newHours >= 24) {
          newHours = newHours % 24;
        }
        
        return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };
      
      newStartTime = formatTime(defaultShift.start_time, hourOffset);
      newEndTime = formatTime(defaultShift.end_time, hourOffset);
    }
    
    const newSlot = {
      requested_amount: '',
      male_count: 0,
      female_count: 0,
      start_time: newStartTime,
      end_time: newEndTime,
      reason: '',
      is_additional: true,
    };
    
    onSlotChange(shiftId, shiftSlots.length, 'add_slot', newSlot);
  };

  const removeTimeSlot = (shiftId, slotIndex) => {
    onSlotChange(shiftId, slotIndex, 'remove_slot', null);
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to validate time combinations
  const validateShiftTimes = (startTime, endTime) => {
    if (!startTime || !endTime) return { isValid: true, message: '' };
    
    // Allow same times (like 00:00:00 to 00:00:00 for continuous shifts)
    if (startTime === endTime) {
      return { 
        isValid: true, 
        message: 'Shift berlangsung 24 jam penuh',
        type: 'info'
      };
    }
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
      return { 
        isValid: true, 
        message: `Shift malam: ${startTime.substring(0, 5)} - ${endTime.substring(0, 5)} (+1 hari)`,
        type: 'warning'
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Get all time slots for all shifts
  const getAllTimeSlots = () => {
    const allSlots = [];
    
    shifts.forEach(shift => {
      const shiftSlots = request.time_slots[shift.id] || [];
      
      shiftSlots.forEach((slotData, slotIndex) => {
        allSlots.push({
          id: `${shift.id}_${slotIndex}`,
          shiftId: shift.id,
          slotIndex,
          shiftData: shift,
          slotData,
          isAdditional: slotIndex > 0
        });
      });
    });
    
    return allSlots;
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
          Sub Section
        </label>
        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          {request.sub_section_name} ({request.section_name})
        </div>
      </div>

      {/* Date field - only show if not hidden */}
      {!hideDate && (
        <div>
          <label htmlFor="date" className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Tanggal Dibutuhkan <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={request.date}
            onChange={(e) => onChange('date', e.target.value)}
            min={today}
            className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border ${errors.date ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100`}
            required
          />
          {errors.date && <p className="mt-1 text-red-600 dark:text-red-400 text-sm">{errors.date}</p>}
        </div>
      )}

      {/* Show selected date from global date */}
      {hideDate && globalDate && (
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Tanggal Dibutuhkan
          </label>
          <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-green-800 dark:text-green-200 font-medium">
                {formatDateForDisplay(globalDate)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mt-4 pt-4 border-t">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 text-lg">
          Jumlah Man Power per Shift
        </h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400 text-sm italic">
          Isi hanya shift yang Anda butuhkan *manpower*nya. Shift lain akan diabaikan.
        </p>

        {shifts.map((shift) => {
          const shiftSlots = request.time_slots[shift.id] || [];
          
          return (
            <div key={shift.id} className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  {shift.name}
                  {shift.start_time && shift.end_time && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      (Default: {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)})
                    </span>
                  )}
                </h4>
                
                <button
                  type="button"
                  onClick={() => addTimeSlot(shift.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  + Tambah Waktu
                </button>
              </div>

              {shiftSlots.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 italic">
                  Tidak ada waktu yang ditambahkan untuk shift ini
                </div>
              )}

              {shiftSlots.map((slotData, slotIndex) => {
                const requestedAmount = parseInt(slotData.requested_amount) || 0;
                const showGenderFields = requestedAmount > 0;
                const isDuplicate = duplicateRequests.some(req => 
                  req.shift_id == shift.id && req.slot_index === slotIndex
                );
                
                // Validate time combination for this shift
                const timeValidation = validateShiftTimes(slotData.start_time, slotData.end_time);

                return (
                  <div key={`${shift.id}_${slotIndex}`} className={`p-3 border ${isDuplicate ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-600'} rounded-md space-y-3`}>
                    <div className="flex justify-between items-center">
                      <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Waktu {slotIndex + 1}
                        {slotIndex === 0 && <span className="ml-2 text-xs text-gray-500">(Default)</span>}
                        {slotIndex > 0 && (
                          <span className="ml-2 text-xs text-blue-500 dark:text-blue-300">
                            (+{slotIndex} hour{slotIndex > 1 ? 's' : ''})
                          </span>
                        )}
                      </h5>
                      
                      {slotIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(shift.id, slotIndex)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-sm"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`amount_${shift.id}_${slotIndex}`} className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        Jumlah Karyawan Diminta
                      </label>
                      <input
                        type="number"
                        id={`amount_${shift.id}_${slotIndex}`}
                        min="0"
                        value={slotData.requested_amount}
                        onChange={(e) => handleSlotChange(shift.id, slotIndex, 'requested_amount', e.target.value)}
                        onFocus={handleNumberFocus}
                        onWheel={(e) => e.target.blur()}
                        placeholder="Jumlah"
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border ${errors.time_slots?.[shift.id]?.[slotIndex]?.requested_amount ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100`}
                      />
                      {errors.time_slots?.[shift.id]?.[slotIndex]?.requested_amount && (
                        <p className="mt-1 text-red-600 dark:text-red-400 text-sm">{errors.time_slots[shift.id][slotIndex].requested_amount}</p>
                      )}
                    </div>

                    {isDuplicate && showDuplicateWarning && (
                      <div>
                        <label htmlFor={`reason_${shift.id}_${slotIndex}`} className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">
                          Alasan Tambahan Request <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id={`reason_${shift.id}_${slotIndex}`}
                          value={slotData.reason || ''}
                          onChange={(e) => handleSlotChange(shift.id, slotIndex, 'reason', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
                          placeholder="Jelaskan mengapa Anda membutuhkan tambahan manpower"
                          required
                        />
                      </div>
                    )}

                    {showGenderFields && (
                      <>
                        <TimeFields
                          shift={shift}
                          slotData={slotData}
                          errors={errors.time_slots?.[shift.id]?.[slotIndex] || {}}
                          handleSlotChange={(field, value) => handleSlotChange(shift.id, slotIndex, field, value)}
                        />

                        {/* Display time validation message */}
                        {timeValidation.message && (
                          <div className={`border rounded-md p-3 ${
                            timeValidation.type === 'warning' 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex">
                              <div className="flex-shrink-0">
                                {timeValidation.type === 'warning' ? (
                                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3">
                                <p className={`text-sm ${
                                  timeValidation.type === 'warning'
                                    ? 'text-blue-800 dark:text-blue-200'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {timeValidation.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <GenderFields
                          shift={shift}
                          slotData={slotData}
                          requestedAmount={requestedAmount}
                          handleSlotChange={(field, value) => handleSlotChange(shift.id, slotIndex, field, value)}
                          handleNumberFocus={handleNumberFocus}
                          sectionName={request.section_name}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}