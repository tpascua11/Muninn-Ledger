import { useState, useRef, useCallback } from "react";

const DangerHoldButton = ({ onConfirm, duration = 1000, children }) => {
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);

    const updateProgress = useCallback(() => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min(100, (elapsed / duration) * 100);
        setProgress(newProgress);
        if (newProgress >= 100) { stopHold(); onConfirm(); }
    }, [onConfirm, duration]);

    const startHold = () => {
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(updateProgress, 30);
    };
    const stopHold = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        startTimeRef.current = null;
        setProgress(0);
    };

    return (
        <button className="action-btn danger-btn"
            onMouseDown={startHold} onMouseUp={stopHold}
            onMouseLeave={stopHold} onTouchStart={startHold} onTouchEnd={stopHold}>
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <span>{children}</span>
        </button>
    );
};

export default DangerHoldButton;