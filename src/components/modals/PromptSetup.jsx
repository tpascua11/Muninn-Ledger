const PromptSetupModal = ({ isOpen, onClose, apiKey, onApiKeyChange, systemPrompt, onSystemPromptChange, temperature, onTemperatureChange }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content wide" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="writing-font text-xl" style={{color: 'var(--scroll-text)'}}>Prompt Configuration</h2>
                    <button onClick={onClose} style={{color: 'var(--scroll-text)'}}
                        className="hover:opacity-70 text-xl font-bold">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">API Key</label>
                        <input type="password" className="form-input"
                            placeholder="Enter your API key..."
                            value={apiKey} onChange={(e) => onApiKeyChange(e.target.value)} />
                        <div className="text-xs mt-1" style={{color: 'rgba(62,50,40,0.4)'}}>
                            Never saved to disk — session only.
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">System Instructions</label>
                        <textarea className="form-input" rows={4}
                            placeholder="You are a helpful AI writing assistant..."
                            value={systemPrompt} onChange={(e) => onSystemPromptChange(e.target.value)}>
                        </textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="form-group">
                            <label className="form-label">Temperature: {temperature.toFixed(1)}</label>
                            <input type="range" min="0" max="2" step="0.1"
                                value={temperature}
                                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                                className="form-slider"/>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Precise</span><span>Creative</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Model</label>
                            <select className="form-input">
                                <option value="glm-5">glm-5</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-leather px-4 py-2 rounded text-sm" onClick={onClose}>
                        Save Setup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptSetupModal;