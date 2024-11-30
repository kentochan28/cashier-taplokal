import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 top-0 left-0 w-full bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-lg shadow-xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800">Confirm Reset</h2>
        <p className="mt-4 text-lg text-gray-600">
          Are you sure you want to go back to the initial page? This will reset everything in your cart.
        </p>
        
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg text-lg"
          >
            Yes, Reset
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-300 text-white font-bold py-2 px-6 rounded-lg text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
