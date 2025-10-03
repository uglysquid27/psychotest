import React, { useState, useEffect } from 'react'
import { usePage, router, Link } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import Modal from '@/Components/Modal'

// Notification Modal Component
function NotificationModal ({ show, type, title, message, onClose }) {
    if (!show) return null

    const icons = {
        success: (
            <div className='flex justify-center items-center bg-green-100 dark:bg-green-900/20 rounded-full w-12 h-12'>
                <svg
                    className='w-6 h-6 text-green-600 dark:text-green-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                    />
                </svg>
            </div>
        ),
        error: (
            <div className='flex justify-center items-center bg-red-100 dark:bg-red-900/20 rounded-full w-12 h-12'>
                <svg
                    className='w-6 h-6 text-red-600 dark:text-red-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                    />
                </svg>
            </div>
        ),
        warning: (
            <div className='flex justify-center items-center bg-yellow-100 dark:bg-yellow-900/20 rounded-full w-12 h-12'>
                <svg
                    className='w-6 h-6 text-yellow-600 dark:text-yellow-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                    />
                </svg>
            </div>
        ),
        info: (
            <div className='flex justify-center items-center bg-blue-100 dark:bg-blue-900/20 rounded-full w-12 h-12'>
                <svg
                    className='w-6 h-6 text-blue-600 dark:text-blue-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                </svg>
            </div>
        )
    }

    const bgColors = {
        success:
            'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
        error: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        warning:
            'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
        info: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth='md'>
            <div className={`p-6 rounded-lg border ${bgColors[type]}`}>
                <div className='flex items-start gap-4'>
                    {icons[type]}
                    <div className='flex-1'>
                        <h3 className='mb-2 font-semibold text-gray-900 dark:text-white text-lg'>
                            {title}
                        </h3>
                        <p className='text-gray-600 dark:text-gray-300 whitespace-pre-line'>
                            {message}
                        </p>
                        <div className='flex justify-end mt-4'>
                            <button
                                onClick={onClose}
                                className='bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium text-white transition-colors'
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

// Quick Assign Component
function QuickAssign ({ employee, show, onClose, equipments }) {
    const [selectedEquipment, setSelectedEquipment] = useState(null)
    const [selectedSize, setSelectedSize] = useState('')
    const [showSizeModal, setShowSizeModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [assignMultiple, setAssignMultiple] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [notification, setNotification] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    })
    const [employeeEquipmentCounts, setEmployeeEquipmentCounts] = useState({})

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message })
    }

    // Reset state ketika modal dibuka/tutup
    useEffect(() => {
        if (show) {
            setSelectedEquipment(null)
            setSelectedSize('')
            setShowSizeModal(false)
            setAssignMultiple(false)
            setQuantity(1)
        }
    }, [show])

    useEffect(() => {
        loadEmployeeEquipmentCounts()
    }, [])

    const loadEmployeeEquipmentCounts = async () => {
        try {
            const response = await fetch(
                route('handovers.employee.equipment-counts')
            )
            const data = await response.json()

            if (data.success) {
                setEmployeeEquipmentCounts(data.counts)
            } else {
                console.error(
                    'Failed to load employee equipment counts:',
                    data.message
                )
            }
        } catch (error) {
            console.error('Error loading employee equipment counts:', error)
        }
    }

    const handleSizeSelect = size => {
        console.log('Size selected:', size)
        setSelectedSize(size)
        setShowSizeModal(false)
        handleAssign()
    }

    const handleEquipmentSelect = equipment => {
        console.log(
            'Equipment selected:',
            equipment.type,
            'Has size:',
            !!equipment.size
        )
        setSelectedEquipment(equipment)

        if (equipment.size) {
            setShowSizeModal(true)
        } else {
            setSelectedSize(null)
            handleAssign()
        }
    }

    const handleAssign = async () => {
        if (!selectedEquipment || !employee) return

        console.log('Debug - Assignment data:', {
            employee_id: employee.id,
            equipment_id: selectedEquipment.id,
            size: selectedSize,
            quantity: assignMultiple ? quantity : 1,
            equipmentHasSize: !!selectedEquipment.size,
            selectedSize: selectedSize
        })

        if (selectedEquipment.size && !selectedSize) {
            showNotification(
                'warning',
                'Size Required',
                'Please select a size for this equipment'
            )
            setShowSizeModal(true)
            return
        }

        setIsSubmitting(true)

        try {
            const assignments = []
            const totalToAssign = assignMultiple ? quantity : 1

            for (let i = 0; i < totalToAssign; i++) {
                assignments.push(
                    fetch(route('handovers.quick-assign'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector(
                                'meta[name="csrf-token"]'
                            ).content,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            employee_id: employee.id,
                            equipment_id: selectedEquipment.id,
                            size: selectedSize,
                            quantity: assignMultiple ? quantity : 1
                        })
                    })
                )
            }

            const results = await Promise.allSettled(assignments)

            const successful = []
            const failed = []

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.ok) {
                    const data = await result.value.json()
                    if (data.success) {
                        successful.push(data)
                    } else {
                        failed.push({
                            error: data.message || 'Assignment failed',
                            response: data
                        })
                    }
                } else if (result.status === 'fulfilled' && !result.value.ok) {
                    try {
                        const errorData = await result.value.json()
                        failed.push({
                            error:
                                errorData.message ||
                                `HTTP ${result.value.status}`,
                            response: errorData
                        })
                    } catch (e) {
                        const errorText = await result.value.text()
                        failed.push({
                            error: `HTTP ${result.value.status}: ${errorText}`
                        })
                    }
                } else {
                    failed.push({
                        error: result.reason?.message || 'Request failed'
                    })
                }
            }

            if (successful.length > 0) {
                const totalAssigned = successful.reduce(
                    (sum, res) => sum + (res.handovers?.length || 1),
                    0
                )
                let message = `Successfully assigned ${totalAssigned} item(s) to ${employee.name}`

                if (failed.length > 0) {
                    message += `, but ${failed.length} failed: ${failed[0].error}`
                }

                showNotification('success', 'Assignment Successful', message)
                onClose()
                router.reload()
            } else {
                const firstError = failed[0]?.error || 'All assignments failed'
                const errorDetails = failed[0]?.response
                    ? ` (Details: ${JSON.stringify(failed[0].response)})`
                    : ''
                throw new Error(firstError + errorDetails)
            }
        } catch (error) {
            console.error('Assignment error:', error)
            showNotification(
                'error',
                'Assignment Failed',
                'Assignment failed: ' + error.message
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            {/* Main Assign Modal */}
            <Modal show={show} onClose={onClose} maxWidth='4xl'>
                <div className='bg-white dark:bg-gray-800 shadow-xl rounded-lg'>
                    <div className='p-6 border-gray-200 dark:border-gray-700 border-b'>
                        <h2 className='font-semibold text-gray-900 dark:text-white text-xl'>
                            Quick Assign to {employee?.name}
                        </h2>
                        <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            NIK: {employee?.nik}
                        </p>
                    </div>

                    <div className='p-6'>
                        {/* Multiple Assignment Toggle */}
                        <div className='flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 mb-6 p-4 rounded-lg'>
                            <label className='flex items-center cursor-pointer'>
                                <div className='relative'>
                                    <input
                                        type='checkbox'
                                        checked={assignMultiple}
                                        onChange={e =>
                                            setAssignMultiple(e.target.checked)
                                        }
                                        className='sr-only'
                                    />
                                    <div
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            assignMultiple
                                                ? 'bg-blue-600'
                                                : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    ></div>
                                    <div
                                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            assignMultiple
                                                ? 'transform translate-x-6'
                                                : ''
                                        }`}
                                    ></div>
                                </div>
                            </label>
                            <span className='font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                Assign multiple items
                            </span>

                            {assignMultiple && (
                                <div className='flex items-center gap-2 ml-4'>
                                    <label className='text-gray-600 dark:text-gray-400 text-sm'>
                                        Quantity:
                                    </label>
                                    <input
                                        type='number'
                                        min='1'
                                        max='10'
                                        value={quantity}
                                        onChange={e =>
                                            setQuantity(
                                                parseInt(e.target.value) || 1
                                            )
                                        }
                                        className='dark:bg-gray-700 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-20 dark:text-white text-sm'
                                    />
                                </div>
                            )}
                        </div>

                        {/* Equipment Grid */}
                        <div className='gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto'>
                            {equipments?.map(equipment => (
                                <div
                                    key={equipment.id}
                                    className='bg-gray-50 hover:bg-blue-50 dark:bg-gray-700/50 dark:hover:bg-blue-900/20 p-4 border border-gray-200 dark:border-gray-600 hover:border-blue-500 rounded-lg transition-all cursor-pointer'
                                    onClick={() =>
                                        handleEquipmentSelect(equipment)
                                    }
                                >
                                    <div className='flex justify-between items-start mb-3'>
                                        <div>
                                            <h3 className='font-medium text-gray-900 dark:text-white'>
                                                {equipment.type}
                                            </h3>
                                            {equipment.photo && (
                                                <img
                                                    src={equipment.photo}
                                                    alt={equipment.type}
                                                    className='mt-2 border border-gray-200 dark:border-gray-600 rounded-lg w-16 h-16 object-cover'
                                                />
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                equipment.size ||
                                                equipment.amount > 0
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}
                                        >
                                            {equipment.size
                                                ? 'Multiple Sizes'
                                                : `${equipment.amount} available`}
                                        </span>
                                    </div>

                                    {/* Stock Information */}
                                    <div className='space-y-2 text-gray-600 dark:text-gray-400 text-sm'>
                                        {equipment.size ? (
                                            <div>
                                                <div className='mb-1 font-medium'>
                                                    Available Sizes:
                                                </div>
                                                <div className='space-y-1'>
                                                    {equipment.size
                                                        .split(',')
                                                        .map(
                                                            (sizeItem, idx) => {
                                                                if (
                                                                    !sizeItem ||
                                                                    !sizeItem.includes(
                                                                        ':'
                                                                    )
                                                                )
                                                                    return null
                                                                const [
                                                                    sizeName,
                                                                    amount
                                                                ] =
                                                                    sizeItem.split(
                                                                        ':'
                                                                    )
                                                                const stock =
                                                                    parseInt(
                                                                        amount
                                                                    ) || 0
                                                                return (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className='flex justify-between items-center'
                                                                    >
                                                                        <span>
                                                                            Size{' '}
                                                                            {
                                                                                sizeName
                                                                            }
                                                                        </span>
                                                                        <span
                                                                            className={`px-2 py-1 rounded text-xs ${
                                                                                stock >
                                                                                0
                                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                            }`}
                                                                        >
                                                                            {
                                                                                stock
                                                                            }{' '}
                                                                            available
                                                                        </span>
                                                                    </div>
                                                                )
                                                            }
                                                        )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='flex justify-between items-center'>
                                                <span>Stock:</span>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${
                                                        equipment.amount > 0
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}
                                                >
                                                    {equipment.amount} available
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(!equipments || equipments.length === 0) && (
                            <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                                <svg
                                    className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={1}
                                        d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                                    />
                                </svg>
                                <p>No equipment available</p>
                            </div>
                        )}
                    </div>

                    <div className='flex justify-end gap-3 p-6 border-gray-200 dark:border-gray-700 border-t'>
                        <button
                            onClick={onClose}
                            className='px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Size Selection Modal */}
            <Modal
                show={showSizeModal}
                onClose={() => setShowSizeModal(false)}
                maxWidth='sm'
            >
                <div className='bg-white dark:bg-gray-800 shadow-xl p-6 rounded-lg'>
                    <h3 className='mb-4 font-semibold text-gray-900 dark:text-white text-lg'>
                        Select Size for {selectedEquipment?.type}
                    </h3>

                    <div className='space-y-3'>
                        {selectedEquipment?.size
                            ?.split(',')
                            .map((sizeItem, index) => {
                                if (!sizeItem || !sizeItem.includes(':'))
                                    return null

                                const [sizeName, amount] = sizeItem.split(':')
                                const stock = parseInt(amount) || 0

                                return (
                                    <button
                                        key={index}
                                        onClick={() =>
                                            handleSizeSelect(sizeName)
                                        }
                                        disabled={stock <= 0}
                                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                                            stock > 0
                                                ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className='flex justify-between items-center'>
                                            <span className='font-medium text-gray-900 dark:text-white'>
                                                {sizeName}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    stock > 0
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}
                                            >
                                                {stock > 0
                                                    ? `${stock} available`
                                                    : 'Out of stock'}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                    </div>

                    <div className='flex justify-end gap-3 mt-6 pt-4 border-gray-200 dark:border-gray-700 border-t'>
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className='px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: '',
                        title: '',
                        message: ''
                    })
                }
            />
        </>
    )
}

// Update Employee Handovers Modal
function UpdateEmployeeModal ({ employee, show, onClose, equipments }) {
    const [handovers, setHandovers] = useState([])
    const [originalHandovers, setOriginalHandovers] = useState([])
    const [photo, setPhoto] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState('')
    const [availableSizes, setAvailableSizes] = useState({})
    const [notification, setNotification] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    })

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message })
    }

    useEffect(() => {
        if (show && employee) {
            loadEmployeeHandovers()
        }
    }, [show, employee])

    const loadEmployeeHandovers = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(
                route('handovers.employee.handovers', { employee: employee.id })
            )
            const data = await response.json()

            if (data.success) {
                setHandovers(data.handovers)
                setOriginalHandovers(JSON.parse(JSON.stringify(data.handovers)))
                if (data.handovers.length > 0) {
                    setSelectedDate(data.handovers[0].date.split('T')[0])
                    setPhoto(data.handovers[0].photo || '')
                }

                loadAvailableSizes(data.handovers)
            } else {
                throw new Error(data.message || 'Failed to load handovers')
            }
        } catch (error) {
            console.error('Error loading handovers:', error)
            showNotification(
                'error',
                'Load Failed',
                'Failed to load handovers: ' + error.message
            )
        } finally {
            setIsLoading(false)
        }
    }

    const loadAvailableSizes = handoversData => {
        const sizes = {}

        handoversData.forEach(handover => {
            const equipment = handover.equipment
            if (equipment.size) {
                const sizeData = {}
                equipment.size.split(',').forEach(sizeItem => {
                    if (sizeItem && sizeItem.includes(':')) {
                        const [sizeName, amount] = sizeItem.split(':')
                        const stock = parseInt(amount) || 0
                        sizeData[sizeName] = stock
                    }
                })
                sizes[equipment.id] = sizeData
            }
        })

        setAvailableSizes(sizes)
    }

    const handleSizeChange = (handoverId, newSize) => {
        setHandovers(prev =>
            prev.map(handover =>
                handover.id === handoverId
                    ? { ...handover, size: newSize }
                    : handover
            )
        )
    }

    const handleFileSelect = async e => {
        const file = e.target.files[0]
        if (!file) return

        try {
            setUploadStatus('Uploading...')

            const validTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/bmp'
            ]
            if (!validTypes.includes(file.type)) {
                throw new Error('Please select a valid image file')
            }

            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size must be less than 10MB')
            }

            const authResponse = await fetch('/api/imagekit/auth')

            if (!authResponse.ok) {
                throw new Error('ImageKit authentication failed')
            }

            const authData = await authResponse.json()

            const fileName = `handover_update_${
                employee.id
            }_${Date.now()}.${file.name.split('.').pop()}`

            const formData = new FormData()
            formData.append('file', file)
            formData.append('fileName', fileName)
            formData.append('folder', '/handovers')
            formData.append('useUniqueFileName', 'true')
            formData.append(
                'publicKey',
                import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
            )
            formData.append('signature', authData.signature)
            formData.append('token', authData.token)
            formData.append('expire', authData.expire)

            const uploadResponse = await fetch(
                'https://upload.imagekit.io/api/v1/files/upload',
                {
                    method: 'POST',
                    body: formData
                }
            )

            const uploadResult = await uploadResponse.json()

            if (uploadResponse.ok && uploadResult.url) {
                setPhoto(uploadResult.url)
                setUploadStatus('success')
                showNotification(
                    'success',
                    'Upload Successful',
                    'Photo uploaded successfully'
                )
            } else {
                throw new Error(uploadResult.message || 'Upload failed')
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadStatus('error')
            showNotification(
                'error',
                'Upload Failed',
                'Upload failed: ' + error.message
            )
            e.target.value = ''
        }
    }

    const handleSubmit = async e => {
        e.preventDefault()

        if (!selectedDate) {
            showNotification('warning', 'Date Required', 'Please select date')
            return
        }

        if (handovers.length === 0) {
            showNotification(
                'warning',
                'No Handovers',
                'No handovers to update'
            )
            return
        }

        setIsSubmitting(true)

        try {
            const updateData = {
                date: selectedDate,
                photo_url: photo,
                handovers: handovers.map(handover => {
                    const originalHandover = originalHandovers.find(
                        oh => oh.id === handover.id
                    )
                    return {
                        id: handover.id,
                        size: handover.size,
                        original_size: originalHandover?.size,
                        equipment_id: handover.equipment.id
                    }
                })
            }

            console.log('Update data dengan stock management:', updateData)

            const response = await fetch(
                route('handovers.employee.update', { employee: employee.id }),
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector(
                            'meta[name="csrf-token"]'
                        ).content,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(updateData)
                }
            )

            const data = await response.json()

            if (data.success) {
                let message = data.message

                if (data.stock_changes) {
                    message += '\n\nStock changes:'
                    data.stock_changes.forEach(change => {
                        if (change.type === 'returned') {
                            message += `\n✅ Returned 1 ${change.equipment_type} (Size: ${change.old_size}) to stock`
                        } else if (change.type === 'assigned') {
                            message += `\n📦 Assigned 1 ${change.equipment_type} (Size: ${change.new_size}) from stock`
                        }
                    })
                }

                showNotification('success', 'Update Successful', message)
                onClose()
                router.reload()
            } else {
                throw new Error(data.message || 'Update failed')
            }
        } catch (error) {
            console.error('Update error:', error)
            showNotification(
                'error',
                'Update Failed',
                'Update failed: ' + error.message
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const getAvailableSizes = equipment => {
        if (!equipment.size) return []

        const sizes = []
        equipment.size.split(',').forEach(sizeItem => {
            if (sizeItem && sizeItem.includes(':')) {
                const [sizeName, amount] = sizeItem.split(':')
                const stock = parseInt(amount) || 0
                sizes.push({
                    name: sizeName,
                    stock: stock
                })
            }
        })

        return sizes
    }

    const isSizeAvailable = (
        equipmentId,
        sizeName,
        currentHandoverId = null
    ) => {
        if (!availableSizes[equipmentId]) return false

        const stock = availableSizes[equipmentId][sizeName] || 0

        if (currentHandoverId) {
            const currentHandover = handovers.find(
                h => h.id === currentHandoverId
            )
            if (currentHandover && currentHandover.size === sizeName) {
                return true
            }
        }

        return stock > 0
    }

    const getSizeStock = (equipmentId, sizeName, currentHandoverId = null) => {
        if (!availableSizes[equipmentId]) return 0

        const stock = availableSizes[equipmentId][sizeName] || 0

        if (currentHandoverId) {
            const currentHandover = handovers.find(
                h => h.id === currentHandoverId
            )
            if (currentHandover && currentHandover.size === sizeName) {
                return stock + 1
            }
        }

        return stock
    }

    const hasStockAffectingChanges = () => {
        return handovers.some(handover => {
            const original = originalHandovers.find(oh => oh.id === handover.id)
            return original && original.size !== handover.size
        })
    }

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth='4xl'>
                <div className='bg-white dark:bg-gray-800 shadow-xl rounded-lg'>
                    <div className='p-6 border-gray-200 dark:border-gray-700 border-b'>
                        <h2 className='font-semibold text-gray-900 dark:text-white text-xl'>
                            Update Assignments for {employee?.name}
                        </h2>
                        <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            NIK: {employee?.nik} | Update date and sizes for all
                            equipment
                        </p>

                        {hasStockAffectingChanges() && (
                            <div className='bg-yellow-50 dark:bg-yellow-900/20 mt-3 p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
                                <div className='flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm'>
                                    <svg
                                        className='w-4 h-4'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                        />
                                    </svg>
                                    <span>
                                        <strong>Stock Notice:</strong> Changing
                                        sizes will automatically return the
                                        previous size to stock and assign the
                                        new size from available stock.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className='space-y-6 p-6'>
                            {/* Date Selection */}
                            <div>
                                <label className='block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                    Assignment Date *
                                </label>
                                <input
                                    type='date'
                                    value={selectedDate}
                                    onChange={e =>
                                        setSelectedDate(e.target.value)
                                    }
                                    className='dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white transition-colors'
                                    required
                                />
                            </div>

                            {/* Photo Upload Section */}
                            <div>
                                <label className='block mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                    Handover Photo (Optional)
                                </label>

                                {photo ? (
                                    <div className='flex flex-col items-center space-y-4'>
                                        <img
                                            src={photo}
                                            alt='Current handover'
                                            className='shadow-md border-2 border-green-200 dark:border-green-800 rounded-lg w-48 h-48 object-cover'
                                        />
                                        <div className='flex gap-2'>
                                            <label className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors cursor-pointer'>
                                                <svg
                                                    className='w-4 h-4'
                                                    fill='none'
                                                    stroke='currentColor'
                                                    viewBox='0 0 24 24'
                                                >
                                                    <path
                                                        strokeLinecap='round'
                                                        strokeLinejoin='round'
                                                        strokeWidth={2}
                                                        d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
                                                    />
                                                </svg>
                                                Change Photo
                                                <input
                                                    type='file'
                                                    accept='image/*'
                                                    onChange={handleFileSelect}
                                                    className='hidden'
                                                />
                                            </label>
                                            <button
                                                type='button'
                                                onClick={() => setPhoto('')}
                                                className='bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 transition-colors'
                                            >
                                                Remove Photo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='p-8 border-2 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 border-dashed rounded-lg text-center transition-colors'>
                                        <svg
                                            className='mx-auto mb-4 w-12 h-12 text-gray-400'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={1}
                                                d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                                            />
                                        </svg>
                                        <p className='mb-4 text-gray-500 dark:text-gray-400'>
                                            No photo uploaded yet
                                        </p>
                                        <label className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors cursor-pointer'>
                                            <svg
                                                className='w-4 h-4'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
                                                />
                                            </svg>
                                            Upload Photo
                                            <input
                                                type='file'
                                                accept='image/*'
                                                onChange={handleFileSelect}
                                                className='hidden'
                                            />
                                        </label>
                                    </div>
                                )}

                                {uploadStatus && (
                                    <div
                                        className={`mt-3 text-sm font-medium ${
                                            uploadStatus === 'success'
                                                ? 'text-green-600 dark:text-green-400'
                                                : uploadStatus === 'error'
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-blue-600 dark:text-blue-400'
                                        }`}
                                    >
                                        {uploadStatus}
                                    </div>
                                )}
                            </div>

                            {/* Equipment List with Size Selection */}
                            <div>
                                <label className='block mb-3 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                    Equipment Assignments ({handovers.length}{' '}
                                    items)
                                </label>

                                {isLoading ? (
                                    <div className='py-8 text-center'>
                                        <div className='inline-flex items-center gap-2 text-blue-600 dark:text-blue-400'>
                                            <svg
                                                className='w-5 h-5 animate-spin'
                                                fill='none'
                                                viewBox='0 0 24 24'
                                            >
                                                <circle
                                                    className='opacity-25'
                                                    cx='12'
                                                    cy='12'
                                                    r='10'
                                                    stroke='currentColor'
                                                    strokeWidth='4'
                                                ></circle>
                                                <path
                                                    className='opacity-75'
                                                    fill='currentColor'
                                                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                                ></path>
                                            </svg>
                                            Loading handovers...
                                        </div>
                                    </div>
                                ) : handovers.length === 0 ? (
                                    <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                                        <svg
                                            className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={1}
                                                d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                                            />
                                        </svg>
                                        <p>
                                            No equipment assigned to this
                                            employee
                                        </p>
                                    </div>
                                ) : (
                                    <div className='space-y-4 max-h-96 overflow-y-auto'>
                                        {handovers.map(handover => {
                                            const equipment = handover.equipment
                                            const sizes =
                                                getAvailableSizes(equipment)
                                            const hasSizes = sizes.length > 0

                                            return (
                                                <div
                                                    key={handover.id}
                                                    className='bg-gray-50 dark:bg-gray-700/50 p-4 border border-gray-200 dark:border-gray-600 rounded-lg'
                                                >
                                                    <div className='flex justify-between items-start mb-3'>
                                                        <div className='flex items-start gap-3'>
                                                            {equipment.photo && (
                                                                <img
                                                                    src={
                                                                        equipment.photo
                                                                    }
                                                                    alt={
                                                                        equipment.type
                                                                    }
                                                                    className='border border-gray-200 dark:border-gray-600 rounded-lg w-12 h-12 object-cover'
                                                                />
                                                            )}
                                                            <div>
                                                                <h3 className='font-medium text-gray-900 dark:text-white'>
                                                                    {
                                                                        equipment.type
                                                                    }
                                                                </h3>
                                                                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                                                                    Serial:{' '}
                                                                    {handover.serial_number ||
                                                                        'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className='bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full font-medium text-blue-800 dark:text-blue-300 text-xs'>
                                                            Assigned
                                                        </span>
                                                    </div>

                                                    {hasSizes ? (
                                                        <div>
                                                            <label className='block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                                                Select Size *
                                                            </label>
                                                            <div className='gap-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                                                                {sizes.map(
                                                                    (
                                                                        size,
                                                                        idx
                                                                    ) => {
                                                                        const isAvailable =
                                                                            isSizeAvailable(
                                                                                equipment.id,
                                                                                size.name,
                                                                                handover.id
                                                                            )
                                                                        const stock =
                                                                            getSizeStock(
                                                                                equipment.id,
                                                                                size.name,
                                                                                handover.id
                                                                            )

                                                                        return (
                                                                            <label
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className={`relative flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                                                                                    handover.size ===
                                                                                    size.name
                                                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                                                                                        : isAvailable
                                                                                        ? 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                                                                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type='radio'
                                                                                    name={`size-${handover.id}`}
                                                                                    value={
                                                                                        size.name
                                                                                    }
                                                                                    checked={
                                                                                        handover.size ===
                                                                                        size.name
                                                                                    }
                                                                                    onChange={e =>
                                                                                        handleSizeChange(
                                                                                            handover.id,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        !isAvailable
                                                                                    }
                                                                                    className='sr-only'
                                                                                />
                                                                                <span className='font-medium text-gray-900 dark:text-white'>
                                                                                    {
                                                                                        size.name
                                                                                    }
                                                                                </span>
                                                                                <span
                                                                                    className={`text-xs mt-1 px-2 py-1 rounded-full ${
                                                                                        isAvailable
                                                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                                    }`}
                                                                                >
                                                                                    {isAvailable
                                                                                        ? `${stock} available`
                                                                                        : 'Out of stock'}
                                                                                </span>
                                                                            </label>
                                                                        )
                                                                    }
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className='text-gray-600 dark:text-gray-400 text-sm'>
                                                            No size variations
                                                            available for this
                                                            equipment
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='flex justify-end gap-3 p-6 border-gray-200 dark:border-gray-700 border-t'>
                            <button
                                type='button'
                                onClick={onClose}
                                className='px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                            >
                                Cancel
                            </button>
                            <button
                                type='submit'
                                disabled={isSubmitting || !selectedDate}
                                className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-6 py-2 rounded-lg font-medium text-white transition-colors'
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg
                                            className='w-4 h-4 animate-spin'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                        >
                                            <circle
                                                className='opacity-25'
                                                cx='12'
                                                cy='12'
                                                r='10'
                                                stroke='currentColor'
                                                strokeWidth='4'
                                            ></circle>
                                            <path
                                                className='opacity-75'
                                                fill='currentColor'
                                                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                            ></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    'Update Assignments'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: '',
                        title: '',
                        message: ''
                    })
                }
            />
        </>
    )
}

// New Assign Modal Component with Section/Subsection Filters and Pagination
function NewAssignModal ({ show, onClose, employees, equipments }) {
    const { sections, subSections } = usePage().props
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [selectedEquipment, setSelectedEquipment] = useState(null)
    const [selectedSize, setSelectedSize] = useState('')
    const [showSizeModal, setShowSizeModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [assignMultiple, setAssignMultiple] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [notification, setNotification] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    })
    const [employeeEquipmentCounts, setEmployeeEquipmentCounts] = useState({})

    // Filter states
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSection, setSelectedSection] = useState('')
    const [selectedSubSection, setSelectedSubSection] = useState('')
    const [filteredSubSections, setFilteredSubSections] = useState([])

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message })
    }

    // Load employee equipment counts
    useEffect(() => {
        if (show) {
            loadEmployeeEquipmentCounts()
        }
    }, [show])

    const loadEmployeeEquipmentCounts = async () => {
        try {
            const response = await fetch(
                route('handovers.employee.equipment-counts')
            )
            const data = await response.json()

            if (data.success) {
                setEmployeeEquipmentCounts(data.counts)
            } else {
                console.error(
                    'Failed to load employee equipment counts:',
                    data.message
                )
            }
        } catch (error) {
            console.error('Error loading employee equipment counts:', error)
        }
    }

    // Reset state ketika modal dibuka/tutup
    useEffect(() => {
        if (show) {
            setSelectedEmployee(null)
            setSelectedEquipment(null)
            setSelectedSize('')
            setShowSizeModal(false)
            setAssignMultiple(false)
            setQuantity(1)
            setSearchTerm('')
            setSelectedSection('')
            setSelectedSubSection('')
            setCurrentPage(1)
        }
    }, [show])

    // Filter subsections based on selected section
    useEffect(() => {
        if (selectedSection) {
            const filtered = subSections.filter(
                sub => sub.section_id == selectedSection
            )
            setFilteredSubSections(filtered)
            if (
                selectedSubSection &&
                !filtered.some(sub => sub.id == selectedSubSection)
            ) {
                setSelectedSubSection('')
            }
        } else {
            setFilteredSubSections([])
            setSelectedSubSection('')
        }
    }, [selectedSection, selectedSubSection, subSections])

    // Use all employees instead of just unassigned ones
    const availableEmployees = employees || []

    // Filter employees based on search and filters
    const filteredEmployees =
        availableEmployees?.filter(employee => {
            const matchesSearch =
                !searchTerm ||
                employee.name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                employee.nik.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesSection =
                !selectedSection ||
                employee.sub_sections?.some(
                    sub => sub.section_id == selectedSection
                )

            const matchesSubSection =
                !selectedSubSection ||
                employee.sub_sections?.some(sub => sub.id == selectedSubSection)

            return matchesSearch && matchesSection && matchesSubSection
        }) || []

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedEmployees = filteredEmployees.slice(
        startIndex,
        startIndex + itemsPerPage
    )

    // Equipment count functions
    const getEmployeeEquipmentCount = (employeeId, equipmentType) => {
        if (!employeeEquipmentCounts[employeeId]) return 0

        const equipmentCount = employeeEquipmentCounts[employeeId].find(
            item => item.equipment_type === equipmentType
        )

        return equipmentCount ? equipmentCount.total_count : 0
    }

    const getTotalEmployeeEquipmentCount = employeeId => {
        if (!employeeEquipmentCounts[employeeId]) return 0

        return employeeEquipmentCounts[employeeId].reduce((total, item) => {
            return total + item.total_count
        }, 0)
    }

    const getEmployeeSectionInfo = employee => {
        if (!employee.sub_sections || employee.sub_sections.length === 0) {
            return 'No section'
        }

        const subSection = employee.sub_sections[0]
        return `${subSection.section?.name || 'No section'}${
            subSection.name ? ` / ${subSection.name}` : ''
        }`
    }

    const handleEmployeeSelect = employee => {
        setSelectedEmployee(employee)
        // Auto-open equipment selection
        setTimeout(() => {
            const equipmentSection = document.getElementById(
                'equipment-selection'
            )
            if (equipmentSection) {
                equipmentSection.scrollIntoView({ behavior: 'smooth' })
            }
        }, 100)
    }

    const handleEquipmentSelect = equipment => {
        setSelectedEquipment(equipment)

        if (equipment.size) {
            setShowSizeModal(true)
        } else {
            setSelectedSize(null)
            handleAssign()
        }
    }

    const handleSizeSelect = size => {
        setSelectedSize(size)
        setShowSizeModal(false)
        handleAssign()
    }

    const handleAssign = async () => {
        if (!selectedEmployee || !selectedEquipment) return

        if (selectedEquipment.size && !selectedSize) {
            showNotification(
                'warning',
                'Size Required',
                'Please select a size for this equipment'
            )
            setShowSizeModal(true)
            return
        }

        setIsSubmitting(true)

        try {
            const assignments = []
            const totalToAssign = assignMultiple ? quantity : 1

            for (let i = 0; i < totalToAssign; i++) {
                assignments.push(
                    fetch(route('handovers.quick-assign'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector(
                                'meta[name="csrf-token"]'
                            ).content,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            employee_id: selectedEmployee.id,
                            equipment_id: selectedEquipment.id,
                            size: selectedSize,
                            quantity: assignMultiple ? quantity : 1
                        })
                    })
                )
            }

            const results = await Promise.allSettled(assignments)

            const successful = []
            const failed = []

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.ok) {
                    const data = await result.value.json()
                    if (data.success) {
                        successful.push(data)
                    } else {
                        failed.push({
                            error: data.message || 'Assignment failed',
                            response: data
                        })
                    }
                } else if (result.status === 'fulfilled' && !result.value.ok) {
                    try {
                        const errorData = await result.value.json()
                        failed.push({
                            error:
                                errorData.message ||
                                `HTTP ${result.value.status}`,
                            response: errorData
                        })
                    } catch (e) {
                        const errorText = await result.value.text()
                        failed.push({
                            error: `HTTP ${result.value.status}: ${errorText}`
                        })
                    }
                } else {
                    failed.push({
                        error: result.reason?.message || 'Request failed'
                    })
                }
            }

            if (successful.length > 0) {
                const totalAssigned = successful.reduce(
                    (sum, res) => sum + (res.handovers?.length || 1),
                    0
                )
                let message = `Successfully assigned ${totalAssigned} item(s) to ${selectedEmployee.name}`

                if (failed.length > 0) {
                    message += `, but ${failed.length} failed: ${failed[0].error}`
                }

                showNotification('success', 'Assignment Successful', message)
                onClose()
                router.reload()
            } else {
                const firstError = failed[0]?.error || 'All assignments failed'
                const errorDetails = failed[0]?.response
                    ? ` (Details: ${JSON.stringify(failed[0].response)})`
                    : ''
                throw new Error(firstError + errorDetails)
            }
        } catch (error) {
            console.error('Assignment error:', error)
            showNotification(
                'error',
                'Assignment Failed',
                'Assignment failed: ' + error.message
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const clearFilters = () => {
        setSearchTerm('')
        setSelectedSection('')
        setSelectedSubSection('')
        setCurrentPage(1)
    }

    const goToPage = page => {
        setCurrentPage(page)
    }

    return (
        <>
            {/* Main Assign Modal */}
            <Modal show={show} onClose={onClose} maxWidth='7xl'>
                <div className='flex flex-col bg-white dark:bg-gray-800 shadow-xl rounded-lg h-[90vh]'>
                    <div className='p-6 border-gray-200 dark:border-gray-700 border-b'>
                        <h2 className='font-semibold text-gray-900 dark:text-white text-xl'>
                            New Assignment
                        </h2>
                        <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            Select employee and equipment to assign
                        </p>
                    </div>

                    <div className='flex-1 overflow-hidden'>
                        <div className='flex flex-col p-6 h-full'>
                            {/* Multiple Assignment Toggle */}
                            <div className='flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 mb-6 p-4 rounded-lg'>
                                <label className='flex items-center cursor-pointer'>
                                    <div className='relative'>
                                        <input
                                            type='checkbox'
                                            checked={assignMultiple}
                                            onChange={e =>
                                                setAssignMultiple(
                                                    e.target.checked
                                                )
                                            }
                                            className='sr-only'
                                        />
                                        <div
                                            className={`w-12 h-6 rounded-full transition-colors ${
                                                assignMultiple
                                                    ? 'bg-blue-600'
                                                    : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                        ></div>
                                        <div
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                assignMultiple
                                                    ? 'transform translate-x-6'
                                                    : ''
                                            }`}
                                        ></div>
                                    </div>
                                </label>
                                <span className='font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                    Assign multiple items
                                </span>

                                {assignMultiple && (
                                    <div className='flex items-center gap-2 ml-4'>
                                        <label className='text-gray-600 dark:text-gray-400 text-sm'>
                                            Quantity:
                                        </label>
                                        <input
                                            type='number'
                                            min='1'
                                            max='10'
                                            value={quantity}
                                            onChange={e =>
                                                setQuantity(
                                                    parseInt(e.target.value) ||
                                                        1
                                                )
                                            }
                                            className='dark:bg-gray-700 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-20 dark:text-white text-sm'
                                        />
                                    </div>
                                )}
                            </div>

                            <div className='flex-1 gap-6 grid grid-cols-1 lg:grid-cols-2 overflow-hidden'>
                                {/* Employee Selection */}
                                <div className='flex flex-col'>
                                    <h3 className='mb-4 font-medium text-gray-900 dark:text-white text-lg'>
                                        Select Employee (
                                        {filteredEmployees.length} found)
                                    </h3>

                                    {/* Filters Section */}
                                    <div className='bg-gray-50 dark:bg-gray-700/50 mb-4 p-4 rounded-lg'>
                                        <div className='gap-3 grid grid-cols-1 md:grid-cols-4'>
                                            {/* Search */}
                                            <div className='md:col-span-2'>
                                                <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                                    Search Employee
                                                </label>
                                                <input
                                                    type='text'
                                                    placeholder='Search by name or NIK...'
                                                    value={searchTerm}
                                                    onChange={e => {
                                                        setSearchTerm(
                                                            e.target.value
                                                        )
                                                        setCurrentPage(1)
                                                    }}
                                                    className='dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors'
                                                />
                                            </div>

                                            {/* Section Filter */}
                                            <div>
                                                <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                                    Section
                                                </label>
                                                <select
                                                    value={selectedSection}
                                                    onChange={e => {
                                                        setSelectedSection(
                                                            e.target.value
                                                        )
                                                        setCurrentPage(1)
                                                    }}
                                                    className='dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors'
                                                >
                                                    <option value=''>
                                                        All Sections
                                                    </option>
                                                    {sections.map(section => (
                                                        <option
                                                            key={section.id}
                                                            value={section.id}
                                                        >
                                                            {section.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Subsection Filter */}
                                            <div>
                                                <label className='block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                                    Subsection
                                                </label>
                                                <select
                                                    value={selectedSubSection}
                                                    onChange={e => {
                                                        setSelectedSubSection(
                                                            e.target.value
                                                        )
                                                        setCurrentPage(1)
                                                    }}
                                                    disabled={!selectedSection}
                                                    className='disabled:bg-gray-100 dark:bg-gray-700 dark:disabled:bg-gray-800 px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full dark:text-white text-sm transition-colors disabled:cursor-not-allowed'
                                                >
                                                    <option value=''>
                                                        All Subsections
                                                    </option>
                                                    {filteredSubSections.map(
                                                        subsection => (
                                                            <option
                                                                key={
                                                                    subsection.id
                                                                }
                                                                value={
                                                                    subsection.id
                                                                }
                                                            >
                                                                {
                                                                    subsection.name
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Clear Filters */}
                                        {(searchTerm ||
                                            selectedSection ||
                                            selectedSubSection) && (
                                            <div className='flex justify-end mt-3'>
                                                <button
                                                    onClick={clearFilters}
                                                    className='font-medium text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-400 text-sm'
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Employees List */}
                                    <div className='flex-1 space-y-3 overflow-y-auto'>
                                        {paginatedEmployees.map(employee => (
                                            <div
                                                key={employee.id}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                                    selectedEmployee?.id ===
                                                    employee.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                                }`}
                                                onClick={() =>
                                                    handleEmployeeSelect(
                                                        employee
                                                    )
                                                }
                                            >
                                                <div className='flex justify-between items-start'>
                                                    <div className='flex-1'>
                                                        <h4 className='font-medium text-gray-900 dark:text-white'>
                                                            {employee.name}
                                                        </h4>
                                                        <p className='text-gray-600 dark:text-gray-400 text-sm'>
                                                            NIK: {employee.nik}
                                                        </p>
                                                        <p className='mt-1 text-gray-500 dark:text-gray-500 text-sm'>
                                                            {getEmployeeSectionInfo(
                                                                employee
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className='ml-4 text-right'>
                                                        <div className='mb-1 text-gray-500 dark:text-gray-400 text-xs'>
                                                            Equipment Count:{' '}
                                                            {getTotalEmployeeEquipmentCount(
                                                                employee.id
                                                            )}
                                                        </div>
                                                        <div className='space-y-1 max-h-20 overflow-y-auto'>
                                                            {equipments
                                                                ?.map(
                                                                    equipment => {
                                                                        const count =
                                                                            getEmployeeEquipmentCount(
                                                                                employee.id,
                                                                                equipment.type
                                                                            )
                                                                        if (
                                                                            count >
                                                                            0
                                                                        ) {
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        equipment.id
                                                                                    }
                                                                                    className='text-xs'
                                                                                >
                                                                                    <span className='text-gray-600 dark:text-gray-400'>
                                                                                        {
                                                                                            equipment.type
                                                                                        }
                                                                                        :{' '}
                                                                                    </span>
                                                                                    <span className='font-medium text-blue-600 dark:text-blue-400'>
                                                                                        {
                                                                                            count
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        }
                                                                        return null
                                                                    }
                                                                )
                                                                .filter(
                                                                    Boolean
                                                                )}
                                                        </div>
                                                        {getTotalEmployeeEquipmentCount(
                                                            employee.id
                                                        ) === 0 && (
                                                            <span className='text-gray-400 dark:text-gray-500 text-xs'>
                                                                No equipment
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {paginatedEmployees.length === 0 && (
                                            <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                                                <svg
                                                    className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                                                    fill='none'
                                                    stroke='currentColor'
                                                    viewBox='0 0 24 24'
                                                >
                                                    <path
                                                        strokeLinecap='round'
                                                        strokeLinejoin='round'
                                                        strokeWidth={1}
                                                        d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                                                    />
                                                </svg>
                                                <p>No employees found</p>
                                                <p className='mt-1 text-sm'>
                                                    Try adjusting your search or
                                                    filters
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className='flex justify-center items-center space-x-2 mt-4'>
                                            <button
                                                onClick={() =>
                                                    goToPage(currentPage - 1)
                                                }
                                                disabled={currentPage === 1}
                                                className='disabled:opacity-50 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:cursor-not-allowed'
                                            >
                                                Previous
                                            </button>
                                            <span className='text-gray-600 dark:text-gray-400 text-sm'>
                                                Page {currentPage} of{' '}
                                                {totalPages}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    goToPage(currentPage + 1)
                                                }
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                className='disabled:opacity-50 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:cursor-not-allowed'
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Equipment Selection */}
                                <div
                                    id='equipment-selection'
                                    className='flex flex-col'
                                >
                                    <h3 className='mb-4 font-medium text-gray-900 dark:text-white text-lg'>
                                        Select Equipment
                                    </h3>
                                    <div className='flex-1 space-y-4 overflow-y-auto'>
                                        {equipments?.map(equipment => (
                                            <div
                                                key={equipment.id}
                                                className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border cursor-pointer transition-all ${
                                                    selectedEquipment?.id ===
                                                    equipment.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                                }`}
                                                onClick={() =>
                                                    handleEquipmentSelect(
                                                        equipment
                                                    )
                                                }
                                            >
                                                <div className='flex justify-between items-start mb-3'>
                                                    <div className='flex items-start gap-3'>
                                                        {equipment.photo && (
                                                            <img
                                                                src={
                                                                    equipment.photo
                                                                }
                                                                alt={
                                                                    equipment.type
                                                                }
                                                                className='border border-gray-200 dark:border-gray-600 rounded-lg w-16 h-16 object-cover'
                                                            />
                                                        )}
                                                        <div>
                                                            <h4 className='font-medium text-gray-900 dark:text-white'>
                                                                {equipment.type}
                                                            </h4>
                                                            <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                                                                {equipment.description ||
                                                                    'No description'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            equipment.size ||
                                                            equipment.amount > 0
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                        }`}
                                                    >
                                                        {equipment.size
                                                            ? 'Multiple Sizes'
                                                            : `${equipment.amount} available`}
                                                    </span>
                                                </div>

                                                {/* Stock Information */}
                                                <div className='space-y-2 text-gray-600 dark:text-gray-400 text-sm'>
                                                    {equipment.size ? (
                                                        <div>
                                                            <div className='mb-1 font-medium'>
                                                                Available Sizes:
                                                            </div>
                                                            <div className='space-y-1'>
                                                                {equipment.size
                                                                    .split(',')
                                                                    .map(
                                                                        (
                                                                            sizeItem,
                                                                            idx
                                                                        ) => {
                                                                            if (
                                                                                !sizeItem ||
                                                                                !sizeItem.includes(
                                                                                    ':'
                                                                                )
                                                                            )
                                                                                return null
                                                                            const [
                                                                                sizeName,
                                                                                amount
                                                                            ] =
                                                                                sizeItem.split(
                                                                                    ':'
                                                                                )
                                                                            const stock =
                                                                                parseInt(
                                                                                    amount
                                                                                ) ||
                                                                                0
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className='flex justify-between items-center'
                                                                                >
                                                                                    <span>
                                                                                        Size{' '}
                                                                                        {
                                                                                            sizeName
                                                                                        }
                                                                                    </span>
                                                                                    <span
                                                                                        className={`px-2 py-1 rounded text-xs ${
                                                                                            stock >
                                                                                            0
                                                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                                        }`}
                                                                                    >
                                                                                        {
                                                                                            stock
                                                                                        }{' '}
                                                                                        available
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        }
                                                                    )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className='flex justify-between items-center'>
                                                            <span>Stock:</span>
                                                            <span
                                                                className={`px-2 py-1 rounded text-xs ${
                                                                    equipment.amount >
                                                                    0
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                }`}
                                                            >
                                                                {
                                                                    equipment.amount
                                                                }{' '}
                                                                available
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {(!equipments ||
                                            equipments.length === 0) && (
                                            <div className='py-8 text-gray-500 dark:text-gray-400 text-center'>
                                                <svg
                                                    className='mx-auto mb-3 w-12 h-12 text-gray-300 dark:text-gray-600'
                                                    fill='none'
                                                    stroke='currentColor'
                                                    viewBox='0 0 24 24'
                                                >
                                                    <path
                                                        strokeLinecap='round'
                                                        strokeLinejoin='round'
                                                        strokeWidth={1}
                                                        d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
                                                    />
                                                </svg>
                                                <p>No equipment available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Summary */}
                            {(selectedEmployee || selectedEquipment) && (
                                <div className='bg-gray-50 dark:bg-gray-700/50 mt-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg'>
                                    <h4 className='mb-2 font-medium text-gray-900 dark:text-white'>
                                        Assignment Summary
                                    </h4>
                                    <div className='gap-4 grid grid-cols-1 md:grid-cols-2 text-sm'>
                                        {selectedEmployee && (
                                            <div>
                                                <span className='text-gray-600 dark:text-gray-400'>
                                                    Employee:{' '}
                                                </span>
                                                <span className='font-medium text-gray-900 dark:text-white'>
                                                    {selectedEmployee.name}{' '}
                                                    (NIK: {selectedEmployee.nik}
                                                    )
                                                </span>
                                            </div>
                                        )}
                                        {selectedEquipment && (
                                            <div>
                                                <span className='text-gray-600 dark:text-gray-400'>
                                                    Equipment:{' '}
                                                </span>
                                                <span className='font-medium text-gray-900 dark:text-white'>
                                                    {selectedEquipment.type}
                                                    {selectedSize &&
                                                        ` - Size: ${selectedSize}`}
                                                </span>
                                            </div>
                                        )}
                                        {assignMultiple && (
                                            <div className='md:col-span-2'>
                                                <span className='text-gray-600 dark:text-gray-400'>
                                                    Quantity:{' '}
                                                </span>
                                                <span className='font-medium text-gray-900 dark:text-white'>
                                                    {quantity} item(s)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='flex justify-end gap-3 p-6 border-gray-200 dark:border-gray-700 border-t'>
                        <button
                            onClick={onClose}
                            className='px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={
                                !selectedEmployee ||
                                !selectedEquipment ||
                                isSubmitting
                            }
                            className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-6 py-2 rounded-lg font-medium text-white transition-colors'
                        >
                            {isSubmitting ? (
                                <>
                                    <svg
                                        className='w-4 h-4 animate-spin'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                    >
                                        <circle
                                            className='opacity-25'
                                            cx='12'
                                            cy='12'
                                            r='10'
                                            stroke='currentColor'
                                            strokeWidth='4'
                                        ></circle>
                                        <path
                                            className='opacity-75'
                                            fill='currentColor'
                                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                        ></path>
                                    </svg>
                                    Assigning...
                                </>
                            ) : (
                                'Assign Equipment'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Size Selection Modal */}
            <Modal
                show={showSizeModal}
                onClose={() => setShowSizeModal(false)}
                maxWidth='sm'
            >
                <div className='bg-white dark:bg-gray-800 shadow-xl p-6 rounded-lg'>
                    <h3 className='mb-4 font-semibold text-gray-900 dark:text-white text-lg'>
                        Select Size for {selectedEquipment?.type}
                    </h3>

                    <div className='space-y-3'>
                        {selectedEquipment?.size
                            ?.split(',')
                            .map((sizeItem, index) => {
                                if (!sizeItem || !sizeItem.includes(':'))
                                    return null

                                const [sizeName, amount] = sizeItem.split(':')
                                const stock = parseInt(amount) || 0

                                return (
                                    <button
                                        key={index}
                                        onClick={() =>
                                            handleSizeSelect(sizeName)
                                        }
                                        disabled={stock <= 0}
                                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                                            stock > 0
                                                ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className='flex justify-between items-center'>
                                            <span className='font-medium text-gray-900 dark:text-white'>
                                                {sizeName}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    stock > 0
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}
                                            >
                                                {stock > 0
                                                    ? `${stock} available`
                                                    : 'Out of stock'}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                    </div>

                    <div className='flex justify-end gap-3 mt-6 pt-4 border-gray-200 dark:border-gray-700 border-t'>
                        <button
                            onClick={() => setShowSizeModal(false)}
                            className='px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: '',
                        title: '',
                        message: ''
                    })
                }
            />
        </>
    )
}

// Delete Confirmation Modal
function DeleteConfirmationModal ({ show, onClose, handover, onConfirm }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [notification, setNotification] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    })

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message })
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await onConfirm()
            onClose()
        } catch (error) {
            console.error('Delete error:', error)
            showNotification(
                'error',
                'Delete Failed',
                'Delete failed: ' + error.message
            )
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth='md'>
                <div className='bg-white dark:bg-gray-800 shadow-xl p-6 rounded-lg'>
                    <div className='flex items-center gap-3 mb-4'>
                        <div className='flex justify-center items-center bg-red-100 dark:bg-red-900/20 rounded-full w-10 h-10'>
                            <svg
                                className='w-5 h-5 text-red-600 dark:text-red-400'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                />
                            </svg>
                        </div>
                        <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>
                            Delete Assignment
                        </h3>
                    </div>

                    <p className='mb-6 text-gray-600 dark:text-gray-300'>
                        Are you sure you want to delete the assignment of{' '}
                        <strong>{handover?.equipment?.type}</strong> to{' '}
                        <strong>{handover?.employee?.name}</strong>? This action
                        cannot be undone.
                    </p>

                    <div className='flex justify-end gap-3'>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className='disabled:opacity-50 px-4 py-2 font-medium text-gray-700 hover:text-gray-900 dark:hover:text-white dark:text-gray-300 transition-colors'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className='flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium text-white transition-colors'
                        >
                            {isDeleting ? (
                                <>
                                    <svg
                                        className='w-4 h-4 animate-spin'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                    >
                                        <circle
                                            className='opacity-25'
                                            cx='12'
                                            cy='12'
                                            r='10'
                                            stroke='currentColor'
                                            strokeWidth='4'
                                        ></circle>
                                        <path
                                            className='opacity-75'
                                            fill='currentColor'
                                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                        ></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                'Delete Assignment'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: '',
                        title: '',
                        message: ''
                    })
                }
            />
        </>
    )
}

// Main Component
export default function Assign ({
    handovers,
    filters,
    equipments,
    employees,
    sections,
    subSections
}) {
    const { auth } = usePage().props
    const [search, setSearch] = useState(filters.search || '')
    const [selectedSection, setSelectedSection] = useState(
        filters.section || ''
    )
    const [selectedSubSection, setSelectedSubSection] = useState(
        filters.sub_section || ''
    )
    const [filteredSubSections, setFilteredSubSections] = useState([])
    const [groupedHandovers, setGroupedHandovers] = useState({})
    const [expandedEmployees, setExpandedEmployees] = useState(new Set())

    // Modal states
    const [showQuickAssign, setShowQuickAssign] = useState(false)
    const [showNewAssign, setShowNewAssign] = useState(false)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [handoverToDelete, setHandoverToDelete] = useState(null)
    const [unassignedEmployees, setUnassignedEmployees] = useState([])
    const [notification, setNotification] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    })

    const showNotification = (type, title, message) => {
        setNotification({ show: true, type, title, message })
    }

    // Safe data handling
    const safeHandovers = handovers || {
        data: [],
        total: 0,
        from: 0,
        to: 0,
        last_page: 1
    }

    // Filter subsections based on selected section
    useEffect(() => {
        if (selectedSection) {
            const filtered = subSections.filter(
                sub => sub.section_id == selectedSection
            )
            setFilteredSubSections(filtered)
            if (
                selectedSubSection &&
                !filtered.some(sub => sub.id == selectedSubSection)
            ) {
                setSelectedSubSection('')
            }
        } else {
            setFilteredSubSections([])
            setSelectedSubSection('')
        }
    }, [selectedSection, selectedSubSection, subSections])

    // Group handovers by employee
    useEffect(() => {
        if (!safeHandovers.data) {
            setGroupedHandovers({})
            return
        }

        // Filter handovers based on search and section filters
        const filteredHandovers = safeHandovers.data.filter(handover => {
            if (!handover?.employee) return false

            const employee = handover.employee

            // Search filter
            const matchesSearch =
                !search ||
                employee.name.toLowerCase().includes(search.toLowerCase()) ||
                employee.nik.toLowerCase().includes(search.toLowerCase())

            // Section filter
            const matchesSection =
                !selectedSection ||
                employee.sub_sections?.some(
                    sub => sub.section_id == selectedSection
                )

            // Subsection filter
            const matchesSubSection =
                !selectedSubSection ||
                employee.sub_sections?.some(sub => sub.id == selectedSubSection)

            return matchesSearch && matchesSection && matchesSubSection
        })

        // Group filtered handovers by employee
        const grouped = {}
        filteredHandovers.forEach(handover => {
            if (handover?.employee) {
                const employeeId = handover.employee.id
                if (!grouped[employeeId]) {
                    grouped[employeeId] = {
                        employee: handover.employee,
                        assignments: [],
                        totalAssignments: 0
                    }
                }
                grouped[employeeId].assignments.push(handover)
                grouped[employeeId].totalAssignments++
            }
        })

        setGroupedHandovers(grouped)
    }, [safeHandovers, search, selectedSection, selectedSubSection])

    // Load unassigned employees
    useEffect(() => {
        if (showNewAssign) {
            loadUnassignedEmployees()
        }
    }, [showNewAssign])

    const loadUnassignedEmployees = async () => {
        try {
            const response = await fetch(
                route('handovers.unassigned-employees')
            )
            const data = await response.json()

            if (data.success) {
                setUnassignedEmployees(data.employees)
            } else {
                console.error(
                    'Failed to load unassigned employees:',
                    data.message
                )
                setUnassignedEmployees([])
            }
        } catch (error) {
            console.error('Error loading unassigned employees:', error)
            setUnassignedEmployees([])
        }
    }

    const toggleEmployeeExpansion = employeeId => {
        const newExpanded = new Set(expandedEmployees)
        if (newExpanded.has(employeeId)) {
            newExpanded.delete(employeeId)
        } else {
            newExpanded.add(employeeId)
        }
        setExpandedEmployees(newExpanded)
    }

    const getAvailableEquipmentsForEmployee = employeeId => {
        const employeeAssignments =
            groupedHandovers[employeeId]?.assignments || []
        const assignedEquipmentIds = new Set(
            employeeAssignments.map(assignment => assignment.equipment.id)
        )

        return (
            equipments?.filter(
                equipment => !assignedEquipmentIds.has(equipment.id)
            ) || []
        )
    }

    const handleQuickAssign = employee => {
        setSelectedEmployee(employee)
        setShowQuickAssign(true)
    }

    const handleNewAssign = () => {
        setShowNewAssign(true)
    }

    const handleUpdate = employee => {
        setSelectedEmployee(employee)
        setShowUpdateModal(true)
    }

    const openDeleteModal = handover => {
        setHandoverToDelete(handover)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!handoverToDelete) return

        try {
            const response = await fetch(
                route('handovers.destroy', {
                    handover: handoverToDelete.id
                }),
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector(
                            'meta[name="csrf-token"]'
                        ).content,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            )

            const data = await response.json()

            if (data.success) {
                showNotification(
                    'success',
                    'Delete Successful',
                    'Assignment deleted successfully'
                )
                router.reload()
            } else {
                throw new Error(data.error || 'Delete failed')
            }
        } catch (error) {
            console.error('Delete error:', error)
            showNotification(
                'error',
                'Delete Failed',
                'Delete failed: ' + error.message
            )
        }
    }

    const handleSearch = e => {
        e.preventDefault()
        router.get(route('handovers.assign'), {
            search,
            section: selectedSection !== '' ? selectedSection : undefined,
            sub_section:
                selectedSubSection !== '' ? selectedSubSection : undefined
        })
    }

    const clearSearch = () => {
        setSearch('')
        setSelectedSection('')
        setSelectedSubSection('')
        router.get(route('handovers.assign'), {
            search: '',
            section: '',
            sub_section: ''
        })
    }

    return (
        <AuthenticatedLayout
            header={
                <div className='flex sm:flex-row flex-col justify-between sm:items-center gap-4'>
                    <div>
                        <h2 className='font-semibold text-gray-800 dark:text-white text-xl'>
                            Employee Equipment Assignments
                        </h2>
                        <p className='mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                            Manage equipment assignments grouped by employee
                        </p>
                    </div>
                    <div className='flex gap-3'>
                        <button
                            onClick={handleNewAssign}
                            className='inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors'
                        >
                            <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M12 4v16m8-8H4'
                                />
                            </svg>
                            New Assign
                        </button>
                        <Link
                            href={route('equipments.index')}
                            className='inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors'
                        >
                            <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                                />
                            </svg>
                            Back to Equipment
                        </Link>
                    </div>
                </div>
            }
        >
            <div className='py-6'>
                <div className='mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl'>
                    {/* Header Card */}
                    <div className='bg-gradient-to-r from-blue-50 dark:from-gray-800 to-indigo-50 dark:to-gray-900 shadow-lg mb-6 rounded-xl overflow-hidden'>
                        <div className='p-6'>
                            <div className='flex lg:flex-row flex-col justify-between items-start lg:items-center gap-4'>
                                <div>
                                    <h1 className='mb-2 font-bold text-gray-800 dark:text-white text-2xl'>
                                        Employee Assignments Overview
                                    </h1>
                                    <p className='text-gray-600 dark:text-gray-300'>
                                        View and manage equipment assignments
                                        for each employee
                                    </p>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <span className='bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full font-medium text-blue-600 dark:text-blue-400 text-sm'>
                                        {Object.keys(groupedHandovers).length}{' '}
                                        employees
                                    </span>
                                    <span className='bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full font-medium text-green-600 dark:text-green-400 text-sm'>
                                        {safeHandovers.total} total assignments
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Section with Section/Subsection Filters */}
                    <div className='bg-white dark:bg-gray-800 shadow-md mb-6 p-6 rounded-xl'>
                        <form onSubmit={handleSearch} className='space-y-4'>
                            <div className='gap-4 grid grid-cols-1 md:grid-cols-4'>
                                {/* Search Input */}
                                <div className='md:col-span-1'>
                                    <label className='block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                        Search
                                    </label>
                                    <div className='relative'>
                                        <svg
                                            className='top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                                            />
                                        </svg>
                                        <input
                                            type='text'
                                            placeholder='Search employees by name or NIK...'
                                            value={search}
                                            onChange={e =>
                                                setSearch(e.target.value)
                                            }
                                            className='dark:bg-gray-700 py-3 pr-4 pl-10 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors'
                                        />
                                    </div>
                                </div>

                                {/* Section Filter */}
                                <div>
                                    <label className='block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                        Section
                                    </label>
                                    <select
                                        value={selectedSection}
                                        onChange={e =>
                                            setSelectedSection(e.target.value)
                                        }
                                        className='dark:bg-gray-700 px-3 py-3 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors'
                                    >
                                        <option value=''>All Sections</option>
                                        {sections.map(section => (
                                            <option
                                                key={section.id}
                                                value={section.id}
                                            >
                                                {section.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subsection Filter */}
                                <div>
                                    <label className='block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm'>
                                        Subsection
                                    </label>
                                    <select
                                        value={selectedSubSection}
                                        onChange={e =>
                                            setSelectedSubSection(
                                                e.target.value
                                            )
                                        }
                                        disabled={!selectedSection}
                                        className='disabled:bg-gray-100 dark:bg-gray-700 dark:disabled:bg-gray-800 px-3 py-3 border border-gray-300 dark:border-gray-600 focus:border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 w-full dark:text-white transition-colors disabled:cursor-not-allowed'
                                    >
                                        <option value=''>
                                            All Subsections
                                        </option>
                                        {filteredSubSections.map(subsection => (
                                            <option
                                                key={subsection.id}
                                                value={subsection.id}
                                            >
                                                {subsection.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Action Buttons */}
                                <div className='flex items-end gap-2'>
                                    <button
                                        type='submit'
                                        className='flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-6 py-3 rounded-lg font-medium text-white transition-colors'
                                    >
                                        Search
                                    </button>
                                    {(search ||
                                        selectedSection ||
                                        selectedSubSection) && (
                                        <button
                                            type='button'
                                            onClick={clearSearch}
                                            className='flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-6 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors'
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Employee Assignment Cards */}
                    <div className='space-y-6'>
                        {Object.keys(groupedHandovers).length > 0 ? (
                            Object.values(groupedHandovers).map(group => (
                                <div
                                    key={group.employee.id}
                                    className='bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'
                                >
                                    {/* Employee Header */}
                                    <div
                                        className='hover:bg-gray-50 dark:hover:bg-gray-700/50 p-6 transition-colors cursor-pointer'
                                        onClick={() =>
                                            toggleEmployeeExpansion(
                                                group.employee.id
                                            )
                                        }
                                    >
                                        <div className='flex sm:flex-row flex-col justify-between sm:items-center gap-4'>
                                            <div className='flex flex-1 items-center gap-4'>
                                                <div className='flex justify-center items-center bg-gradient-to-br from-blue-500 to-purple-500 rounded-full w-12 h-12 font-medium text-white text-lg'>
                                                    {group.employee.name.charAt(
                                                        0
                                                    )}
                                                </div>
                                                <div className='flex-1'>
                                                    <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>
                                                        {group.employee.name}
                                                    </h3>
                                                    <div className='flex flex-wrap gap-4 mt-1 text-gray-600 dark:text-gray-400 text-sm'>
                                                        <span>
                                                            NIK:{' '}
                                                            {group.employee.nik}
                                                        </span>
                                                        <span>
                                                            Assignments:{' '}
                                                            {
                                                                group.totalAssignments
                                                            }
                                                        </span>
                                                        {group.employee
                                                            .sub_sections &&
                                                            group.employee
                                                                .sub_sections
                                                                .length > 0 && (
                                                                <span>
                                                                    {
                                                                        group
                                                                            .employee
                                                                            .sub_sections[0]
                                                                            ?.section
                                                                            ?.name
                                                                    }
                                                                    {group
                                                                        .employee
                                                                        .sub_sections[0]
                                                                        ?.name &&
                                                                        ` / ${group.employee.sub_sections[0].name}`}
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-3'>
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation()
                                                        handleUpdate(
                                                            group.employee
                                                        )
                                                    }}
                                                    className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors'
                                                >
                                                    <svg
                                                        className='w-4 h-4'
                                                        fill='none'
                                                        stroke='currentColor'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <path
                                                            strokeLinecap='round'
                                                            strokeLinejoin='round'
                                                            strokeWidth={2}
                                                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                                        />
                                                    </svg>
                                                    Update
                                                </button>
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation()
                                                        handleQuickAssign(
                                                            group.employee
                                                        )
                                                    }}
                                                    className='inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm hover:shadow px-4 py-2 rounded-lg font-medium text-white transition-colors'
                                                >
                                                    <svg
                                                        className='w-4 h-4'
                                                        fill='none'
                                                        stroke='currentColor'
                                                        viewBox='0 0 24 24'
                                                    >
                                                        <path
                                                            strokeLinecap='round'
                                                            strokeLinejoin='round'
                                                            strokeWidth={2}
                                                            d='M12 4v16m8-8H4'
                                                        />
                                                    </svg>
                                                    Assign More
                                                </button>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        group.totalAssignments >
                                                        0
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {group.totalAssignments}{' '}
                                                    equipment assigned
                                                </span>
                                                <svg
                                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                                        expandedEmployees.has(
                                                            group.employee.id
                                                        )
                                                            ? 'rotate-180'
                                                            : ''
                                                    }`}
                                                    fill='none'
                                                    stroke='currentColor'
                                                    viewBox='0 0 24 24'
                                                >
                                                    <path
                                                        strokeLinecap='round'
                                                        strokeLinejoin='round'
                                                        strokeWidth={2}
                                                        d='M19 9l-7 7-7-7'
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedEmployees.has(
                                        group.employee.id
                                    ) && (
                                        <div className='border-gray-200 dark:border-gray-700 border-t'>
                                            <div className='p-6'>
                                                <div className='flex justify-between items-center mb-4'>
                                                    <h4 className='font-semibold text-gray-900 text-md dark:text-white'>
                                                        Assigned Equipment (
                                                        {
                                                            group.assignments
                                                                .length
                                                        }
                                                        )
                                                    </h4>
                                                </div>
                                                <div className='gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
                                                    {group.assignments.map(
                                                        assignment => (
                                                            <div
                                                                key={
                                                                    assignment.id
                                                                }
                                                                className='bg-gray-50 dark:bg-gray-700/50 p-4 border border-gray-200 dark:border-gray-600 rounded-lg'
                                                            >
                                                                <div className='flex justify-between items-start mb-3'>
                                                                    <div>
                                                                        <h5 className='font-medium text-gray-900 dark:text-white'>
                                                                            {
                                                                                assignment
                                                                                    .equipment
                                                                                    .type
                                                                            }
                                                                        </h5>
                                                                        {assignment.size && (
                                                                            <span className='inline-block bg-blue-100 dark:bg-blue-900/30 mt-1 px-2 py-1 rounded-full font-medium text-blue-800 dark:text-blue-300 text-xs'>
                                                                                Size:{' '}
                                                                                {
                                                                                    assignment.size
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {assignment.photo ? (
                                                                        <img
                                                                            src={
                                                                                assignment.photo
                                                                            }
                                                                            alt='handover'
                                                                            className='border border-gray-200 dark:border-gray-600 rounded-lg w-12 h-12 object-cover'
                                                                        />
                                                                    ) : (
                                                                        <span className='text-gray-400 text-xs'>
                                                                            No
                                                                            photo
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className='mb-3 text-gray-600 dark:text-gray-400 text-sm'>
                                                                    Assigned:{' '}
                                                                    {new Date(
                                                                        assignment.date
                                                                    ).toLocaleDateString(
                                                                        'id-ID',
                                                                        {
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        }
                                                                    )}
                                                                </div>
                                                                <div className='flex gap-2'>
                                                                    <button
                                                                        onClick={() =>
                                                                            openDeleteModal(
                                                                                assignment
                                                                            )
                                                                        }
                                                                        className='inline-flex flex-1 justify-center items-center gap-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-3 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 text-sm transition-colors'
                                                                    >
                                                                        <svg
                                                                            className='w-4 h-4'
                                                                            fill='none'
                                                                            stroke='currentColor'
                                                                            viewBox='0 0 24 24'
                                                                        >
                                                                            <path
                                                                                strokeLinecap='round'
                                                                                strokeLinejoin='round'
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                                                                            />
                                                                        </svg>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className='bg-white dark:bg-gray-800 shadow-md p-12 rounded-xl text-center'>
                                <svg
                                    className='mx-auto mb-4 w-16 h-16 text-gray-300 dark:text-gray-600'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={1}
                                        d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                                    />
                                </svg>
                                <h3 className='mb-2 font-medium text-gray-900 dark:text-white text-lg'>
                                    No assignments found
                                </h3>
                                <p className='mb-4 text-gray-500 dark:text-gray-400'>
                                    {search
                                        ? 'Try adjusting your search terms'
                                        : 'Start by assigning equipment to employees'}
                                </p>
                                {search ? (
                                    <button
                                        onClick={clearSearch}
                                        className='bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white transition-colors'
                                    >
                                        Clear Search
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNewAssign}
                                        className='bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-colors'
                                    >
                                        New Assign
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {safeHandovers.last_page > 1 && (
                        <div className='flex justify-center mt-8'>
                            <nav className='flex items-center gap-2'>
                                {safeHandovers.links?.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                        } ${
                                            !link.url
                                                ? 'opacity-50 cursor-not-allowed'
                                                : ''
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label
                                        }}
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <QuickAssign
                employee={selectedEmployee}
                show={showQuickAssign}
                onClose={() => setShowQuickAssign(false)}
                equipments={
                    selectedEmployee
                        ? getAvailableEquipmentsForEmployee(selectedEmployee.id)
                        : []
                }
            />

            <NewAssignModal
                show={showNewAssign}
                onClose={() => setShowNewAssign(false)}
                employees={employees} // Pass all employees
                equipments={equipments}
            />

            <UpdateEmployeeModal
                employee={selectedEmployee}
                show={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                equipments={equipments}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                handover={handoverToDelete}
                onConfirm={handleDelete}
            />

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() =>
                    setNotification({
                        show: false,
                        type: '',
                        title: '',
                        message: ''
                    })
                }
            />
        </AuthenticatedLayout>
    )
}
