import { useState } from "react";
import AddFolderTab from "./AddFolderTab";

const SidebarDesk = ({
  title, deskType, folders, archive, trash,
  dropTarget, dragState,
  onCreateFolder, onRenameFolder, onRenamePaper,
  onDragPaper, onDragFolder, onToggleContext,
  inactiveFolderIds, onToggleFolderActive,
  onOpenTrashModal, onOpenArchiveModal,
  hasTrash, hasArchive,
  onTitleClick, isProjectHeader,
  onExportData, onImportData
}) => {
  const [expandedMap, setExpandedMap] = useState({});
  const toggleExpand = (id) =>
    setExpandedMap(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  const isDropTarget = dropTarget && dropTarget.append && dropTarget.deskType === deskType;

  return (
    <div
      data-sidebar-type={deskType}
      className={`w-1/5 h-full sidebar-wood flex flex-col border-l border-amber-900/50 relative ${isDropTarget ? 'sidebar-drop-target' : ''}`}
    >
      {/* Header */}
      <div className="sidebar-header-container">
        {isProjectHeader ? (
          <div className="project-plaque" onClick={onTitleClick}>
            <span className="plaque-title">{title}</span>
            <div className="plaque-icon-group">
              <span className="plaque-hint">Projects</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="template-bar">
            <button className="template-btn" title="Export all projects" onClick={onExportData}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button className="template-btn" title="Import projects" onClick={onImportData}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            <button className="template-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/>
                <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                <line x1="8.12" y1="8.12" x2="12" y2="12"/>
              </svg>
            </button>
            <button className="template-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 3h14v2H5z"/>
                <path d="M5 19h14v2H5z"/>
                <path d="M6 5l6 7-6 7h12l-6-7 6-7z"/>
              </svg>
            </button>
            <button className="template-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {folders.map(folder => {
          const isExpanded = expandedMap[folder.id] !== false;
          const isFolderActive = !inactiveFolderIds.has(folder.id);
          return (
            <div
              key={folder.id}
              data-folder-id={folder.id}
              data-desk-type={deskType}
              className={`folder transition-all duration-200
                ${dropTarget && dropTarget.folderId === folder.id ? 'drag-over' : ''}
                ${dragState?.type === 'folder' && dragState.folder.id === folder.id ? 'dragging-folder' : ''}
                ${!isFolderActive ? 'is-inactive' : ''}`}
            >
              {/* Drag rail */}
              <div
                className="folder-rail"
                onMouseDown={(e) => onDragFolder(e, folder, deskType)}
              >
                <div className="rail-grip">
                  <span/><span/><span/>
                </div>
              </div>

              <div className="flex-1 p-2 min-w-0">
                {/* Folder header */}
                <div className="flex items-center justify-between mb-1">
                  <input
                    value={folder.name}
                    onChange={(e) => onRenameFolder(deskType, folder.id, e.target.value)}
                    className="bg-transparent border-none outline-none text-amber-900 font-bold text-xs w-full cursor-text"
                    style={{ borderBottom: '2px solid rgba(120, 60, 20, 0.3)', width: '60%' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="folder-header-controls">
                    {/* Power toggle */}
                    <div
                      className={`activate-toggle ${isFolderActive ? 'is-active' : 'is-inactive'}`}
                      onClick={(e) => { e.stopPropagation(); onToggleFolderActive(folder.id); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                        <line x1="12" y1="2" x2="12" y2="12"/>
                      </svg>
                    </div>
                    {/* Collapse toggle */}
                    <div className="collapse-toggle" onClick={() => toggleExpand(folder.id)}>
                      <svg
                        className={`collapse-icon ${isExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <span className="count-label">{folder.papers.length}</span>
                    </div>
                  </div>
                </div>

                {/* Papers list */}
                <div className={`folder-content space-y-1 ${isExpanded ? '' : 'collapsed'}`}>
                  {folder.papers.map(paper => (
                    <div
                      key={paper.id}
                      data-paper-id={paper.id}
                      data-folder-id={folder.id}
                      data-desk-type={deskType}
                      className={`paper-item group
                        ${dropTarget && dropTarget.type === 'paper' && dropTarget.id === paper.id ? 'drop-target' : ''}
                        ${paper.inContext === false ? 'is-excluded' : ''}`}
                    >
                      <div
                        className="paper-item-grip"
                        onMouseDown={(e) => onDragPaper(e, paper, { type: 'sidebar', deskType, folderId: folder.id })}
                      >
                        <div className="mini-grip"/>
                      </div>
                      <div className="paper-item-content">
                        <input
                          type="text"
                          className="paper-name-input"
                          value={paper.subject}
                          onChange={(e) => onRenamePaper(deskType, folder.id, paper.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          className={`context-toggle ${paper.inContext !== false ? 'is-active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); onToggleContext(deskType, folder.id, paper.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                  {folder.papers.length === 0 && (
                    <div className="text-amber-800/40 text-center py-1 text-[10px]">Empty</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <AddFolderTab onAdd={onCreateFolder} />
      </div>

      {/* Archive bin */}
      {hasArchive && (
        <div
          data-archive-id={deskType}
          className={`bottom-bin archive-bin ${dropTarget && dropTarget.archive && dropTarget.deskType === deskType ? 'drag-over' : ''}`}
          onClick={onOpenArchiveModal}
        >
          <div className="flex items-center gap-2">
            <svg className="bin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="4" width="22" height="4"/>
            </svg>
            <span className="bin-label">Archive ({archive.length})</span>
          </div>
          <svg className="w-4 h-4 text-amber-100/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      )}

      {/* Trash bin */}
      {hasTrash && (
        <div
          data-trash-id={deskType}
          className={`bottom-bin trash-bin ${dropTarget && dropTarget.trash && dropTarget.deskType === deskType ? 'drag-over' : ''}`}
          onClick={onOpenTrashModal}
        >
          <div className="flex items-center gap-2">
            <svg className="bin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span className="bin-label">Trash ({trash.length})</span>
          </div>
          <svg className="w-4 h-4 text-amber-100/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default SidebarDesk;
