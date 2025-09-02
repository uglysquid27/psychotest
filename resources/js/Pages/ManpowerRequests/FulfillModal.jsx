import React, { useState } from "react";

const FulfillModal = ({
  open,
  onClose,
  strategy,
  setStrategy,
  onConfirm,
  loading,
  selectedRequests
}) => {
  // Local state for animation
  const [isClosing, setIsClosing] = useState(false);
  
  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };
  
  if (!open && !isClosing) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Fulfill Requests</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="selected-count">
            You have selected <b>{selectedRequests.length}</b> requests to fulfill.
          </p>

          <div className="strategy-selector">
            <label className="selector-label">
              Fulfillment Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="strategy-dropdown"
            >
              <option value="optimal">Optimal</option>
              <option value="same_section">Same Section First</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              "Confirm Fulfill"
            )}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .modal-overlay.closing {
          opacity: 0;
        }
        
        .modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transform: scale(1);
          transition: transform 0.3s ease;
        }
        
        .modal-overlay.closing .modal-content {
          transform: scale(0.9);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        
        .close-button:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .modal-body {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
        }
        
        .selected-count {
          margin: 0 0 1.5rem;
          color: #4b5563;
          line-height: 1.5;
        }
        
        .strategy-selector {
          margin-bottom: 1rem;
        }
        
        .selector-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        
        .strategy-dropdown {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          color: #374151;
          background-color: white;
          transition: border-color 0.2s;
        }
        
        .strategy-dropdown:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-outline {
          background-color: white;
          border-color: #d1d5db;
          color: #374151;
        }
        
        .btn-outline:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          margin-right: 0.5rem;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FulfillModal;