
import React, { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [animatePanelIn, setAnimatePanelIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timerId = setTimeout(() => {
        setAnimatePanelIn(true);
      }, 10); 
      return () => clearTimeout(timerId);
    } else {
      setAnimatePanelIn(false);
    }
  }, [isOpen]);

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);


  if (!isOpen) {
    return null; 
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-id" // Use a unique ID for aria-labelledby
    >
      <div 
        className={`bg-white dark:bg-dark-secondary rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out 
                    ${animatePanelIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title-id" className="text-xl font-semibold text-gray-800 dark:text-dark-text">{title}</h2> {/* Add id attribute */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-text focus:outline-none text-2xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
