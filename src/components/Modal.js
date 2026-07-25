'use client';

export default function Modal({ isOpen, onClose, title, children, disableOutsideClick = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={!disableOutsideClick ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
