import { useEffect, useRef } from 'react';

/**
 * iOS-style alert. Used instead of disabling a button: the control stays live
 * and, when something is missing, says which thing — a greyed-out button makes
 * you guess.
 */
export default function Alert({ message, onClose }) {
  const actionRef = useRef(null);

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="alert-backdrop" onPointerDown={onClose}>
      <div
        className="alert"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="alert-message">{message}</p>
        <button ref={actionRef} type="button" className="alert-action" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
