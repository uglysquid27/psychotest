import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';

export default function Index() {
  const { equipments } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hasSize, setHasSize] = useState(false);
  const [form, setForm] = useState({
    type: '',
    sizes: [{ size: '', amount: '' }], // untuk hasSize
    amount: '', // untuk non size
  });

  const handleOpen = (equipment = null) => {
    setEditing(equipment);
    if (equipment && equipment.size) {
      // parse size string "S:2,M:3" atau "S,2;M,3" sesuai format DB
      const sizesArray = equipment.size.split(',').map(s => {
        const [size, amount] = s.split(':');
        return { size, amount };
      });
      setForm({ type: equipment.type, sizes: sizesArray, amount: '' });
      setHasSize(true);
    } else {
      setForm({ type: equipment?.type || '', sizes: [{ size: '', amount: '' }], amount: equipment?.amount || '' });
      setHasSize(false);
    }
    setShowModal(true);
  };

  const handleSizeChange = (index, key, value) => {
    const newSizes = [...form.sizes];
    newSizes[index][key] = value;
    setForm({ ...form, sizes: newSizes });
  };

  const addSizeField = () => {
    setForm({ ...form, sizes: [...form.sizes, { size: '', amount: '' }] });
  };

  const removeSizeField = (index) => {
    const newSizes = form.sizes.filter((_, i) => i !== index);
    setForm({ ...form, sizes: newSizes });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = { type: form.type };
    if (hasSize) {
      // gabungkan semua size:amount menjadi string "S:2,M:3"
      payload.size = form.sizes.map(s => `${s.size}:${s.amount}`).join(',');
      payload.amount = null;
    } else {
      payload.amount = form.amount;
      payload.size = null;
    }

    if (editing) {
      router.put(route('equipments.update', editing.id), payload, {
        onSuccess: () => setShowModal(false),
      });
    } else {
      router.post(route('equipments.store'), payload, {
        onSuccess: () => setShowModal(false),
      });
    }
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">APD / Work Equipment</h2>}
    >
      <div className="py-6">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl">Daftar APD</h1>
                <button
                  onClick={() => handleOpen()}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md font-medium text-white text-sm"
                >
                  + Add Equipment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                      <th className="px-4 py-2 border">#</th>
                      <th className="px-4 py-2 border">Type</th>
                      <th className="px-4 py-2 border">Size</th>
                      <th className="px-4 py-2 border">Amount</th>
                      <th className="px-4 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq, index) => (
                      <tr key={eq.id} className="text-sm text-gray-800 dark:text-gray-200">
                        <td className="px-4 py-2 border">{index + 1}</td>
                        <td className="px-4 py-2 border">{eq.type}</td>
                        <td className="px-4 py-2 border">
                          {eq.size ? eq.size.split(',').map(s => s.split(':')[0]).join(', ') : '-'}
                        </td>
                        <td className="px-4 py-2 border">
                          {eq.size ? eq.size.split(',').map(s => s.split(':')[1]).join(', ') : eq.amount}
                        </td>
                        <td className="px-4 py-2 border text-center">
                          <button
                            onClick={() => handleOpen(eq)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {equipments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-gray-500">No equipment registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasSize}
              onChange={(e) => setHasSize(e.target.checked)}
              id="hasSize"
              className="rounded"
            />
            <label htmlFor="hasSize" className="text-sm font-medium">Has Size?</label>
          </div>

          {hasSize && (
            <div className="mb-4">
              {form.sizes.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    value={item.size}
                    onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                    className="w-1/2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Size"
                    required
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleSizeChange(index, 'amount', e.target.value)}
                    className="w-1/2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Amount"
                    required
                  />
                  {form.sizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSizeField(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded-md"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSizeField}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm"
              >
                + Add Size
              </button>
            </div>
          )}

          {!hasSize && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 bg-gray-500 text-white rounded-md">
              Cancel
            </button>
            <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-md">
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthenticatedLayout>
  );
}
