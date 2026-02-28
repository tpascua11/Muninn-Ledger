import './App.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import { generateId, createDefaultProject } from './lib/project';
import { saveProjectToDB, loadAllProjects, saveSetting, loadSetting } from './lib/db';
import { buildContextMessages, splitOnLastDivider } from './lib/ai';
import SidebarDesk from './components/SidebarDesk';
import TrashModal from './components/modals/TrashModal';
import ArchiveModal from './components/modals/ArchiveModal';
import ProjectSwitcherModal from './components/modals/ProjectSwitcher';
import PromptSetupModal from './components/modals/PromptSetup';
import ContextPreviewModal from './components/modals/ContextPreview';
import MailAnimation from './components/MailAnimation';
import ErrorModal from './components/modals/ErrorModal';

const WritersDesk = () => {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState(null);
  const [trashModal, setTrashModal] = useState({ open: false, deskType: null });
  const [archiveModal, setArchiveModal] = useState({ open: false, deskType: null });
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);
  const [promptSetupOpen, setPromptSetupOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('clean');
  const [apiKey, setApiKey] = useState('');
  const [loadingPaperIds, setLoadingPaperIds] = useState(new Set());
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });

  const saveTimerRef = useRef(null);
  const mainAreaRef = useRef(null);
  const promptInputRef = useRef(null);
  const projectsRef = useRef(projects);
  const activeProjectIdRef = useRef(activeProjectId);
  const mailRef = useRef(null);
  const promptBarRef = useRef(null);

  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

  // ── Boot: load from DB ──────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      try {
        let loaded = await loadAllProjects();
        let savedActiveId = await loadSetting('activeProjectId');
        if (loaded.length === 0) {
          const def = createDefaultProject('My First Desk');
          await saveProjectToDB(def);
          loaded = [def];
          savedActiveId = def.id;
          await saveSetting('activeProjectId', def.id);
        }
        setProjects(loaded);
        setActiveProjectId(savedActiveId || loaded[0].id);
      } catch (err) {
        console.error('DB boot error:', err);
        const def = createDefaultProject('My First Desk');
        setProjects([def]);
        setActiveProjectId(def.id);
      }
      setDbReady(true);
    };
    boot();
  }, []);

  // ── Dirty / Save ────────────────────────────────────────────────────────────
  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const immediateSave = useCallback((updatedProjects, activeId) => {
    const project = updatedProjects.find(p => p.id === activeId);
    if (project) saveProjectToDB(project).catch(console.error);
  }, []);

  const handleSave = useCallback(() => {
    const currentProjects = projectsRef.current;
    const currentActiveId = activeProjectIdRef.current;
    const updated = currentProjects.map(p => {
      if (p.id !== currentActiveId) return p;
      const stack = [...p.mainStack];
      const idx = stack.length - 1;
      if (idx < 0) return p;
      const paper = stack[idx];
      const versions = paper.versions || [];
      const newVersion = {
        versionNumber: versions.length + 1,
        subject: paper.subject,
        content: paper.content,
        savedAt: Date.now(),
      };
      stack[idx] = { ...paper, versions: [...versions, newVersion] };
      return { ...p, mainStack: stack };
    });
    setProjects(updated);
    projectsRef.current = updated;
    const project = updated.find(p => p.id === currentActiveId);
    if (project) saveProjectToDB(project).catch(console.error);
    setIsDirty(false);
    setSaveStatus('saved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('clean'), 2000);
  }, []);

  // Ctrl+S shortcut
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // ── Version loading ─────────────────────────────────────────────────────────
  const loadVersion = (paperId, versionNumber) => {
    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id !== activeProjectId) return p;
        const stack = p.mainStack.map(paper => {
          if (paper.id !== paperId) return paper;
          const version = (paper.versions || []).find(v => v.versionNumber === versionNumber);
          if (!version) return paper;
          return { ...paper, subject: version.subject, content: version.content };
        });
        return { ...p, mainStack: stack };
      });
      immediateSave(next, activeProjectId);
      return next;
    });
    markDirty();
  };

  // ── Project helpers ─────────────────────────────────────────────────────────
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const updateActiveProject = (updater, skipSave = false) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === activeProjectId ? updater(p) : p);
      if (!skipSave) immediateSave(next, activeProjectId);
      return next;
    });
  };

  const switchProject = (id) => {
    setActiveProjectId(id);
    saveSetting('activeProjectId', id).catch(console.error);
  };

  // ── AI settings ─────────────────────────────────────────────────────────────
  const defaultAiSettings = {
    systemPrompt: 'You are a helpful AI writing assistant. Help the user write, edit, and improve their work.',
    temperature: 0.7,
    maxTokens: 131072
  };
  const aiSettings = (activeProject && activeProject.aiSettings)
    ? activeProject.aiSettings
    : defaultAiSettings;
  const systemPrompt = aiSettings.systemPrompt;
  const temperature = aiSettings.temperature;
  const maxTokens = aiSettings.maxTokens;

  const updateAiSettings = (patch) => {
    updateActiveProject(p => ({
      ...p,
      aiSettings: { ...defaultAiSettings, ...(p.aiSettings || {}), ...patch }
    }));
  };

  // Auto-resize prompt textarea
  useEffect(() => {
    if (promptInputRef.current) {
      promptInputRef.current.style.height = 'auto';
      promptInputRef.current.style.height = `${promptInputRef.current.scrollHeight}px`;
    }
  }, [promptText]);

  // ── API call ────────────────────────────────────────────────────────────────
  const callApi = useCallback(async () => {
    if (!promptText.trim()) return;
    if (!apiKey.trim()) {
      alert('Please set your API key in Prompt Configuration.');
      return;
    }
    const currentProject = projectsRef.current.find(p => p.id === activeProjectIdRef.current);
    if (!currentProject || currentProject.mainStack.length === 0) return;

    const targetPaperId = currentProject.mainStack[currentProject.mainStack.length - 1].id;
    if (loadingPaperIds.has(targetPaperId)) return;

    const userMessage = promptText.trim();
    setPromptText('');
    setLoadingPaperIds(prev => new Set([...prev, targetPaperId]));
    mailRef.current?.sendMail();

    const { messages } = buildContextMessages(currentProject, systemPrompt, userMessage);

    try {
      const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-5',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        }),
      });
      const responseText = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${responseText}`);
      const data = JSON.parse(responseText);
      const assistantResponse = data.choices?.[0]?.message?.content;
      if (!assistantResponse) throw new Error('Unexpected response format.');

      setProjects(prev => {
        const next = prev.map(p => {
          if (p.id !== activeProjectIdRef.current) return p;
          const stack = p.mainStack.map(paper => {
            if (paper.id !== targetPaperId) return paper;
            const versions = paper.versions || [];
            const newVersion = {
              versionNumber: versions.length + 1,
              subject: paper.subject,
              content: assistantResponse,
              savedAt: Date.now()
            };
            return { ...paper, content: assistantResponse, versions: [...versions, newVersion] };
          });
          return { ...p, mainStack: stack };
        });
        immediateSave(next, activeProjectIdRef.current);
        return next;
      });

      mailRef.current?.receiveMail();
      setSaveStatus('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('clean'), 2000);
      setIsDirty(false);
    } catch (e) {
      console.error('API Error:', e);
      handleApiError(e);
    } finally {
      setLoadingPaperIds(prev => {
        const next = new Set(prev);
        next.delete(targetPaperId);
        return next;
      });
    }
  }, [promptText, apiKey, systemPrompt, temperature, maxTokens, loadingPaperIds, immediateSave]);

  // ── Chain API call (append mode) ────────────────────────────────────────────
  const callApiChain = useCallback(async () => {
    if (!promptText.trim()) return;
    if (!apiKey.trim()) {
      alert('Please set your API key in Prompt Configuration.');
      return;
    }
    const currentProject = projectsRef.current.find(p => p.id === activeProjectIdRef.current);
    if (!currentProject || currentProject.mainStack.length === 0) return;

    const targetPaper = currentProject.mainStack[currentProject.mainStack.length - 1];
    if (!targetPaper.content?.trim()) return;
    if (loadingPaperIds.has(targetPaper.id)) return;

    const userMessage = promptText.trim();
    setPromptText('');
    setLoadingPaperIds(prev => new Set([...prev, targetPaper.id]));
    mailRef.current?.sendMail();

    const { seed } = splitOnLastDivider(targetPaper.content);
    const { messages } = buildContextMessages(currentProject, systemPrompt, userMessage, seed);

    try {
      const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-5',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        }),
      });
      const responseText = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${responseText}`);
      const data = JSON.parse(responseText);
      const assistantResponse = data.choices?.[0]?.message?.content;
      if (!assistantResponse) throw new Error('Unexpected response format.');

      setProjects(prev => {
        const next = prev.map(p => {
          if (p.id !== activeProjectIdRef.current) return p;
          const stack = p.mainStack.map(paper => {
            if (paper.id !== targetPaper.id) return paper;
            const newContent = paper.content + '\n\n---\n\n' + assistantResponse;
            const versions = paper.versions || [];
            const newVersion = {
              versionNumber: versions.length + 1,
              subject: paper.subject,
              content: newContent,
              savedAt: Date.now()
            };
            return { ...paper, content: newContent, versions: [...versions, newVersion] };
          });
          return { ...p, mainStack: stack };
        });
        immediateSave(next, activeProjectIdRef.current);
        return next;
      });

      mailRef.current?.receiveMail();
      setSaveStatus('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('clean'), 2000);
      setIsDirty(false);
    } catch (e) {
      console.error('API Chain Error:', e);
      handleApiError(e);
    } finally {
      setLoadingPaperIds(prev => {
        const next = new Set(prev);
        next.delete(targetPaper.id);
        return next;
      });
    }
  }, [promptText, apiKey, systemPrompt, temperature, maxTokens, loadingPaperIds, immediateSave]);

  // ── Clear + Rewrite API call ─────────────────────────────────────────────────
  const callApiClearRewrite = useCallback(async () => {
    if (!promptText.trim()) return;
    if (!apiKey.trim()) {
      alert('Please set your API key in Prompt Configuration.');
      return;
    }
    const currentProject = projectsRef.current.find(p => p.id === activeProjectIdRef.current);
    if (!currentProject || currentProject.mainStack.length === 0) return;

    const targetPaper = currentProject.mainStack[currentProject.mainStack.length - 1];
    if (!targetPaper.content?.trim()) return;
    if (loadingPaperIds.has(targetPaper.id)) return;

    const userMessage = promptText.trim();
    setPromptText('');
    setLoadingPaperIds(prev => new Set([...prev, targetPaper.id]));
    mailRef.current?.sendMail();

    const { seed } = splitOnLastDivider(targetPaper.content);
    const { messages } = buildContextMessages(currentProject, systemPrompt, userMessage, seed);

    try {
      const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-5',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        }),
      });
      const responseText = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${responseText}`);
      const data = JSON.parse(responseText);
      const assistantResponse = data.choices?.[0]?.message?.content;
      if (!assistantResponse) throw new Error('Unexpected response format.');

      setProjects(prev => {
        const next = prev.map(p => {
          if (p.id !== activeProjectIdRef.current) return p;
          const stack = p.mainStack.map(paper => {
            if (paper.id !== targetPaper.id) return paper;
            const versions = paper.versions || [];
            const newVersion = {
              versionNumber: versions.length + 1,
              subject: paper.subject,
              content: assistantResponse,
              savedAt: Date.now()
            };
            return { ...paper, content: assistantResponse, versions: [...versions, newVersion] };
          });
          return { ...p, mainStack: stack };
        });
        immediateSave(next, activeProjectIdRef.current);
        return next;
      });

      mailRef.current?.receiveMail();
      setSaveStatus('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('clean'), 2000);
      setIsDirty(false);
    } catch (e) {
      console.error('API Clear+Rewrite Error:', e);
      handleApiError(e);
    } finally {
      setLoadingPaperIds(prev => {
        const next = new Set(prev);
        next.delete(targetPaper.id);
        return next;
      });
    }
  }, [promptText, apiKey, systemPrompt, temperature, maxTokens, loadingPaperIds, immediateSave]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    const mainRect = mainAreaRef.current?.getBoundingClientRect();
    let foundTarget = null;

    if (mainRect && dragState.type === 'paper' && dragState.source.type === 'sidebar') {
      if (e.clientX >= mainRect.left && e.clientX <= mainRect.right &&
          e.clientY >= mainRect.top && e.clientY <= mainRect.bottom) {
        foundTarget = 'main';
      }
    }
    if (!foundTarget) {
      document.querySelectorAll('[data-trash-id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom)
          foundTarget = { trash: true, deskType: el.dataset.trashId };
      });
    }
    if (!foundTarget) {
      document.querySelectorAll('[data-archive-id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom)
          foundTarget = { archive: true, deskType: el.dataset.archiveId };
      });
    }
    if (!foundTarget && dragState.type === 'paper') {
      document.querySelectorAll('[data-paper-id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          if (el.dataset.paperId !== dragState.paper.id)
            foundTarget = { type: 'paper', id: el.dataset.paperId, folderId: el.dataset.folderId, deskType: el.dataset.deskType };
        }
      });
    }
    if (!foundTarget) {
      document.querySelectorAll('[data-folder-id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom)
          foundTarget = { deskType: el.dataset.deskType, folderId: el.dataset.folderId };
      });
    }
    if (!foundTarget && dragState.type === 'folder') {
      document.querySelectorAll('[data-sidebar-type]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom)
          foundTarget = { deskType: el.dataset.sidebarType, append: true };
      });
    }
    setDropTarget(foundTarget);
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;
    const { paper, folder, source, type } = dragState;

    updateActiveProject(prev => {
      let newState = JSON.parse(JSON.stringify(prev));
      const getFolders = (desk) =>
        desk === 'left' ? newState.leftDesk.folders : newState.rightDesk.folders;

      if (type === 'paper') {
        if (dropTarget && dropTarget.type === 'paper') {
          const targetFolder = getFolders(dropTarget.deskType).find(f => f.id === dropTarget.folderId);
          if (targetFolder) {
            if (source.type === 'stack') newState.mainStack = newState.mainStack.filter(p => p.id !== paper.id);
            else if (source.type === 'sidebar') {
              const sf = getFolders(source.deskType).find(f => f.id === source.folderId);
              if (sf) sf.papers = sf.papers.filter(p => p.id !== paper.id);
            }
            let newPapers = [...targetFolder.papers];
            const idx = newPapers.findIndex(p => p.id === dropTarget.id);
            newPapers.splice(idx, 0, paper);
            targetFolder.papers = newPapers;
          }
        } else if (dropTarget === 'main') {
          if (source.type === 'sidebar') {
            const sf = getFolders(source.deskType).find(f => f.id === source.folderId);
            if (sf) sf.papers = sf.papers.filter(p => p.id !== paper.id);
          }
          newState.mainStack.push(paper);
        } else if (dropTarget && dropTarget.folderId) {
          if (source.type === 'stack') newState.mainStack = newState.mainStack.filter(p => p.id !== paper.id);
          else if (source.type === 'sidebar') {
            const sf = getFolders(source.deskType).find(f => f.id === source.folderId);
            if (sf) sf.papers = sf.papers.filter(p => p.id !== paper.id);
          }
          const tf = getFolders(dropTarget.deskType).find(f => f.id === dropTarget.folderId);
          if (tf) tf.papers.push(paper);
        } else if (dropTarget && dropTarget.trash) {
          if (source.type === 'stack') newState.mainStack = newState.mainStack.filter(p => p.id !== paper.id);
          else if (source.type === 'sidebar') {
            const sf = getFolders(source.deskType).find(f => f.id === source.folderId);
            if (sf) sf.papers = sf.papers.filter(p => p.id !== paper.id);
          }
          (dropTarget.deskType === 'left' ? newState.leftDesk.trash : newState.rightDesk.trash)
            .push({ ...paper, type: 'paper', deletedAt: Date.now() });
        } else if (dropTarget && dropTarget.archive) {
          if (source.type === 'stack') newState.mainStack = newState.mainStack.filter(p => p.id !== paper.id);
          else if (source.type === 'sidebar') {
            const sf = getFolders(source.deskType).find(f => f.id === source.folderId);
            if (sf) sf.papers = sf.papers.filter(p => p.id !== paper.id);
          }
          newState.leftDesk.archive.push({ ...paper, type: 'paper', archivedAt: Date.now() });
        }
      } else if (type === 'folder') {
        const sourceFolders = getFolders(source.deskType);
        const folderIdx = sourceFolders.findIndex(f => f.id === folder.id);
        if (folderIdx === -1) return prev;
        if (dropTarget && dropTarget.trash) {
          const [removed] = sourceFolders.splice(folderIdx, 1);
          (dropTarget.deskType === 'left' ? newState.leftDesk.trash : newState.rightDesk.trash)
            .push({ ...removed, type: 'folder', deletedAt: Date.now() });
        } else if (dropTarget && dropTarget.archive) {
          const [removed] = sourceFolders.splice(folderIdx, 1);
          newState.leftDesk.archive.push({ ...removed, type: 'folder', archivedAt: Date.now() });
        } else if (dropTarget && dropTarget.folderId) {
          const [removed] = sourceFolders.splice(folderIdx, 1);
          const targetFolders = getFolders(dropTarget.deskType);
          const targetIdx = targetFolders.findIndex(f => f.id === dropTarget.folderId);
          if (targetIdx !== -1) targetFolders.splice(targetIdx, 0, removed);
          else targetFolders.push(removed);
        } else if (dropTarget && dropTarget.append) {
          const [removed] = sourceFolders.splice(folderIdx, 1);
          getFolders(dropTarget.deskType).push(removed);
        }
      }
      return newState;
    });
    setDragState(null);
    setDropTarget(null);
  }, [dragState, dropTarget, activeProjectId]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDragPaper = (e, paper, source) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ type: 'paper', paper, source });
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const startDragFolder = (e, folder, deskType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ type: 'folder', folder, source: { type: 'sidebar', deskType } });
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // ── Paper/folder actions ────────────────────────────────────────────────────
  const focusPaper = (index) => {
    updateActiveProject(prev => {
      const stack = [...prev.mainStack];
      const [paper] = stack.splice(index, 1);
      stack.push(paper);
      return { ...prev, mainStack: stack };
    });
  };

  const addNewPaper = () => {
    updateActiveProject(prev => ({
      ...prev,
      mainStack: [...prev.mainStack, { id: generateId(), content: '', subject: 'Untitled', inContext: true }]
    }));
  };

  const createNewFolder = (deskType) => {
    updateActiveProject(prev => {
      const newFolder = { id: generateId(), name: 'New Folder', papers: [] };
      if (deskType === 'left')
        return { ...prev, leftDesk: { ...prev.leftDesk, folders: [...prev.leftDesk.folders, newFolder] } };
      return { ...prev, rightDesk: { ...prev.rightDesk, folders: [...prev.rightDesk.folders, newFolder] } };
    });
  };

  const renameFolder = (deskType, fid, name) => {
    updateActiveProject(prev => {
      const update = folders => folders.map(f => f.id === fid ? { ...f, name } : f);
      if (deskType === 'left') return { ...prev, leftDesk: { ...prev.leftDesk, folders: update(prev.leftDesk.folders) } };
      return { ...prev, rightDesk: { ...prev.rightDesk, folders: update(prev.rightDesk.folders) } };
    });
  };

  const renamePaper = (deskType, folderId, paperId, newSubject) => {
    updateActiveProject(prev => {
      const update = folders => folders.map(f => {
        if (f.id !== folderId) return f;
        return { ...f, papers: f.papers.map(p => p.id === paperId ? { ...p, subject: newSubject } : p) };
      });
      if (deskType === 'left') return { ...prev, leftDesk: { ...prev.leftDesk, folders: update(prev.leftDesk.folders) } };
      return { ...prev, rightDesk: { ...prev.rightDesk, folders: update(prev.rightDesk.folders) } };
    });
  };

  const togglePaperContext = (deskType, folderId, paperId) => {
    updateActiveProject(prev => {
      const update = folders => folders.map(f => {
        if (f.id !== folderId) return f;
        return { ...f, papers: f.papers.map(p => p.id === paperId ? { ...p, inContext: p.inContext === false ? true : false } : p) };
      });
      if (deskType === 'left') return { ...prev, leftDesk: { ...prev.leftDesk, folders: update(prev.leftDesk.folders) } };
      return { ...prev, rightDesk: { ...prev.rightDesk, folders: update(prev.rightDesk.folders) } };
    });
  };

  const toggleFolderActive = (folderId) => {
    updateActiveProject(prev => {
      const ids = new Set(prev.inactiveFolderIds);
      if (ids.has(folderId)) ids.delete(folderId);
      else ids.add(folderId);
      return { ...prev, inactiveFolderIds: Array.from(ids) };
    });
  };

  // ── Trash / Archive handlers ────────────────────────────────────────────────
  const handleRestoreTrashItem = (item) => {
    updateActiveProject(prev => {
      let newState = JSON.parse(JSON.stringify(prev));
      if (trashModal.deskType === 'left') newState.leftDesk.trash = newState.leftDesk.trash.filter(i => i.id !== item.id);
      else newState.rightDesk.trash = newState.rightDesk.trash.filter(i => i.id !== item.id);
      if (item.type === 'folder') {
        if (trashModal.deskType === 'left') newState.leftDesk.folders.push(item);
        else newState.rightDesk.folders.push(item);
      } else {
        newState.mainStack.push(item);
      }
      return newState;
    });
  };

  const handleRestoreArchiveItem = (item) => {
    updateActiveProject(prev => {
      let newState = JSON.parse(JSON.stringify(prev));
      newState.leftDesk.archive = newState.leftDesk.archive.filter(i => i.id !== item.id);
      if (item.type === 'folder') newState.leftDesk.folders.push(item);
      else newState.mainStack.push(item);
      return newState;
    });
  };

  const handleDeleteItem = (item) => {
    updateActiveProject(prev => {
      let newState = JSON.parse(JSON.stringify(prev));
      if (trashModal.deskType === 'left') newState.leftDesk.trash = newState.leftDesk.trash.filter(i => i.id !== item.id);
      else newState.rightDesk.trash = newState.rightDesk.trash.filter(i => i.id !== item.id);
      return newState;
    });
  };

  const handleDeleteAll = () => {
    updateActiveProject(prev => {
      let newState = JSON.parse(JSON.stringify(prev));
      if (trashModal.deskType === 'left') newState.leftDesk.trash = [];
      else newState.rightDesk.trash = [];
      return newState;
    });
  };

  // ── API Error Handler ───────────────────────────────────────────────────────
  const handleApiError = (e) => {
    let title = 'API Error';
    let message = 'An unexpected error occurred. Please try again.';
    const raw = e.message || '';

    if (raw.includes('401') || raw.includes('403') || raw.includes('Unauthorized') || raw.includes('Forbidden')) {
      title = 'Invalid API Key';
      message = 'Your API key was rejected. Check that it is correct in Prompt Configuration.';
    } else if (raw.includes('429') || raw.includes('Too Many Requests') || raw.includes('rate')) {
      title = 'Rate Limited';
      message = 'You have sent too many requests. Wait a moment and try again.';
    } else if (raw.includes('400') || raw.includes('context') || raw.includes('token') || raw.includes('length') || raw.includes('413')) {
      title = 'Context Too Large';
      message = 'Your context is too large for the model to process. Try excluding some papers from context, reducing the max token setting, or splitting your work across fewer active folders.';
    } else if (raw.includes('500') || raw.includes('502') || raw.includes('503') || raw.includes('504')) {
      title = 'Server Error';
      message = 'The API server encountered an error. This is likely temporary — please try again in a moment.';
    } else if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('network')) {
      title = 'Connection Failed';
      message = 'Could not reach the server. Check your internet connection and try again.';
    }

    setErrorModal({ open: true, title, message });
  };

  // ── Export / Import ─────────────────────────────────────────────────────────
  const handleExportData = () => {
    const data = { projects: projectsRef.current, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `writers-desk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.projects || !Array.isArray(data.projects))
          throw new Error('Invalid backup file.');
        if (!window.confirm(`This will replace ALL your current projects with ${data.projects.length} project(s) from the backup. Continue?`))
          return;
        for (const p of data.projects) await saveProjectToDB(p);
        setProjects(data.projects);
        const firstId = data.projects[0]?.id;
        if (firstId) {
          setActiveProjectId(firstId);
          await saveSetting('activeProjectId', firstId);
        }
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    input.click();
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (!dbReady || !activeProject) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: '#2c2416' }}>
        <div style={{ textAlign: 'center', color: 'rgba(244, 239, 215, 0.5)' }}>
          <div className="writing-font" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Opening the desk...</div>
          <div style={{ fontSize: '12px', opacity: 0.5 }}>Loading your work</div>
        </div>
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const topPaper = activeProject.mainStack[activeProject.mainStack.length - 1];
  const underlyingPaper = activeProject.mainStack.length > 1
    ? activeProject.mainStack[activeProject.mainStack.length - 2]
    : null;
  const isDraggingTopPaper =
    dragState && dragState.type === 'paper' &&
    dragState.source.type === 'stack' &&
    dragState.paper.id === topPaper?.id;
  const activeMainPaper = isDraggingTopPaper ? underlyingPaper : topPaper;
  const isStackEmpty = !activeMainPaper;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden relative">

      {/* LEFT SIDEBAR */}
      <SidebarDesk
        title={activeProject.title}
        deskType="left"
        folders={activeProject.leftDesk.folders}
        archive={activeProject.leftDesk.archive}
        trash={activeProject.leftDesk.trash}
        dropTarget={dropTarget}
        dragState={dragState}
        onCreateFolder={() => createNewFolder('left')}
        onRenameFolder={renameFolder}
        onRenamePaper={renamePaper}
        onDragPaper={startDragPaper}
        onDragFolder={startDragFolder}
        onToggleContext={togglePaperContext}
        inactiveFolderIds={new Set(activeProject.inactiveFolderIds)}
        onToggleFolderActive={toggleFolderActive}
        onOpenTrashModal={() => setTrashModal({ open: true, deskType: 'left' })}
        onOpenArchiveModal={() => setArchiveModal({ open: true, deskType: 'left' })}
        hasTrash={false}
        hasArchive={true}
        onTitleClick={() => setProjectSwitcherOpen(true)}
        isProjectHeader={true}
      />

      {/* MAIN DESK */}
      <div ref={mainAreaRef} className="w-3/5 h-full desk-surface flex flex-col p-4 pt-3">
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full gap-1">

          {/* Tab bar */}
          <div
            className={`flex-none w-full drop-zone-indicator rounded-t-lg ${dropTarget === 'main' ? 'active' : ''}`}
            style={{ minHeight: '30px' }}
          >
            <div
              className="flex items-end gap-1 px-2 pt-0 overflow-x-auto invisible-scrollbar"
              style={{ minHeight: '30px' }}
            >
              {[...activeProject.mainStack].reverse().map((paper, index) => {
                const isActive = index === 0;
                const isLocked = loadingPaperIds.has(paper.id);
                return (
                  <div
                    key={paper.id}
                    className={`stack-tab whitespace-nowrap font-medium ${isActive ? 'active' : ''}`}
                    style={isLocked ? { cursor: 'default', opacity: 0.7 } : {}}
                    onMouseDown={isLocked ? undefined : (e) => startDragPaper(e, paper, { type: 'stack' })}
                    onClick={() => focusPaper(activeProject.mainStack.length - 1 - index)}
                  >
                    {isLocked && <span style={{ marginRight: '4px', opacity: 0.6 }}>⏳</span>}
                    {paper.subject || 'Untitled'}
                  </div>
                );
              })}
              {activeProject.mainStack.length > 0 && (
                <div
                  className="stack-tab whitespace-nowrap font-medium"
                  style={{ opacity: 0.5, cursor: 'pointer', minWidth: '28px', textAlign: 'center' }}
                  onClick={addNewPaper}
                >+</div>
              )}
            </div>
          </div>

          {/* Paper area */}
          <div className="flex-1 w-full relative min-h-0">
            {isStackEmpty ? (
              <div className="w-full h-full empty-desk-placeholder flex items-center justify-center rounded-b-lg">
                <button className="new-paper-btn" onClick={addNewPaper}>
                  <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <span>New Paper</span>
                </button>
              </div>
            ) : (
              <div key={activeMainPaper.id} className={`paper-sheet w-full h-full relative ${isDraggingTopPaper ? 'revealed' : ''}`} style={loadingPaperIds.has(activeMainPaper.id) ? { filter: 'sepia(0.18) brightness(0.97)' } : {}}>
                {/* Drag handle */}
                <div
                  className="drag-handle"
                  onMouseDown={loadingPaperIds.has(activeMainPaper.id) ? undefined : (e) => startDragPaper(e, activeMainPaper, { type: 'stack' })}
                  style={loadingPaperIds.has(activeMainPaper.id) ? { cursor: 'default', opacity: 0.4 } : {}}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-800/70">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>

                {/* Awaiting AI overlay */}
                {loadingPaperIds.has(activeMainPaper.id) && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    background: 'rgba(244,239,215,0.18)',
                    borderRadius: '2px',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Save indicator */}
                <span className={`save-indicator ${saveStatus === 'saved' ? 'saved' : ''} ${saveStatus === 'clean' ? 'hidden' : ''}`}>
                  {saveStatus === 'unsaved' ? 'unsaved' : 'saved'}
                </span>

                <div className="p-8 pt-6 h-full flex flex-col overflow-hidden" style={{ paddingRight: '24px' }}>
                  {/* Subject line + version picker + save button */}
                  <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '2px solid rgba(139,69,19,0.2)', paddingBottom: '0.5rem', flexShrink: 0 }}>
                    <input
                      type="text"
                      className="subject-input"
                      style={{ border: 'none', margin: 0, padding: 0, flex: 1 }}
                      placeholder="Subject"
                      value={activeMainPaper.subject}
                      readOnly={loadingPaperIds.has(activeMainPaper.id)}
                      onChange={(e) => {
                        const n = e.target.value;
                        markDirty();
                        updateActiveProject(p => {
                          const s = [...p.mainStack];
                          const i = isDraggingTopPaper ? s.length - 2 : s.length - 1;
                          if (i >= 0) s[i] = { ...s[i], subject: n };
                          return { ...p, mainStack: s };
                        }, true);
                      }}
                    />

                    {/* Awaiting AI indicator — LEFT of version picker */}
                    {loadingPaperIds.has(activeMainPaper.id) && (
                      <span style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontStyle: 'italic',
                        fontSize: '0.85rem',
                        color: 'rgba(62,50,40,0.35)',
                        letterSpacing: '0.2px',
                        flexShrink: 0,
                        lineHeight: 1,
                      }}>awaiting AI<span className="dots"><span>.</span><span>.</span><span>.</span></span></span>
                    )}

                    {/* Version history dropdown */}
                    {(activeMainPaper.versions || []).length > 0 && (() => {
                      const versions = activeMainPaper.versions || [];
                      const currentMatch = versions.find(v => v.content === activeMainPaper.content && v.subject === activeMainPaper.subject);
                      const currentVersionNum = currentMatch ? String(currentMatch.versionNumber) : '';
                      return (
                        <select
                          className="version-select has-versions"
                          value={currentVersionNum}
                          onChange={(e) => { if (e.target.value) loadVersion(activeMainPaper.id, Number(e.target.value)); }}
                        >
                          <option value="" disabled>history</option>
                          {[...versions].reverse().map(v => (
                            <option key={v.versionNumber} value={String(v.versionNumber)}>v{v.versionNumber}</option>
                          ))}
                        </select>
                      );
                    })()}

                    {/* Save / quill button */}
                    <button
                      className={`quill-save-btn ${saveStatus === 'unsaved' ? 'is-dirty' : saveStatus === 'saved' ? 'is-saved' : 'is-clean'}`}
                      onClick={handleSave}
                      title="Save (Ctrl+S)"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M20 2C20 2 14 4 12 10C10 16 11 19 11 19"/>
                        <path d="M11 19C11 19 8 17 6 18C4 19 3 21 3 21C3 21 5 20 7 21C9 22 11 19 11 19Z"/>
                        <path d="M12 10C14 8 17 7 20 2"/>
                      </svg>
                    </button>
                  </div>

                  {/* Main textarea */}
                  <textarea
                    className="paper-textarea writing-font w-full"
                    placeholder="Start writing..."
                    value={activeMainPaper.content}
                    readOnly={loadingPaperIds.has(activeMainPaper.id)}
                    style={loadingPaperIds.has(activeMainPaper.id) ? { cursor: 'default', caretColor: 'transparent' } : {}}
                    onKeyDown={(e) => {
                      if (loadingPaperIds.has(activeMainPaper.id)) { e.preventDefault(); return; }
                    }}
                    onChange={(e) => {
                      const c = e.target.value;
                      markDirty();
                      updateActiveProject(p => {
                        const s = [...p.mainStack];
                        const i = isDraggingTopPaper ? s.length - 2 : s.length - 1;
                        if (i >= 0) s[i] = { ...s[i], content: c };
                        return { ...p, mainStack: s };
                      }, true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prompt bar */}
          <div ref={promptBarRef} className="prompt-container flex-none">
            <div className="prompt-input-area">
              <textarea
                ref={promptInputRef}
                className="prompt-textarea"
                placeholder="Message Writer's Desk..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    callApi();
                  }
                }}
                rows={1}
              />
            </div>
            <div className="prompt-controls-bar">
              <div className="control-left">
                <button className="prompt-tool-btn" onClick={() => setPromptSetupOpen(true)} title="Settings">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                <button className="prompt-tool-btn" title="Upload File">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
              </div>
              <div className="control-right">
                <div className="token-counter" style={{ color: loadingPaperIds.size > 0 ? 'rgba(139,69,19,0.6)' : undefined, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {loadingPaperIds.has(topPaper?.id) && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  )}
                  {loadingPaperIds.has(topPaper?.id) ? 'thinking...'
                    : loadingPaperIds.size > 0 ? `${loadingPaperIds.size} running`
                    : 'glm-5'}
                </div>
                <select
                  className="context-size-select"
                  value={maxTokens}
                  onChange={(e) => updateAiSettings({ maxTokens: Number(e.target.value) })}
                >
                  <option value={4096}>4K</option>
                  <option value={8192}>8K</option>
                  <option value={16384}>16K</option>
                  <option value={32768}>32K</option>
                  <option value={65536}>64K</option>
                  <option value={131072}>128K</option>
                </select>
                <button className="preview-btn" onClick={() => setContextPreviewOpen(true)} title="Preview context">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
                {!topPaper?.content?.trim() ? (
                  /* Paper is empty — normal blind send */
                  <button
                    className="prompt-send-btn"
                    onClick={callApi}
                    disabled={loadingPaperIds.has(topPaper?.id) || !promptText.trim()}
                    title="Send"
                    style={{ opacity: (loadingPaperIds.has(topPaper?.id) || !promptText.trim()) ? 0.35 : 1 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                ) : (
                  <>
                    {/* Clear + Rewrite */}
                    <button
                      className="prompt-send-btn"
                      onClick={callApiClearRewrite}
                      disabled={loadingPaperIds.has(topPaper?.id) || !promptText.trim()}
                      title="Clear + Rewrite — reads paper, writes fresh"
                      style={{ opacity: (loadingPaperIds.has(topPaper?.id) || !promptText.trim()) ? 0.35 : 1 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M23 4v6h-6"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                    </button>
                    {/* Chain */}
                    <button
                      className="prompt-send-btn"
                      onClick={callApiChain}
                      disabled={loadingPaperIds.has(topPaper?.id) || !promptText.trim()}
                      title="Chain — reads paper, appends below divider"
                      style={{ opacity: (loadingPaperIds.has(topPaper?.id) || !promptText.trim()) ? 0.35 : 1 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <SidebarDesk
        title="Right Desk"
        deskType="right"
        folders={activeProject.rightDesk.folders}
        archive={[]}
        trash={activeProject.rightDesk.trash}
        dropTarget={dropTarget}
        dragState={dragState}
        onCreateFolder={() => createNewFolder('right')}
        onRenameFolder={renameFolder}
        onRenamePaper={renamePaper}
        onDragPaper={startDragPaper}
        onDragFolder={startDragFolder}
        onToggleContext={togglePaperContext}
        inactiveFolderIds={new Set(activeProject.inactiveFolderIds)}
        onToggleFolderActive={toggleFolderActive}
        onOpenTrashModal={() => setTrashModal({ open: true, deskType: 'right' })}
        onOpenArchiveModal={() => {}}
        hasTrash={true}
        hasArchive={false}
        onTitleClick={() => {}}
        isProjectHeader={false}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Ghost drag element */}
      {dragState && (
        <div className="ghost-tab" style={{ left: dragPos.x, top: dragPos.y }}>
          <span className="ghost-title">
            {dragState.type === 'folder'
              ? `Move: ${dragState.folder.name}`
              : (dragState.paper.subject || 'Untitled')}
          </span>
        </div>
      )}

      {/* Modals */}
      <ContextPreviewModal
        isOpen={contextPreviewOpen}
        onClose={() => setContextPreviewOpen(false)}
        project={activeProject}
        systemPrompt={systemPrompt}
        promptText={promptText}
      />
      <TrashModal
        isOpen={trashModal.open}
        onClose={() => setTrashModal({ open: false, deskType: null })}
        items={trashModal.open
          ? (trashModal.deskType === 'left' ? activeProject.leftDesk.trash : activeProject.rightDesk.trash)
          : []}
        onRestore={handleRestoreTrashItem}
        onDelete={handleDeleteItem}
        onDeleteAll={handleDeleteAll}
      />
      <ArchiveModal
        isOpen={archiveModal.open}
        onClose={() => setArchiveModal({ open: false, deskType: null })}
        items={archiveModal.open ? activeProject.leftDesk.archive : []}
        onRestore={handleRestoreArchiveItem}
      />
      <ProjectSwitcherModal
        isOpen={projectSwitcherOpen}
        onClose={() => setProjectSwitcherOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={switchProject}
        onUpdateProjects={(updater) => {
          setProjects(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            next.forEach(p => {
              const old = prev.find(o => o.id === p.id);
              if (!old || old.title !== p.title) saveProjectToDB(p).catch(console.error);
            });
            return next;
          });
        }}
      />
      <PromptSetupModal
        isOpen={promptSetupOpen}
        onClose={() => setPromptSetupOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        systemPrompt={systemPrompt}
        onSystemPromptChange={(v) => updateAiSettings({ systemPrompt: v })}
        temperature={temperature}
        onTemperatureChange={(v) => updateAiSettings({ temperature: v })}
      />

      <MailAnimation ref={mailRef} anchorRef={promptBarRef} paperRef={mainAreaRef} />

      <ErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />

    </div>
  );
};

export default WritersDesk;
