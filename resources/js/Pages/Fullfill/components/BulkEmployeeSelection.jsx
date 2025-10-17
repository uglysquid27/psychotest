// BulkEmployeeSelection.jsx
import React, { useState, useEffect } from "react";

export default function BulkEmployeeSelector({
  requestId,
  currentAssignments,
  excludedEmployees = [],
  onAssign,
}) {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch employees dari backend, filter by search
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`/employees?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, [search]);

  // filter: exclude employees already assigned di request lain
  const filteredEmployees = employees.filter(
    (e) =>
      !excludedEmployees.includes(e.id) && !currentAssignments.includes(e.id)
  );

  return (
    <div className="bg-gray-50 p-3 border rounded-lg">
      <div className="mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari karyawan..."
          className="p-2 border rounded-md w-full text-sm sm:text-base"
        />
      </div>

      {filteredEmployees.length > 0 ? (
        <ul className="divide-y max-h-40 overflow-y-auto">
          {filteredEmployees.map((emp) => (
            <li
              key={emp.id}
              className="flex justify-between items-center hover:bg-gray-100 px-1 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base truncate">{emp.name}</div>
                <div className="text-gray-600 text-xs sm:text-sm truncate">NIK: {emp.nik}</div>
                <div className="text-xs sm:text-sm">Score: {emp.total_score?.toFixed(2)}</div>
              </div>
              <button
                onClick={() => onAssign(emp, requestId)}
                className="bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1 rounded-md text-white text-xs sm:text-sm whitespace-nowrap ml-2"
              >
                Assign
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-xs sm:text-sm">Tidak ada karyawan tersedia</p>
      )}
    </div>
  );
}