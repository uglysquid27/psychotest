import { useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';
import SectionSelection from './components/SectionSelection';
import RequestForm from './components/RequestForm';
import SubSectionModal from './components/SubSectionModal';

export default function Create({ sections, shifts }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSubSectionModal, setShowSubSectionModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);
  const [globalDate, setGlobalDate] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [selectedSubSections, setSelectedSubSections] = useState([]);

  const { data, setData, post, processing, errors } = useForm({
    requests: []
  });

  const today = new Date().toISOString().split('T')[0];

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    setSelectedSubSections([]); // Reset selected subsections when changing section
    setShowSubSectionModal(true);
  };

  const handleSubSectionSelect = (subSections) => {
    const initialTimeSlots = {};
    shifts.forEach(shift => {
      // Initialize with empty array for each shift
      initialTimeSlots[shift.id] = [];
      
      // Add default time slot for each shift
      initialTimeSlots[shift.id].push({
        requested_amount: '',
        male_count: 0,
        female_count: 0,
        start_time: shift.start_time || '',
        end_time: shift.end_time || '',
        reason: '',
        is_additional: false,
      });
    });

    const newRequests = subSections.map(subSection => ({
      sub_section_id: subSection.id,
      sub_section_name: subSection.name,
      section_name: selectedSection.name,
      date: globalDate,
      time_slots: JSON.parse(JSON.stringify(initialTimeSlots)) // Deep copy
    }));

    setRequests([...requests, ...newRequests]);
    setActiveRequestIndex(requests.length > 0 ? requests.length : 0);
    setShowSubSectionModal(false);
    setSelectedSubSections([]);
  };

  const handleGlobalDateChange = (newDate) => {
    setGlobalDate(newDate);
    const updatedRequests = requests.map(request => ({
      ...request,
      date: newDate
    }));
    setRequests(updatedRequests);
  };

  const handleRequestChange = (index, field, value) => {
    const updatedRequests = [...requests];
    updatedRequests[index][field] = value;
    setRequests(updatedRequests);
  };

  const handleSlotChange = (index, shiftId, slotIndex, field, value) => {
    const updatedRequests = [...requests];
    
    if (field === 'add_slot') {
      // Add a new time slot
      updatedRequests[index].time_slots[shiftId].push(value);
    } else if (field === 'remove_slot') {
      // Remove a time slot (only if not the first one)
      if (slotIndex > 0) {
        updatedRequests[index].time_slots[shiftId].splice(slotIndex, 1);
      }
    } else {
      // Update a specific field in a time slot
      updatedRequests[index].time_slots[shiftId][slotIndex][field] = value;
    }
    
    setRequests(updatedRequests);
  };

  const removeRequest = (index) => {
    const updatedRequests = [...requests];
    updatedRequests.splice(index, 1);
    setRequests(updatedRequests);
    if (activeRequestIndex >= index) {
      setActiveRequestIndex(Math.max(0, activeRequestIndex - 1));
    }
  };

  const handleShowSummary = () => {
    const hasValidRequests = requests.some(request => 
      Object.values(request.time_slots).some(slots => 
        slots.some(slot => slot.requested_amount && parseInt(slot.requested_amount) > 0)
      )
    );

    if (!hasValidRequests) {
      alert('At least one request must have requested amount > 0');
      return;
    }

    if (!globalDate) {
      alert('Please select a date for all requests');
      return;
    }

    setShowSummary(true);
  };

  const submitAllRequests = (e) => {
    if (e) e.preventDefault();
    
    const formattedRequests = requests.map(request => ({
      sub_section_id: request.sub_section_id,
      date: globalDate,
      time_slots: Object.entries(request.time_slots)
        .filter(([shiftId, slots]) => 
          slots.some(slot => slot.requested_amount && parseInt(slot.requested_amount) > 0)
        )
        .reduce((acc, [shiftId, slots]) => {
          // Process each time slot for this shift
          slots.forEach((slot, slotIndex) => {
            if (slot.requested_amount && parseInt(slot.requested_amount) > 0) {
              const slotKey = slotIndex === 0 ? shiftId : `${shiftId}_${slotIndex}`;
              acc[slotKey] = {
                requested_amount: parseInt(slot.requested_amount),
                male_count: parseInt(slot.male_count) || 0,
                female_count: parseInt(slot.female_count) || 0,
                start_time: slot.start_time,
                end_time: slot.end_time,
                reason: slot.reason || '',
                is_additional: slotIndex > 0 || slot.is_additional || false
              };
            }
          });
          return acc;
        }, {})
    })).filter(request => Object.keys(request.time_slots).length > 0);

    if (formattedRequests.length === 0) {
      alert('At least one request must have requested amount > 0');
      return;
    }

    setData('requests', formattedRequests);
    post('/manpower-requests');
  };

  const RequestSummary = () => {
    const formatTimeForDisplay = (timeString) => {
      if (!timeString) return '-';
      if (timeString.includes(':') && timeString.split(':').length === 3) {
        return timeString.substring(0, 5);
      }
      return timeString;
    };

    const getShiftName = (shiftId) => {
      // Handle additional time slots
      if (shiftId.includes('_')) {
        const parts = shiftId.split('_');
        const baseShiftId = parts[0];
        const slotIndex = parseInt(parts[1]);
        const shift = shifts.find(s => s.id == baseShiftId);
        return shift ? `${shift.name} (Time ${slotIndex + 1})` : `Shift ${baseShiftId} (Time ${slotIndex + 1})`;
      }
      
      const shift = shifts.find(s => s.id == shiftId);
      return shift ? shift.name : `Shift ${shiftId}`;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const calculateTotals = () => {
      let totalEmployees = 0;
      let totalMale = 0;
      let totalFemale = 0;
      let totalSections = requests.length;
      let totalShifts = 0;

      requests.forEach(request => {
        Object.values(request.time_slots).forEach(slots => {
          slots.forEach(slot => {
            if (slot.requested_amount && parseInt(slot.requested_amount) > 0) {
              totalEmployees += parseInt(slot.requested_amount);
              totalMale += parseInt(slot.male_count) || 0;
              totalFemale += parseInt(slot.female_count) || 0;
              totalShifts += 1;
            }
          });
        });
      });

      return { totalEmployees, totalMale, totalFemale, totalSections, totalShifts };
    };

    const totals = calculateTotals();

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
              Request Summary
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Review your manpower requests before submitting.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Total Requests</h4>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{requests.length}</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Sub-sections</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Total Employees</h4>
                <p className="text-2xl font-bold text-green-600 dark:text-green-300">{totals.totalEmployees}</p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">Across all shifts</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Details by Sub-section</h4>
              <div className="space-y-4">
                {requests.map((request, index) => {
                  const requestTotals = {
                    employees: 0,
                    male: 0,
                    female: 0,
                    shifts: 0
                  };

                  Object.values(request.time_slots).forEach(slots => {
                    slots.forEach(slot => {
                      if (slot.requested_amount && parseInt(slot.requested_amount) > 0) {
                        requestTotals.employees += parseInt(slot.requested_amount);
                        requestTotals.male += parseInt(slot.male_count) || 0;
                        requestTotals.female += parseInt(slot.female_count) || 0;
                        requestTotals.shifts += 1;
                      }
                    });
                  });

                  if (requestTotals.employees === 0) return null;

                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {request.section_name} - {request.sub_section_name}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Date: {formatDate(request.date)}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
                          <p className="font-medium">{requestTotals.employees}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                          <p className="text-xs text-blue-500 dark:text-blue-400">Male</p>
                          <p className="font-medium text-blue-600 dark:text-blue-300">{requestTotals.male}</p>
                        </div>
                        <div className="bg-pink-50 dark:bg-pink-900/20 rounded p-2">
                          <p className="text-xs text-pink-500 dark:text-pink-400">Female</p>
                          <p className="font-medium text-pink-600 dark:text-pink-300">{requestTotals.female}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shift Details:</h6>
                        <div className="space-y-2">
                          {Object.entries(request.time_slots).map(([shiftId, slots]) => 
                            slots.map((slot, slotIndex) => {
                              if (!slot.requested_amount || parseInt(slot.requested_amount) === 0) return null;
                              
                              return (
                                <div key={`${shiftId}_${slotIndex}`} className="text-sm pl-3 border-l-2 border-gray-200 dark:border-gray-600">
                                  <p className="font-medium">{getShiftName(slotIndex === 0 ? shiftId : `${shiftId}_${slotIndex}`)}</p>
                                  <p>Time: {formatTimeForDisplay(slot.start_time)} - {formatTimeForDisplay(slot.end_time)}</p>
                                  <p>Employees: {slot.requested_amount} ({slot.male_count || 0}M / {slot.female_count || 0}F)</p>
                                  {slot.reason && (
                                    <p className="text-gray-500 dark:text-gray-400 italic">Reason: {slot.reason}</p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition ease-in-out duration-150"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={submitAllRequests}
                disabled={processing}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition ease-in-out duration-150"
              >
                {processing ? 'Submitting...' : 'Submit All Requests'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showSummary) {
    return (
      <AuthenticatedLayout
        header={
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Review Man Power Requests
          </h2>
        }
      >
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
              <div className="p-6 text-gray-900 dark:text-gray-100">
                <RequestSummary />
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          Request Man Power
        </h2>
      }
    >
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              {!selectedSection ? (
                <SectionSelection 
                  sections={sections} 
                  onSelect={handleSectionSelect} 
                />
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                      Select Date for All Requests
                    </h3>
                    <input
                      type="date"
                      value={globalDate}
                      onChange={(e) => handleGlobalDateChange(e.target.value)}
                      min={today}
                      className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-gray-100"
                      required
                    />
                    {globalDate && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-300">
                        This date will be applied to all sub-sections you add.
                      </p>
                    )}
                    {errors.date && <p className="mt-1 text-red-600 dark:text-red-400 text-sm">{errors.date}</p>}
                  </div>

                  <div className="flex overflow-x-auto pb-2">
                    {requests.map((request, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveRequestIndex(index)}
                        className={`flex items-center px-4 py-2 mr-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                          activeRequestIndex === index 
                            ? 'bg-indigo-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {request.section_name} - {request.sub_section_name}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeRequest(index); }}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          &times;
                        </button>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowSubSectionModal(true)}
                      className={`flex items-center px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-md whitespace-nowrap `}
                    >
                      + Add Sub Section
                    </button>
                  </div>

                  {requests.length > 0 && globalDate && (
                    <>
                      <RequestForm
                        request={requests[activeRequestIndex]}
                        shifts={shifts}
                        errors={errors.requests?.[activeRequestIndex] || {}}
                        onChange={(field, value) => handleRequestChange(activeRequestIndex, field, value)}
                        onSlotChange={(shiftId, slotIndex, field, value) => handleSlotChange(activeRequestIndex, shiftId, slotIndex, field, value)}
                        globalDate={globalDate}
                        hideDate={true}
                      />
                      <div className="flex justify-end pt-4 space-x-3">
                        <button
                          type="button"
                          onClick={handleShowSummary}
                          className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Review Summary
                        </button>
                      </div>
                    </>
                  )}

                  {requests.length > 0 && !globalDate && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        Please select a date above before configuring your requests.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SubSectionModal
        isOpen={showSubSectionModal}
        onClose={() => setShowSubSectionModal(false)}
        section={selectedSection}
        onSelect={handleSubSectionSelect}
        selectedSubSections={requests.map(r => r.sub_section_id)}
      />
    </AuthenticatedLayout>
  );
}