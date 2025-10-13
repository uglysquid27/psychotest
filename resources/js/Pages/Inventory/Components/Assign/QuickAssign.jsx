import React, { useState } from "react";
import Modal from "@/Components/Modal";

export default function QuickAssign({ show, onClose, employee, equipments, onSuccess, onError }) {
    const [formData, setFormData] = useState({
        equipment_id: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
        photo: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.equipment_id) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(route("handovers.store"), {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({
                    ...formData,
                    employee_id: employee.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                throw new Error(data.error || "Assignment failed");
            }
        } catch (error) {
            onError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white dark:bg-gray-800 shadow-xl p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex justify-center items-center bg-green-100 dark:bg-green-900/20 rounded-full w-10 h-10">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Quick Assign Equipment</h3>
                </div>

                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-300 text-sm">
                        Assigning to: <strong>{employee?.name}</strong> (NIK: {employee?.nik})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Equipment *
                        </label>
                        <select
                            required
                            value={formData.equipment_id}
                            onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors"
                        >
                            <option value="">Select Equipment</option>
                            {equipments.map((equipment) => (
                                <option key={equipment.id} value={equipment.id}>
                                    {equipment.type} {equipment.size && `- Size: ${equipment.size}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Assignment Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors"
                            placeholder="Additional notes about this assignment..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="disabled:opacity-50 px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.equipment_id}
                            className="disabled:opacity-50 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium text-white transition-colors"
                        >
                            {isSubmitting ? "Assigning..." : "Assign Equipment"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}