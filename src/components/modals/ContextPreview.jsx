import { buildContextMessages } from "../../lib/ai";

const ContextPreviewModal = ({ isOpen, onClose, project, systemPrompt, promptText }) => {
    if (!isOpen || !project) return null;
    const { contextPapers } = buildContextMessages(project, systemPrompt, promptText);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content wide" style={{maxHeight: '88vh'}} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="writing-font text-xl" style={{color: 'var(--scroll-text)'}}>Context Preview</h2>
                    <button onClick={onClose} style={{color: 'var(--scroll-text)'}}
                        className="hover:opacity-70 text-xl font-bold">&times;</button>
                </div>
                <div className="modal-body custom-scrollbar">
                    <div className="context-section-title">System Prompt</div>
                    <div className="context-block">
                        <div className="context-block-header">
                            <span className="context-block-label">Instructions</span>
                            <span className="context-block-tag tag-system">system</span>
                        </div>
                        <div className="context-block-body">
                            {systemPrompt || <span style={{opacity:0.4}}>No system prompt set.</span>}
                        </div>
                    </div>
                    <div className="context-section-title">Reference Documents ({contextPapers.length})</div>
                    {contextPapers.length === 0
                        ? <div className="context-empty">No active papers in context.</div>
                        : contextPapers.map((p, i) => (
                            <div key={i} className="context-block">
                                <div className="context-block-header">
                                    <span className="context-block-label">{p.subject}</span>
                                    <span className="context-block-tag tag-paper">paper</span>
                                </div>
                                <div className="context-block-body">
                                    {p.content || <span style={{opacity:0.4}}>Empty paper.</span>}
                                </div>
                            </div>
                        ))
                    }
                    <div className="context-section-title">User Message</div>
                    <div className="context-block">
                        <div className="context-block-header">
                            <span className="context-block-label">Prompt</span>
                            <span className="context-block-tag tag-user">user</span>
                        </div>
                        <div className="context-block-body tall">
                            {promptText || <span style={{opacity:0.4}}>Nothing typed yet.</span>}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <span className="text-xs" style={{color:'rgba(62,50,40,0.4)'}}>
                        {contextPapers.length} paper{contextPapers.length !== 1 ? 's' : ''} in context
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ContextPreviewModal;