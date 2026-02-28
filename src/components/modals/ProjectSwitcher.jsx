import { useState, useRef, useEffect } from "react";
import { createDefaultProject } from "../../lib/project";

const ProjectSwitcherModal = ({ isOpen, onClose, projects, activeProjectId, onSelect, onUpdateProjects }) => {
    const inputRef = useRef(null);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { if (editingId && inputRef.current) inputRef.current.focus(); }, [editingId]);

    if (!isOpen) return null;

    const handleNameChange = (id, newTitle) => {
        onUpdateProjects(prev => prev.map(p => p.id === id ? {...p, title: newTitle} : p));
    };
    const handleCreate = () => {
        const newProj = createDefaultProject();
        setEditingId(newProj.id);
        onUpdateProjects(prev => [...prev, newProj]);
        onSelect(newProj.id);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="writing-font text-xl" style={{color: 'var(--scroll-text)'}}>Projects</h2>
                    <button onClick={onClose} style={{color: 'var(--scroll-text)'}}
                        className="hover:opacity-70 text-xl font-bold">&times;</button>
                </div>
                <div className="modal-body custom-scrollbar p-0">
                    {projects.map(proj => (
                        <div key={proj.id} className={`project-item ${proj.id === activeProjectId ? 'active' : ''}`}>
                            <div className="flex-1 min-w-0">
                                {editingId === proj.id
                                    ? <input ref={inputRef} className="project-name-input"
                                        value={proj.title}
                                        onChange={(e) => handleNameChange(proj.id, e.target.value)}
                                        onBlur={() => setEditingId(null)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null); }}/>
                                    : <span className="project-name text-sm">{proj.title}</span>
                                }
                            </div>
                            <div className="flex items-center gap-2">
                                {editingId !== proj.id && (
                                    <div className="edit-icon-btn"
                                        onClick={(e) => { e.stopPropagation(); setEditingId(proj.id); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" strokeWidth="2">
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                                        </svg>
                                    </div>
                                )}
                                {proj.id !== activeProjectId && editingId !== proj.id && (
                                    <button className="text-xs text-gray-500 hover:text-amber-800 border border-gray-200 hover:border-amber-300 rounded px-2 py-1"
                                        onClick={(e) => { e.stopPropagation(); onSelect(proj.id); }}>
                                        Open
                                    </button>
                                )}
                                {proj.id === activeProjectId && (
                                    <span className="text-xs text-green-600 font-medium px-2 py-1">Active</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn-leather px-4 py-2 rounded text-sm" onClick={handleCreate}>
                        New Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSwitcherModal;