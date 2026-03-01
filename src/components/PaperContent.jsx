import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PaperContent = ({ paper, isLocked, isDraggingTopPaper, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef(null);

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Place cursor at end
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [isEditing]);

    // Exit edit mode if paper becomes locked (AI response incoming)
    useEffect(() => {
        if (isLocked) setIsEditing(false);
    }, [isLocked]);

    const handleViewClick = useCallback(() => {
        if (!isLocked) setIsEditing(true);
    }, [isLocked]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (isLocked) { e.preventDefault(); return; }
        // Tab inserts spaces instead of jumping focus
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = textareaRef.current;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
            onChange(newVal);
            requestAnimationFrame(() => {
                ta.selectionStart = ta.selectionEnd = start + 4;
            });
        }
    }, [isLocked, onChange]);

    // Empty state — show placeholder as rendered view
    const isEmpty = !paper.content || paper.content.trim() === '';

    if (isEditing && !isLocked) {
        return (
            <textarea
                ref={textareaRef}
                className="paper-textarea writing-font w-full"
                value={paper.content}
                placeholder="Start writing..."
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onChange={(e) => onChange(e.target.value)}
                style={{ cursor: 'text' }}
            />
        );
    }

    return (
        <div
            className="paper-markdown writing-font w-full"
            onClick={handleViewClick}
            style={{ cursor: isLocked ? 'default' : 'text' }}
        >
            {isEmpty ? (
                <span className="paper-markdown-placeholder">
                    {isLocked ? '' : 'Start writing...'}
                </span>
            ) : (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Headings
                        h1: ({ children }) => <h1 className="pm-h1">{children}</h1>,
                        h2: ({ children }) => <h2 className="pm-h2">{children}</h2>,
                        h3: ({ children }) => <h3 className="pm-h3">{children}</h3>,
                        h4: ({ children }) => <h4 className="pm-h4">{children}</h4>,
                        // Paragraph
                        p: ({ children }) => <p className="pm-p">{children}</p>,
                        // Bold / italic
                        strong: ({ children }) => <strong className="pm-strong">{children}</strong>,
                        em: ({ children }) => <em className="pm-em">{children}</em>,
                        // Horizontal rule (used as chain divider)
                        hr: () => <hr className="pm-hr" />,
                        // Blockquote
                        blockquote: ({ children }) => <blockquote className="pm-blockquote">{children}</blockquote>,
                        // Inline code
                        code: ({ inline, children }) =>
                            inline
                                ? <code className="pm-code-inline">{children}</code>
                                : <pre className="pm-code-block"><code>{children}</code></pre>,
                        // Lists
                        ul: ({ children }) => <ul className="pm-ul">{children}</ul>,
                        ol: ({ children }) => <ol className="pm-ol">{children}</ol>,
                        li: ({ children }) => <li className="pm-li">{children}</li>,
                        // Links
                        a: ({ href, children }) => (
                            <a href={href} className="pm-link" target="_blank" rel="noreferrer">{children}</a>
                        ),
                    }}
                >
                    {paper.content}
                </ReactMarkdown>
            )}
        </div>
    );
};

export default PaperContent;