import { useState, useRef, useCallback } from "react";

const AddFolderTab = ({ onAdd }) => {
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const duration = 500;

    const updateProgress = useCallback(() => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min(100, (elapsed / duration) * 100);
        setProgress(newProgress);
        if (newProgress >= 100) { stopHold(); onAdd(); }
    }, [onAdd]);

    const startHold = () => {
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(updateProgress, 20);
    };
    const stopHold = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        startTimeRef.current = null;
        setProgress(0);
    };

    return (
        <div className="add-folder-tab"
            onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}>
            <div className="add-folder-rail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            </div>
            <div className="add-folder-content">
                <div className="add-folder-progress" style={{ width: `${progress}%` }}></div>
                <span style={{ position: 'relative', zIndex: 1 }}>Hold to Add Folder</span>
            </div>
        </div>
    );
};

export default AddFolderTab;