function QuickAssign({ employee, show, onClose, equipments }) {
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignMultiple, setAssignMultiple] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [currentStep, setCurrentStep] = useState('equipment'); // 'equipment' or 'size'

    // Reset state ketika modal dibuka/tutup
    useEffect(() => {
        if (show) {
            setSelectedEquipment(null);
            setSelectedSize("");
            setCurrentStep('equipment');
            setAssignMultiple(false);
            setQuantity(1);
        }
    }, [show]);

    const handleEquipmentSelect = (equipment) => {
        setSelectedEquipment(equipment);
        
        if (equipment.size) {
            // Move to size selection step
            setCurrentStep('size');
        } else {
            // Direct assign for equipment without sizes
            setSelectedSize(null);
            handleAssign();
        }
    };

    const handleSizeSelect = (size) => {
        setSelectedSize(size);
        handleAssign();
    };

    const handleBackToEquipment = () => {
        setCurrentStep('equipment');
        setSelectedSize("");
    };

    const handleAssign = async () => {
        if (!selectedEquipment || !employee) return;

        // Validate: if equipment has sizes, a size must be selected
        if (selectedEquipment.size && !selectedSize) {
            alert('Please select a size for this equipment');
            return;
        }

        setIsSubmitting(true);

        try {
            const assignments = [];
            const totalToAssign = assignMultiple ? quantity : 1;

            for (let i = 0; i < totalToAssign; i++) {
                assignments.push(
                    fetch(route("handovers.quick-assign"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        body: JSON.stringify({
                            employee_id: employee.id,
                            equipment_id: selectedEquipment.id,
                            size: selectedSize,
                            quantity: assignMultiple ? quantity : 1,
                        }),
                    })
                );
            }

            const results = await Promise.allSettled(assignments);
            const successful = results.filter(result => 
                result.status === 'fulfilled' && result.value.ok
            ).length;

            if (successful > 0) {
                alert(`Successfully assigned ${successful} item(s) to ${employee.name}`);
                onClose();
                router.reload();
            } else {
                throw new Error('All assignments failed');
            }

        } catch (error) {
            console.error("Assignment error:", error);
            alert('Assignment failed: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Modal show={show} onClose={onClose} maxWidth="4xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {currentStep === 'equipment' ? 'Select Equipment' : 'Select Size'}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Assigning to {employee?.name} (NIK: {employee?.nik})
                                </p>
                            </div>
                            
                            {/* Step Indicator */}
                            <div className="flex items-center gap-2">
                                {currentStep === 'size' && (
                                    <button
                                        onClick={handleBackToEquipment}
                                        className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Equipment
                                    </button>
                                )}
                                <div className="flex items-center gap-1 text-sm">
                                    <span className={`px-2 py-1 rounded-full ${currentStep === 'equipment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        1
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-1 rounded-full ${currentStep === 'size' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        2
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Multiple Assignment Toggle - Show only in equipment selection */}
                        {currentStep === 'equipment' && (
                            <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={assignMultiple}
                                            onChange={(e) => setAssignMultiple(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors ${
                                            assignMultiple ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}></div>
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            assignMultiple ? 'transform translate-x-6' : ''
                                        }`}></div>
                                    </div>
                                </label>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Assign multiple items
                                </span>
                                
                                {assignMultiple && (
                                    <div className="flex items-center gap-2 ml-4">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Quantity:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Equipment Selection Step */}
                        {currentStep === 'equipment' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                {equipments?.map((equipment) => (
                                    <div
                                        key={equipment.id}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                        onClick={() => handleEquipmentSelect(equipment)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {equipment.type}
                                                </h3>
                                                {equipment.photo && (
                                                    <img
                                                        src={equipment.photo}
                                                        alt={equipment.type}
                                                        className="w-16 h-16 object-cover rounded-lg mt-2 border border-gray-200 dark:border-gray-600"
                                                    />
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                (equipment.size || equipment.amount > 0) 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                                {equipment.size ? 'Select Size' : `${equipment.amount} available`}
                                            </span>
                                        </div>
                                        
                                        {/* Stock Information */}
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            {equipment.size ? (
                                                <div>
                                                    <div className="font-medium mb-1 text-blue-600 dark:text-blue-400">
                                                        ⓘ Click to select size
                                                    </div>
                                                    <div className="space-y-1">
                                                        {equipment.size.split(',').map((sizeItem, idx) => {
                                                            if (!sizeItem || !sizeItem.includes(':')) return null;
                                                            const [sizeName, amount] = sizeItem.split(':');
                                                            const stock = parseInt(amount) || 0;
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center">
                                                                    <span>Size {sizeName}</span>
                                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                                        stock > 0 
                                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                    }`}>
                                                                        {stock} available
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center">
                                                    <span>Stock:</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        equipment.amount > 0 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}>
                                                        {equipment.amount} available
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Size Selection Step */}
                        {currentStep === 'size' && selectedEquipment && (
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        Selected Equipment: {selectedEquipment.type}
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Please select the size you want to assign
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedEquipment.size?.split(',').map((sizeItem, index) => {
                                        if (!sizeItem || !sizeItem.includes(':')) return null;
                                        
                                        const [sizeName, amount] = sizeItem.split(':');
                                        const stock = parseInt(amount) || 0;
                                        
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleSizeSelect(sizeName)}
                                                disabled={stock <= 0 || isSubmitting}
                                                className={`p-6 text-left rounded-lg border-2 transition-all ${
                                                    stock > 0 && !isSubmitting
                                                        ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                } ${selectedSize === sizeName ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-medium text-lg text-gray-900 dark:text-white">
                                                            Size {sizeName}
                                                        </span>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {selectedEquipment.type}
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        stock > 0 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}>
                                                        {stock > 0 ? `${stock} available` : 'Out of stock'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {isSubmitting && (
                                    <div className="mt-6 text-center">
                                        <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Assigning equipment...
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(!equipments || equipments.length === 0) && currentStep === 'equipment' && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p>No equipment available to assign</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}