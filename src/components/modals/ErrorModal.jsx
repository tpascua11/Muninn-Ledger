const ErrorModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="var(--danger)" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <h2 className="writing-font text-xl" style={{ color: 'var(--danger)' }}>
                            {title || 'Something went wrong'}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--scroll-text)' }}
                        className="hover:opacity-70 text-xl font-bold">&times;</button>
                </div>
                <div className="modal-body">
                    <p style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: '1rem',
                        color: 'var(--scroll-text)',
                        lineHeight: 1.6,
                    }}>
                        {message}
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn-leather px-4 py-2 rounded text-sm" onClick={onClose}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;
