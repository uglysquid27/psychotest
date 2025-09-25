import React, { useState } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import { IKContext, IKUpload } from "imagekitio-react";

export default function Assign() {
  const { equipment, employees, filters } = usePage().props;
  const [search, setSearch] = useState(filters.search || "");

  // modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [photo, setPhoto] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    router.get(route("equipments.assign.page", equipment.id), { search });
  };

  const openModal = (employee) => {
    setSelectedEmp(employee);
    setPhoto(employee.handover?.photo || "");
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedEmp.handover) {
      // update existing handover
      router.put(
        route("handovers.update", selectedEmp.handover.id),
        { photo }, // date = otomatis hari ini di backend
        {
          preserveScroll: true,
          onSuccess: () => setShowModal(false),
        }
      );
    } else {
      // create new handover
      router.post(
        route("equipments.assign.store", equipment.id),
        {
          employee_id: selectedEmp.id,
          photo,
        },
        {
          preserveScroll: true,
          onSuccess: () => setShowModal(false),
        }
      );
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl">
          Assign Employees - {equipment.type}
        </h2>
      }
    >
      <div className="p-6 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search by name or NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-2 py-1 w-64"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-indigo-600 text-white rounded"
          >
            Search
          </button>
        </form>

        {/* Table */}
        <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
  <thead>
  <tr className="bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
    <th className="px-4 py-2 border">#</th>
    <th className="px-4 py-2 border">Name</th>
    <th className="px-4 py-2 border">NIK</th>
    <th className="px-4 py-2 border">Photo</th>
    <th className="px-4 py-2 border">Date</th>
    <th className="px-4 py-2 border">Action</th>
  </tr>
</thead>
<tbody>
  {employees.data.map((emp, idx) => (
    <tr key={emp.id} className="text-sm text-gray-800 dark:text-gray-200">
      <td className="px-4 py-2 border">
        {(employees.current_page - 1) * employees.per_page + idx + 1}
      </td>
      <td className="px-4 py-2 border">{emp.name}</td>
      <td className="px-4 py-2 border">{emp.nik}</td>

      {/* 🔥 Photo */}
      <td className="px-4 py-2 border text-center">
        {emp.handover?.photo ? (
          <img
            src={emp.handover.photo}
            alt="handover"
            className="w-12 h-12 object-cover rounded mx-auto"
          />
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>

      {/* 🔥 Date */}
      <td className="px-4 py-2 border text-center">
        {emp.handover?.date
          ? new Date(emp.handover.date).toLocaleDateString("id-ID")
          : <span className="text-gray-400 text-sm">-</span>}
      </td>

      {/* Action */}
      <td className="px-4 py-2 border text-center">
        <button
          onClick={() => openModal(emp)}
          className={`px-3 py-1 rounded text-white ${
            emp.handover
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {emp.handover ? "Update" : "Assign"}
        </button>
      </td>
    </tr>
  ))}
  {employees.data.length === 0 && (
    <tr>
      <td
        colSpan="6"
        className="text-center py-4 text-gray-500 dark:text-gray-400"
      >
        No employees found.
      </td>
    </tr>
  )}
</tbody>

        </table>

        {/* Pagination */}
        <div className="mt-4 flex justify-center gap-2">
          {employees.links.map((link, i) => (
            <Link
              key={i}
              href={link.url || "#"}
              dangerouslySetInnerHTML={{ __html: link.label }}
              className={`px-3 py-1 border rounded ${
                link.active ? "bg-indigo-600 text-white" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        {selectedEmp && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-4">
              {selectedEmp.handover ? "Update Handover" : "Assign Equipment"}
            </h2>

            <p>
              <span className="font-semibold">Equipment:</span> {equipment.type}
            </p>
            <p>
              <span className="font-semibold">Employee:</span>{" "}
              {selectedEmp.name} ({selectedEmp.nik})
            </p>

            {/* ImageKit Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <IKContext
                publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
                urlEndpoint="https://ik.imagekit.io/arina123"
                authenticator={async () => {
                  const res = await fetch("http://localhost:8000/api/imagekit/auth");
                  return await res.json();
                }}
              >
                <IKUpload
                  fileName={`handover_${equipment.id}_${selectedEmp.id}.jpg`}
                  onError={(err) => console.error("Upload Error:", err)}
                  onSuccess={(res) => setPhoto(res.url)}
                />
              </IKContext>
              {photo && (
                <img
                  src={photo}
                  alt="preview"
                  className="w-24 h-24 object-cover rounded mt-2"
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-2 bg-gray-500 text-white rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 text-white rounded-md"
              >
                {selectedEmp.handover ? "Update" : "Assign"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AuthenticatedLayout>
  );
}
