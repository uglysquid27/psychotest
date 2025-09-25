import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { IKContext, IKUpload } from 'imagekitio-react';

export default function Index() {
  const { equipments } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [hasSize, setHasSize] = useState(false);
  const [form, setForm] = useState({
    type: '',
    sizes: [{ size: '', amount: '' }],
    amount: '',
    photo: '',
  });

  // open modal add/edit
  const handleOpen = (equipment = null) => {
    setEditing(equipment);
    if (equipment && equipment.size) {
      const sizesArray = equipment.size.split(',').map(s => {
        const [size, amount] = s.split(':');
        return { size, amount };
      });
      setForm({
        type: equipment.type,
        sizes: sizesArray,
        amount: '',
        photo: equipment.photo || '',
      });
      setHasSize(true);
    } else {
      setForm({
        type: equipment?.type || '',
        sizes: [{ size: '', amount: '' }],
        amount: equipment?.amount || '',
        photo: equipment?.photo || '',
      });
      setHasSize(false);
    }
    setShowModal(true);
  };

  // handle size change in form
  const handleSizeChange = (index, key, value) => {
    const newSizes = [...form.sizes];
    newSizes[index][key] = value;
    setForm({ ...form, sizes: newSizes });
  };

  const addSizeField = () =>
    setForm({ ...form, sizes: [...form.sizes, { size: '', amount: '' }] });

  const removeSizeField = (index) =>
    setForm({
      ...form,
      sizes: form.sizes.filter((_, i) => i !== index),
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = { type: form.type, photo: form.photo };
    if (hasSize) {
      payload.size = form.sizes
        .map((s) => `${s.size}:${s.amount}`)
        .join(',');
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

  // handle assign click
  const handleAssignClick = (eq) => {
    if (eq.size) {
      setSelectedEquipment(eq);
      setShowSizeModal(true);
    } else {
      router.get(route('equipments.assign.page', eq.id));
    }
  };

  const goToAssignPage = (size = null) => {
    setShowSizeModal(false);
    if (selectedEquipment) {
      router.get(route('equipments.assign.page', selectedEquipment.id), {
        size,
      });
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-xl leading-tight">
          APD / Work Equipment
        </h2>
      }
    >
      <div className="py-6">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 shadow-lg sm:rounded-lg overflow-hidden">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h1 className="font-bold text-gray-700 dark:text-gray-300 text-xl">
                  Daftar APD
                </h1>
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
                      <th className="px-4 py-2 border">Photo</th>
                      <th className="px-4 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq, index) => (
                      <tr
                        key={eq.id}
                        className="text-sm text-gray-800 dark:text-gray-200"
                      >
                        <td className="px-4 py-2 border">{index + 1}</td>
                        <td className="px-4 py-2 border">{eq.type}</td>
                        <td className="px-4 py-2 border">
                          {eq.size
                            ? eq.size
                                .split(',')
                                .map((s) => s.split(':')[0])
                                .join(', ')
                            : '-'}
                        </td>
                        <td className="px-4 py-2 border">
                          {eq.size
                            ? eq.size
                                .split(',')
                                .map((s) => s.split(':')[1])
                                .join(', ')
                            : eq.amount}
                        </td>
                        <td className="px-4 py-2 border">
                          {eq.photo ? (
                            <img
                              src={eq.photo}
                              alt="equipment"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2 border text-center space-x-2">
                          <button
                            onClick={() => handleOpen(eq)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAssignClick(eq)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md"
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                    {equipments.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-4 text-gray-500"
                        >
                          No equipment registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Equipment */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Edit Equipment' : 'Add Equipment'}
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasSize}
              onChange={(e) => setHasSize(e.target.checked)}
              id="hasSize"
              className="rounded"
            />
            <label htmlFor="hasSize" className="text-sm font-medium">
              Has Size?
            </label>
          </div>

          {hasSize ? (
            <div>
              {form.sizes.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-2 mb-2 items-center"
                >
                  <input
                    type="text"
                    value={item.size}
                    onChange={(e) =>
                      handleSizeChange(index, 'size', e.target.value)
                    }
                    placeholder="Size"
                    className="w-1/2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) =>
                      handleSizeChange(index, 'amount', e.target.value)
                    }
                    placeholder="Amount"
                    className="w-1/2 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          {/* ImageKit Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">Photo</label>
            <IKContext
              publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
              urlEndpoint="https://ik.imagekit.io/arina123"
              authenticator={async () => {
                const res = await fetch(
                  'http://localhost:8000/api/imagekit/auth'
                );
                return await res.json();
              }}
            >
              <IKUpload
                fileName={form.type ? `${form.type}.jpg` : 'upload.jpg'}
                onError={(err) => console.error('Upload Error:', err)}
                onSuccess={(res) =>
                  setForm({ ...form, photo: res.url })
                }
              />
            </IKContext>
            {form.photo && (
              <img
                src={form.photo}
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
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pilih Size sebelum Assign */}
      <Modal show={showSizeModal} onClose={() => setShowSizeModal(false)}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pilih Size</h2>
          {selectedEquipment && selectedEquipment.size ? (
            <div className="space-y-2">
              {selectedEquipment.size.split(',').map((s, idx) => {
                const [sz, amount] = s.split(':');
                return (
                  <button
                    key={idx}
                    onClick={() => goToAssignPage(sz)}
                    className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                  >
                    {sz} (Stock: {amount})
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No sizes available.</p>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowSizeModal(false)}
              className="px-3 py-2 bg-gray-500 text-white rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </AuthenticatedLayout>
  );
}
