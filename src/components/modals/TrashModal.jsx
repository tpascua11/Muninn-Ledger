import DangerHoldButton from "../DangerHoldButton";

const TrashModal = ({ isOpen, onClose, items, onRestore, onDelete, onDeleteAll }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="writing-font text-xl" style={{color: 'var(--scroll-text)'}}>Trash Bin</h2>
                    <button onClick={onClose} style={{color: 'var(--scroll-text)'}}
                        className="hover:opacity-70 text-xl font-bold">&times;</button>
                </div>
                <div className="modal-body custom-scrollbar">
                    {items.length === 0
                        ? <div className="empty-trash-msg">The trash bin is empty.</div>
                        : items.map(item => (
                            <div key={item.id || item.deletedAt} className="trash-item-row">
                                <div className="item-info">
                                    <div className="item-icon">
                                        {item.type === 'folder'
                                            ? <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                            : <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        }
                                    </div>
                                    <span className="item-name">{item.type === 'folder' ? item.name : (item.subject || 'Untitled')}</span>
                                </div>
                                <div className="item-actions">
                                    <button className="action-btn restore-btn" onClick={() => onRestore(item)}>
                                        <span>Restore</span>
                                    </button>
                                    <DangerHoldButton onConfirm={() => onDelete(item)}
                                        duration={item.type === 'folder' ? 1500 : 1000}>
                                        Delete
                                    </DangerHoldButton>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className="modal-footer">
                    <DangerHoldButton onConfirm={onDeleteAll} duration={1500}>Delete All</DangerHoldButton>
                </div>
            </div>
        </div>
    );
};

export default TrashModal;