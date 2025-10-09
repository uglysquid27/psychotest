import React, { useState, useEffect } from 'react'
import { router, usePage } from '@inertiajs/react'
import Modal from '@/Components/Modal'

export default function QuickAssign({ show, onClose, employees, equipments }) {
  const { sections, subSections } = usePage().props
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignMultiple, setAssignMultiple] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [notification, setNotification] = useState({ show: false, type: '', title: '', message: '' })

  // Reset state tiap kali modal dibuka
  useEffect(() => {
    if (show) {
      setSelectedEmployee(null)
      setSelectedEquipment(null)
      setSelectedSize('')
      setShowSizeModal(false)
      setAssignMultiple(false)
      setQuantity(1)
    }
  }, [show])

  const showNotification = (type, title, message) => {
    setNotification({ show: true, type, title, message })
  }

  const handleEmployeeSelect = employee => {
    setSelectedEmployee(employee)
  }

  const handleEquipmentSelect = equipment => {
    setSelectedEquipment(equipment)

    // Kalau ada size, buka modal pilih size — tapi jangan assign dulu
    if (equipment.size) {
      setSelectedSize('')
      setShowSizeModal(true)
    } else {
      // Kalau tidak punya size, assign langsung
      setSelectedSize(null)
      handleAssign(equipment, null)
    }
  }

  const handleSizeSelect = size => {
    if (!selectedEquipment || !selectedEmployee) return

    setSelectedSize(size)
    setShowSizeModal(false)

    // Assign setelah size benar-benar terset
    setTimeout(() => {
      handleAssign(selectedEquipment, size)
    }, 100)
  }

  const handleAssign = async (equipment = selectedEquipment, size = selectedSize) => {
    if (!selectedEmployee || !equipment) return

    // Kalau butuh size tapi belum dipilih
    if (equipment.size && !size) {
      showNotification('warning', 'Size Required', 'Please select a size for this equipment')
      setShowSizeModal(true)
      return
    }

    setIsSubmitting(true)

    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content
      if (!csrf) throw new Error('CSRF token not found')

      const totalToAssign = assignMultiple ? quantity : 1
      const body = {
        employee_id: selectedEmployee.id,
        equipment_id: equipment.id,
        size: size,
        quantity: assignMultiple ? quantity : 1,
      }

      const responses = await Promise.allSettled(
        Array.from({ length: totalToAssign }, () =>
          fetch(route('handovers.quick-assign'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrf,
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(body),
          })
        )
      )

      const successes = []
      const fails = []

      for (const r of responses) {
        if (r.status === 'fulfilled' && r.value.ok) {
          const data = await r.value.json()
          if (data.success) successes.push(data)
          else fails.push(data)
        } else {
          fails.push({ error: r.reason?.message || 'Failed' })
        }
      }

      if (successes.length) {
        const total = successes.length
        let msg = `Successfully assigned ${total} item(s) to ${selectedEmployee.name}`
        if (fails.length) msg += `, but ${fails.length} failed.`
        showNotification('success', 'Assignment Successful', msg)
        router.reload()
        onClose()
      } else {
        throw new Error(fails[0]?.error || 'Assignment failed')
      }
    } catch (err) {
      console.error('Assign error:', err)
      showNotification('error', 'Assignment Failed', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Modal show={show} onClose={onClose} maxWidth='6xl'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>New Assignment</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Select an employee and equipment to assign
            </p>
          </div>

          <div className='p-6 flex gap-6'>
            {/* Employee List */}
            <div className='w-1/2 space-y-2 overflow-y-auto max-h-[60vh]'>
              {employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedEmployee?.id === emp.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <p className='font-medium text-gray-900 dark:text-white'>{emp.name}</p>
                  <p className='text-xs text-gray-500'>NIK: {emp.nik}</p>
                </div>
              ))}
            </div>

            {/* Equipment List */}
            <div className='w-1/2 space-y-3 overflow-y-auto max-h-[60vh]'>
              {equipments.map(eq => (
                <div
                  key={eq.id}
                  onClick={() => handleEquipmentSelect(eq)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedEquipment?.id === eq.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <h4 className='font-medium text-gray-900 dark:text-white'>{eq.type}</h4>
                  {eq.size ? (
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Sizes: {eq.size.replaceAll(':', ' (') + ')'}
                    </p>
                  ) : (
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Stock: {eq.amount ?? 0} available
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className='flex justify-end border-t border-gray-200 dark:border-gray-700 p-4'>
            <button
              onClick={onClose}
              className='px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Size Picker Modal */}
      <Modal show={showSizeModal} onClose={() => setShowSizeModal(false)} maxWidth='sm'>
        <div className='bg-white dark:bg-gray-800 p-6 rounded-lg'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
            Select Size for {selectedEquipment?.type}
          </h3>

          <div className='space-y-2'>
            {selectedEquipment?.size
              ?.split(',')
              .filter(s => s.includes(':'))
              .map((item, i) => {
                const [size, qty] = item.split(':')
                const stock = parseInt(qty) || 0
                return (
                  <button
                    key={i}
                    disabled={stock <= 0 || isSubmitting}
                    onClick={() => handleSizeSelect(size)}
                    className={`w-full text-left p-3 border rounded-lg flex justify-between items-center transition ${
                      stock > 0
                        ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-gray-200 dark:border-gray-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <span className='font-medium'>{size}</span>
                    <span className='text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded'>
                      {stock} available
                    </span>
                  </button>
                )
              })}
          </div>

          <div className='flex justify-end gap-2 mt-6'>
            <button
              onClick={() => setShowSizeModal(false)}
              disabled={isSubmitting}
              className='px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification */}
      {notification.show && (
        <Modal show={notification.show} onClose={() => setNotification({ show: false })} maxWidth='md'>
          <div className='p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'>
            <h3 className='font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>{notification.title}</h3>
            <p className='text-yellow-700 dark:text-yellow-300'>{notification.message}</p>
            <div className='mt-4 text-right'>
              <button
                onClick={() => setNotification({ show: false })}
                className='px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg'
              >
                OK
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
