import { useEffect, useRef } from "react";

type LogoutModalProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when modal opens (safe default)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-modal-in">

        {/* Decorative top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

        <div className="px-7 py-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-red-50 dark:bg-red-500/10">
            <svg
              className="w-7 h-7 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 17L21 12M21 12L16 7M21 12H9M9 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Title */}
          <h2
            id="logout-modal-title"
            className="text-center text-xl font-semibold text-gray-900 dark:text-white mb-2"
          >
            Sign out of MosIC?
          </h2>

          {/* Body */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            You'll be returned to the login screen. Any unsaved work will remain
            intact when you sign back in.
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="flex-1 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              Stay signed in
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Yes, sign out
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default LogoutModal;
