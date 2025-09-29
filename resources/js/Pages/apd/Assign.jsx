import React, { useState } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import { IKContext, IKUpload } from "imagekitio-react";

export default function Assign() {
  // Remove equipment-specific filtering, get all handovers
  const { handovers, filters } = usePage().props;
  const [search, setSearch] = useState(filters.search || "");

  // modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [photo, setPhoto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debug states
  const [uploadStatus, setUploadStatus] = useState("");
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [handoverToDelete, setHandoverToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openModal = (employee, handover = null) => {
    setSelectedEmp(employee);
    setSelectedHandover(handover);
    setPhoto(handover?.photo || "");
    setShowModal(true);
    // Reset debug info when opening modal
    setUploadStatus("");
    setDebugInfo({});
    setShowDebug(false);
  };

  // Open delete confirmation modal
  const openDeleteModal = (handover) => {
    setHandoverToDelete(handover);
    setShowDeleteModal(true);
  };

  // Handle delete assignment
  const handleDelete = async () => {
    if (!handoverToDelete) return;

    setIsDeleting(true);

    try {
      const url = `/handovers/${handoverToDelete.id}`;
      
      // Get CSRF token
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                     document.querySelector('meta[name="X-CSRF-TOKEN"]')?.getAttribute('content') ||
                     document.querySelector('input[name="_token"]')?.value;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setShowDeleteModal(false);
        router.reload();
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!photo) {
    alert('Please upload a photo first');
    return;
  }

  setIsSubmitting(true);
  setUploadStatus("saving");

  try {
    const url = `/handovers/${selectedHandover.id}/upload-photo`;
    
    // Get CSRF token from multiple possible sources
    let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                   document.querySelector('meta[name="X-CSRF-TOKEN"]')?.getAttribute('content') ||
                   document.querySelector('input[name="_token"]')?.value;

    console.log('CSRF Token found:', !!csrfToken);

    if (!csrfToken) {
      throw new Error('CSRF token not found');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
      credentials: 'include', // Important for sessions
      body: JSON.stringify({
        photo_url: photo,
        handover_id: selectedHandover.id
      }),
    });

    console.log('Response status:', response.status);

    // Handle different response types
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      // If it's a 419, it's definitely CSRF issue
      if (response.status === 419) {
        throw new Error('CSRF token mismatch. Please refresh the page and try again.');
      }
      
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('JSON Response:', result);

    if (result.success) {
      setUploadStatus("success");
      setTimeout(() => {
        setShowModal(false);
        router.reload();
      }, 1000);
    } else {
      throw new Error(result.error || 'Save failed');
    }
  } catch (error) {
    setIsSubmitting(false);
    setUploadStatus("error");
    setDebugInfo(prev => ({ 
      ...prev, 
      submitError: error.message,
      timestamp: new Date().toISOString()
    }));
    console.error('Save error details:', {
      error: error.message,
      handoverId: selectedHandover?.id,
      photoUrl: photo
    });
    alert('Save failed: ' + error.message);
  }
};

// Add new state for the file
const [photoFile, setPhotoFile] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    router.get(route("equipments.assign.page"), { search }); // ✅ Correct route
  };

  // In the clearSearch function
  const clearSearch = () => {
    setSearch("");
    router.get(route("equipments.assign.page"), { search: "" }); // ✅ Correct route
  };

  // Debug function to test ImageKit authentication
  const testImageKitAuth = async () => {
    try {
      setUploadStatus("testing-auth");
      setDebugInfo(prev => ({ ...prev, authTest: "Testing authentication..." }));
      
      const response = await fetch("http://localhost:8000/api/imagekit/auth");
      const authData = await response.json();
      
      setDebugInfo(prev => ({ 
        ...prev, 
        authTest: "Auth test completed",
        authResponse: authData,
        authStatus: response.status,
        authOk: response.ok
      }));
      
      if (!response.ok) {
        setUploadStatus("auth-failed");
        throw new Error(`Auth API failed with status: ${response.status}`);
      }
      
      setUploadStatus("auth-success");
      return authData;
    } catch (error) {
      setUploadStatus("auth-error");
      setDebugInfo(prev => ({ ...prev, authError: error.message }));
      console.error("Auth Test Error:", error);
      return null;
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-xl text-gray-800 dark:text-white">
              Update Equipment Assignments
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage all equipment assignments across all equipment types
            </p>
          </div>
          <Link
            href={route("equipments.index")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Equipment
          </Link>
        </div>
      }
    >
      <div className="py-6">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    All Assignments Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Update handover photos for all equipment assignments
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                    {handovers.total} assignments
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search employees by name, NIK, or equipment type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  Search
                </button>
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Assignments Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">Employee</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">NIK</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">Equipment</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">Size</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">Assignment Date</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">Photo</th>
                    <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {handovers.data.map((handover) => (
                    <tr key={handover.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            {handover.employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{handover.employee.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{handover.employee.nik}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {handover.equipment.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {handover.size ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {handover.size}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {handover.date
                          ? new Date(handover.date).toLocaleDateString("id-ID", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {handover.photo ? (
                          <img
                            src={handover.photo}
                            alt="handover"
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            No photo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(handover.employee, handover)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Update Photo
                          </button>
                          <button
                            onClick={() => openDeleteModal(handover)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {handovers.data.map((handover) => (
                <div key={handover.id} className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {handover.employee.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{handover.employee.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{handover.employee.nik}</div>
                      </div>
                    </div>
                    {handover.size && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {handover.size}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Equipment</div>
                      <div className="text-gray-900 dark:text-white font-medium">{handover.equipment.type}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Assignment Date</div>
                      <div className="text-gray-900 dark:text-white">
                        {handover.date
                          ? new Date(handover.date).toLocaleDateString("id-ID")
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Photo</div>
                      <div>
                        {handover.photo ? (
                          <img
                            src={handover.photo}
                            alt="handover"
                            className="w-10 h-10 object-cover rounded border"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No photo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(handover.employee, handover)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Update Photo
                    </button>
                    <button
                      onClick={() => openDeleteModal(handover)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {handovers.data.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assignments found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {search ? 'Try adjusting your search terms' : 'No assignments found in the system'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {handovers.last_page > 1 && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {handovers.from} to {handovers.to} of {handovers.total} assignments
                </div>
                <div className="flex gap-2">
                  <Link
                    href={handovers.prev_page_url || "#"}
                    preserveScroll
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${handovers.prev_page_url
                        ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                  >
                    Previous
                  </Link>
                  <Link
                    href={handovers.next_page_url || "#"}
                    preserveScroll
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${handovers.next_page_url
                        ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                  >
                    Next
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Photo Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} maxWidth="lg">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Update Handover Photo
            </h2>
          </div>

          {selectedEmp && selectedHandover && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Assignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Equipment</label>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedHandover.equipment.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Employee</label>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedEmp.name} ({selectedEmp.nik})</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Size</label>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedHandover.size || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Date</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(selectedHandover.date).toLocaleDateString("id-ID", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
{/* Photo Upload */}
<div>
  <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
    Update Handover Photo
  </label>

  {/* Current Photo */}
  {selectedHandover.photo && !photo && (
    <div className="mb-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current photo:</p>
      <img
        src={selectedHandover.photo}
        alt="current handover"
        className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
      />
    </div>
  )}

  {/* New Photo Upload */}
  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
    <IKContext
      publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
      authenticator={async () => {
        try {
          setUploadStatus("authenticating");
          
          // Use relative path instead of absolute localhost
          const response = await fetch("/api/imagekit/auth");
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Auth failed: ${response.status} - ${errorText}`);
          }
          
          const data = await response.json();
          
          // Validate the response has required fields
          if (!data.token || !data.signature) {
            throw new Error('Invalid authentication response');
          }
          
          setUploadStatus("auth-success");
          return data;
        } catch (error) {
          setUploadStatus("auth-error");
          setDebugInfo(prev => ({ 
            ...prev, 
            authError: error.message,
            authTimestamp: new Date().toISOString()
          }));
          console.error("ImageKit Auth Error:", error);
          throw error;
        }
      }}
    >
      <IKUpload
        fileName={`handover_${selectedHandover.id}_${Date.now()}.jpg`}
        folder="/handovers"
        useUniqueFileName={true}
        onError={(err) => {
          console.error("Upload Error Details:", err);
          setUploadStatus("upload-failed");
          setDebugInfo(prev => ({ 
            ...prev, 
            uploadError: err,
            uploadTimestamp: new Date().toISOString()
          }));
          alert('Photo upload failed. Please try again.');
        }}
        onSuccess={(res) => {
          console.log("Upload Success:", res);
          setUploadStatus("upload-success");
          setPhoto(res.url);
          setDebugInfo(prev => ({ 
            ...prev, 
            uploadSuccess: res,
            uploadTimestamp: new Date().toISOString()
          }));
        }}
        onUploadStart={() => {
          setUploadStatus("uploading");
          console.log("Upload starting...");
        }}
        validateFile={(file) => {
          const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
          const isValidType = validTypes.includes(file.type);
          const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
          
          if (!isValidType) {
            alert('Please select a valid image file (JPEG, PNG)');
            return false;
          }
          if (!isValidSize) {
            alert('File size must be less than 10MB');
            return false;
          }
          return true;
        }}
        className="hidden"
        id="photo-upload"
      />
    </IKContext>

    <div className="space-y-4">
      {!photo ? (
        <>
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <label
              htmlFor="photo-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose Photo
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload a new handover photo (JPEG, PNG, max 10MB)
          </p>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            ✓ Photo uploaded successfully!
          </p>
          <img
            src={photo}
            alt="uploaded handover"
            className="w-48 h-48 mx-auto object-cover rounded-lg border border-gray-200 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={() => setPhoto("")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Photo
          </button>
        </div>
      )}
    </div>
  </div>
</div>

              {/* Debug Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showDebug ? '▼' : '▶'} Debug Info
                </button>
                {showDebug && (
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
                    <div>Status: {uploadStatus}</div>
                    <div>Handover ID: {selectedHandover.id}</div>
                    <div>Photo URL: {photo ? 'Set' : 'Not set'}</div>
                    <div>Debug: {JSON.stringify(debugInfo, null, 2)}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!photo || isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${!photo || isSubmitting
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
              Delete Assignment
            </h2>
          </div>

          {handoverToDelete && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-300">
                    Are you sure you want to delete this assignment?
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Employee</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {handoverToDelete.employee.name} ({handoverToDelete.employee.nik})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Equipment</label>
                  <p className="text-gray-900 dark:text-white font-medium">{handoverToDelete.equipment.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Size</label>
                  <p className="text-gray-900 dark:text-white font-medium">{handoverToDelete.size || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Date</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {handoverToDelete.date 
                      ? new Date(handoverToDelete.date).toLocaleDateString("id-ID", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AuthenticatedLayout>
  );
}