/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Project, Commit, CommitDiff, RlmStep, Stats, SearchMatch } from '../types';

const BACKEND_URL = import.meta.env.PROD ? '' : 'http://localhost:8002';
const TERMINAL_WELCOME = 'Welcome to VibeGit Terminal Console.\nUse the input below to run terminal commands inside the project sandbox environment.\n\n';

interface AppContextType {
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
  themePalette: 'cyberpunk' | 'ocean' | 'emerald' | 'monochrome';
  setThemePalette: (val: 'cyberpunk' | 'ocean' | 'emerald' | 'monochrome') => void;
  provider: 'gemini' | 'openai';
  setProvider: (val: 'gemini' | 'openai') => void;
  geminiKey: string;
  setGeminiKey: (val: string) => void;
  openaiKey: string;
  setOpenaiKey: (val: string) => void;
  keysConfigured: { gemini: boolean; openai: boolean };
  isDrawerOpen: boolean;
  setIsDrawerOpen: (val: boolean) => void;
  projects: Project[];
  activeProject: string;
  setActiveProject: (val: string) => void;
  showNewProjectModal: boolean;
  setShowNewProjectModal: (val: boolean) => void;
  newProjectName: string;
  setNewProjectName: (val: string) => void;
  newProjectFramework: string;
  setNewProjectFramework: (val: string) => void;
  modalTab: 'new' | 'open';
  setModalTab: (val: 'new' | 'open') => void;
  importPath: string;
  setImportPath: (val: string) => void;
  globalSearchVal: string;
  setGlobalSearchVal: (val: string) => void;
  globalMatches: SearchMatch[];
  setGlobalMatches: (val: SearchMatch[]) => void;
  isSearchingGlobal: boolean;
  sandboxFiles: Record<string, string>;
  activeFile: string;
  setActiveFile: (val: string) => void;
  openTabs: string[];
  setOpenTabs: (val: string[]) => void;
  newFilePath: string;
  setNewFilePath: (val: string) => void;
  activeFileContent: string;
  setActiveFileContent: (val: string) => void;
  isEditingFile: boolean;
  setIsEditingFile: (val: boolean) => void;
  showMentionBox: boolean;
  setShowMentionBox: (val: boolean) => void;
  mentionFilter: string;
  setMentionFilter: (val: string) => void;
  mentionStartIndex: number;
  setMentionStartIndex: (val: number) => void;
  commits: Commit[];
  activeCommitHash: string;
  selectedCommitHash: string;
  selectedDiff: CommitDiff | null;
  searchQuery: string;
  setQuery: (val: string) => void;
  searchResults: string[];
  setSearchResults: (val: string[]) => void;
  promptInput: string;
  setPromptInput: (val: string) => void;
  pipelineActive: boolean;
  pipelineSteps: RlmStep[];
  stats: Stats | null;
  showProjectSelectorModal: boolean;
  setShowProjectSelectorModal: (val: boolean) => void;
  showFolderPicker: boolean;
  setShowFolderPicker: (val: boolean) => void;
  pickerCurrentPath: string;
  pickerParentPath: string;
  pickerDirectories: string[];
  isViewingCommit: boolean;
  setIsViewingCommit: (val: boolean) => void;
  terminalCommand: string;
  setTerminalCommand: (val: string) => void;
  terminalOutput: string;
  setTerminalOutput: (val: string) => void;
  isTerminalOpen: boolean;
  setIsTerminalOpen: (val: boolean) => void;
  isTerminalRunning: boolean;
  runTerminalCommand: (command: string) => Promise<void>;
  clearTerminal: () => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (val: boolean) => void;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (val: boolean) => void;
  
  // Actions
  fetchSettings: () => Promise<void>;
  handleSaveSettings: (e: React.FormEvent) => Promise<void>;
  fetchProjects: () => Promise<void>;
  handleCreateProject: (e: React.FormEvent) => Promise<void>;
  fetchSandbox: () => Promise<void>;
  handleAddFile: (e: React.FormEvent) => Promise<void>;
  handleDeleteFile: (path: string, e: React.MouseEvent) => Promise<void>;
  handleOpenFile: (path: string) => void;
  handleCloseTab: (path: string) => void;
  handleSaveFileContent: () => Promise<void>;
  fetchCommits: () => Promise<void>;
  handleSelectCommit: (hash: string) => Promise<void>;
  handleRollback: (hash: string) => Promise<void>;
  handleGlobalSearch: (e: React.FormEvent) => Promise<void>;
  handleCommitSearch: (e: React.FormEvent) => Promise<void>;
  fetchStats: () => Promise<void>;
  handleNavigatePicker: (path: string) => Promise<void>;
  handleOpenFolderPicker: (initialPath: string) => void;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSelectMention: (fileName: string) => void;
  handleSubmitPrompt: (e: React.FormEvent) => Promise<void>;
  chatHistoryEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  BACKEND_URL: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [isLightMode, setIsLightMode] = useState(false);
  const [themePalette, setThemePalette] = useState<'cyberpunk' | 'ocean' | 'emerald' | 'monochrome'>('cyberpunk');

  // Settings State
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [keysConfigured, setKeysConfigured] = useState({ gemini: false, openai: false });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('project') || 'default';
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectFramework, setNewProjectFramework] = useState('plain');
  const [modalTab, setModalTab] = useState<'new' | 'open'>('new');
  const [importPath, setImportPath] = useState('');

  // Global Search State
  const [globalSearchVal, setGlobalSearchVal] = useState('');
  const [globalMatches, setGlobalMatches] = useState<SearchMatch[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Sandbox State
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [activeFileContent, setActiveFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);

  // Mention State
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Commits State
  const [commits, setCommits] = useState<Commit[]>([]);
  const [activeCommitHash, setActiveCommitHash] = useState<string>('root-default');
  const [selectedCommitHash, setSelectedCommitHash] = useState<string>('root-default');
  const [selectedDiff, setSelectedDiff] = useState<CommitDiff | null>(null);
  const [searchQuery, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // RLM Streaming State
  const [promptInput, setPromptInput] = useState('');
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<RlmStep[]>([
    { name: 'Retrieving', status: 'pending', details: 'Waiting to scan git history & sandbox context...' },
    { name: 'Optimizing', status: 'pending', details: 'Waiting to compress context...' },
    { name: 'Generating', status: 'pending', details: 'Waiting for LLM generation...' },
    { name: 'Evaluating', status: 'pending', details: 'Waiting for syntax & test feedback loops...' },
    { name: 'Committed', status: 'pending', details: 'Waiting for commit sequence...' }
  ]);

  // Analytics Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Modals & Directory Pickers
  const [showProjectSelectorModal, setShowProjectSelectorModal] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerCurrentPath, setPickerCurrentPath] = useState('');
  const [pickerParentPath, setPickerParentPath] = useState('');
  const [pickerDirectories, setPickerDirectories] = useState<string[]>([]);
  const [isViewingCommit, setIsViewingCommit] = useState(false);

  // Terminal State
  const [terminalCommand, setTerminalCommand] = useState('python main.py');
  const [terminalOutput, setTerminalOutput] = useState(TERMINAL_WELCOME);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Refs
  const chatHistoryEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync Theme Class
  useEffect(() => {
    document.body.classList.remove('theme-cyberpunk', 'theme-ocean', 'theme-emerald', 'theme-monochrome', 'light', 'dark');
    document.body.classList.add(`theme-${themePalette}`);
    if (isLightMode) {
      document.body.classList.add('light');
    } else {
      document.body.classList.add('dark');
    }
  }, [isLightMode, themePalette]);

  // Initial Load
  useEffect(() => {
    fetchSettings();
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync active project states
  useEffect(() => {
    if (activeProject) {
      setOpenTabs([]);
      setActiveFile('');
      setSelectedCommitHash(`root-${activeProject}`);
      setActiveCommitHash(`root-${activeProject}`);
      setSelectedDiff(null);
      setGlobalMatches([]);
      setGlobalSearchVal('');
      setIsViewingCommit(false);
      fetchSandbox();
      fetchCommits();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject]);

  // Debounced Global Search Effect
  useEffect(() => {
    const trimmed = globalSearchVal.trim();
    if (!trimmed) {
      setGlobalMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project/search?query=${encodeURIComponent(trimmed)}&project=${activeProject}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setGlobalMatches(data);
        } else {
          setGlobalMatches([]);
        }
      } catch (err) {
        console.error(err);
        setGlobalMatches([]);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchVal, activeProject]);

  // Debounced Commit Search Effect
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/search?query=${encodeURIComponent(trimmed)}&project=${activeProject}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data.map((c: { hash: string }) => c.hash));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeProject]);


  // Sync active file and project frameworks to preset terminal command
  useEffect(() => {
    if (activeFile) {
      if (activeFile.endsWith('.py')) {
        setTerminalCommand(`python ${activeFile}`);
      } else if (activeFile.endsWith('.js') || activeFile.endsWith('.jsx')) {
        setTerminalCommand(`node ${activeFile}`);
      } else if (activeFile.endsWith('.ts') || activeFile.endsWith('.tsx')) {
        setTerminalCommand(`npx tsx ${activeFile}`);
      }
    } else {
      const proj = projects.find(p => p.name === activeProject);
      if (proj?.framework === 'react' || proj?.framework === 'nestjs') {
        setTerminalCommand('npm run build');
      } else {
        setTerminalCommand('python main.py');
      }
    }
  }, [activeFile, activeProject, projects]);

  // Sync active file content
  useEffect(() => {
    if (activeFile && sandboxFiles[activeFile] !== undefined) {
      setActiveFileContent(sandboxFiles[activeFile]);
    } else {
      setActiveFileContent('');
    }
  }, [activeFile, sandboxFiles]);

  // Auto-scroll chat
  useEffect(() => {
    chatHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pipelineSteps, commits]);

  // Fetch API Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`);
      const data = await res.json();
      setProvider(data.provider);
      setKeysConfigured({
        gemini: !!data.gemini_key_masked,
        openai: !!data.openai_key_masked
      });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_key: geminiKey,
          openai_key: openaiKey,
          provider
        })
      });
      setGeminiKey('');
      setOpenaiKey('');
      fetchSettings();
      alert('Settings saved successfully!');
    } catch {
      alert('Failed to save settings.');
    }
  };

  // Fetch Projects List
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        
        const params = new URLSearchParams(window.location.search);
        const projParam = params.get('project');
        if (projParam) {
          const exists = data.some((p: Project) => p.name === projParam);
          if (exists) {
            setActiveProject(projParam);
            return;
          }
        }
        
        const activeExists = data.some((p: Project) => p.name === activeProject);
        if (!activeExists && data.length > 0) {
          setActiveProject(data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim().replace(/\s+/g, '-').toLowerCase();
    if (!trimmed) return;
    try {
      const payload = modalTab === 'new' 
        ? { name: trimmed, framework: newProjectFramework }
        : { name: trimmed, framework: 'imported', import_path: importPath };

      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewProjectName('');
        setNewProjectFramework('plain');
        setImportPath('');
        setModalTab('new');
        setShowNewProjectModal(false);
        await fetchProjects();
        setActiveProject(trimmed);
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || 'Failed to create/import project'}`);
      }
    } catch {
      alert('Error creating/importing project.');
    }
  };

  // Fetch Sandbox Files
  const fetchSandbox = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sandbox?project=${activeProject}`);
      const data = await res.json();
      setSandboxFiles(data.files || {});
    } catch (err) {
      console.error('Failed to fetch sandbox:', err);
    }
  };

  // Add Sandbox File
  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/sandbox/file?project=${activeProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: newFilePath, content: '# Start coding here' })
      });
      if (res.ok) {
        setNewFilePath('');
        await fetchSandbox();
        handleOpenFile(newFilePath);
      }
    } catch {
      alert('Error creating file.');
    }
  };

  // Delete Sandbox File
  const handleDeleteFile = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/sandbox/file?file_path=${path}&project=${activeProject}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchSandbox();
        handleCloseTab(path);
      }
    } catch {
      alert('Error deleting file.');
    }
  };

  // Open File
  const handleOpenFile = (path: string) => {
    setIsViewingCommit(false);
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
    setActiveFile(path);
    setIsEditingFile(false);
  };

  // Close tab
  const handleCloseTab = (path: string) => {
    const nextTabs = openTabs.filter(t => t !== path);
    setOpenTabs(nextTabs);
    if (activeFile === path) {
      setActiveFile(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : '');
    }
  };

  // Save Manual Edits
  const handleSaveFileContent = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sandbox/file?project=${activeProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: activeFile, content: activeFileContent })
      });
      if (res.ok) {
        setIsEditingFile(false);
        await fetchSandbox();
      }
    } catch {
      alert('Failed to save manual edit.');
    }
  };

  // Fetch All Commits
  const fetchCommits = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/commits?project=${activeProject}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCommits(data);
        if (data.length > 0) {
          const successCommits = data.filter((c: Commit) => c.status === 'success');
          const activeHead = successCommits.length > 0 ? successCommits[successCommits.length - 1].hash : data[data.length - 1].hash;
          setActiveCommitHash(activeHead);
        }
      } else {
        setCommits([]);
      }
    } catch (err) {
      console.error('Failed to fetch commits:', err);
      setCommits([]);
    }
  };

  // Select Commit node
  const handleSelectCommit = async (hash: string) => {
    setSelectedCommitHash(hash);
    setIsViewingCommit(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/commits/${hash}/diff`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDiff(data);
      }
    } catch (err) {
      console.error('Failed to fetch diff:', err);
    }
  };

  // Rollback sandbox
  const handleRollback = async (hash: string) => {
    if (!confirm(`Are you sure you want to rollback sandbox files to commit [${hash}]? This will overwrite active project files.`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commit_hash: hash, project_name: activeProject })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCommitHash(data.active_commit);
        setSelectedCommitHash(data.active_commit);
        setIsViewingCommit(false);
        await fetchSandbox();
        await fetchCommits();
        await fetchStats();
        alert(`Successfully checked out commit: ${hash}`);
      }
    } catch {
      alert('Rollback failed.');
    }
  };

  // Global Code Search
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchVal.trim()) {
      setGlobalMatches([]);
      return;
    }
    setIsSearchingGlobal(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/project/search?query=${encodeURIComponent(globalSearchVal)}&project=${activeProject}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setGlobalMatches(data);
      } else {
        setGlobalMatches([]);
      }
    } catch (err) {
      console.error(err);
      setGlobalMatches([]);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // Autocomplete Mentions Tracker
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPromptInput(val);
    
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const words = textBeforeCursor.split(/[\s\n]+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const atIndex = textBeforeCursor.lastIndexOf(lastWord);
      setMentionStartIndex(atIndex);
      setMentionFilter(lastWord.slice(1));
      setShowMentionBox(true);
    } else {
      setShowMentionBox(false);
    }
  };

  // Inject selected file mention
  const handleSelectMention = (fileName: string) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;
    
    const cursor = textareaRef.current.selectionStart;
    const textBeforeMention = promptInput.slice(0, mentionStartIndex);
    const textAfterCursor = promptInput.slice(cursor);
    
    const newVal = `${textBeforeMention}@${fileName} ${textAfterCursor}`;
    setPromptInput(newVal);
    setShowMentionBox(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextCursorPos = mentionStartIndex + fileName.length + 2;
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    }, 10);
  };

  // Submit Prompt
  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || pipelineActive) return;

    const finalPrompt = promptInput;
    const mentions = promptInput.match(/@[\w./-]+/g) || [];
    let customContext = '';

    for (const mention of mentions) {
      const fileName = mention.slice(1);
      if (sandboxFiles[fileName]) {
        customContext += `\n\n--- Content of @${fileName} ---\n${sandboxFiles[fileName]}\n`;
      }
    }

    const payloadPrompt = customContext ? `${finalPrompt}\n${customContext}` : finalPrompt;

    setPromptInput('');
    setPipelineActive(true);
    
    setPipelineSteps([
      { name: 'Retrieving', status: 'running', details: 'Scanning virtual git tree and file tokens...' },
      { name: 'Optimizing', status: 'pending', details: 'Decompressing and structuring markdown instructions...' },
      { name: 'Generating', status: 'pending', details: 'Writing file modifications...' },
      { name: 'Evaluating', status: 'pending', details: 'Running syntax audits...' },
      { name: 'Committed', status: 'pending', details: 'Registering change signature...' }
    ]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: payloadPrompt, project_name: activeProject })
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            const { step, data } = parsed;
            updatePipelineStep(step, data);
          } catch (jsonErr) {
            console.error('JSON parse err on SSE stream:', jsonErr);
          }
        }
      }
    } catch (err) {
      console.error('SSE connection failed:', err);
      setPipelineSteps(prev =>
        prev.map(s => s.status === 'running' ? { ...s, status: 'failed', details: 'Error: Connection lost.' } : s)
      );
    } finally {
      setPipelineActive(false);
      await fetchSandbox();
      await fetchCommits();
      await fetchStats();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePipelineStep = (stepName: string, data: any) => {
    setPipelineSteps(prev => {
      return prev.map(s => {
        const nameLower = s.name.toLowerCase();

        if (stepName === 'retrieving' && nameLower === 'retrieving') {
          return { ...s, status: 'running', details: 'Scanning past prompts...' };
        }
        if (stepName === 'retrieved' && nameLower === 'retrieving') {
          const filesCount = data.active_files.length;
          const commitsCount = data.commits.length;
          return {
            ...s,
            status: 'completed',
            details: `Found context in ${commitsCount} past commits and ${filesCount} sandbox files.`
          };
        }

        if (stepName === 'optimizing' && nameLower === 'optimizing') {
          return { ...s, status: 'running', details: 'Compressing tokens using self-improvement heuristics...' };
        }
        if (stepName === 'optimized' && nameLower === 'optimizing') {
          return {
            ...s,
            status: 'completed',
            badge: `${data.compression_ratio}x Ratio`,
            details: `Raw Context: ${data.tokens_before} tokens. Compressed to: ${data.tokens_after} tokens.\n\nOptimized Prompt Preview:\n${data.optimized_prompt.slice(0, 150)}...`
          };
        }

        if (stepName === 'generating' && nameLower === 'generating') {
          return { ...s, status: 'running', details: `Attempt #${data.retry_number}: Running generative model (gemini-2.5-flash)...` };
        }

        if (stepName === 'evaluating' && nameLower === 'evaluating') {
          return { ...s, status: 'running', details: `Attempt #${data.retry_number}: Compiling and scoring output...` };
        }
        if (stepName === 'evaluated' && nameLower === 'evaluating') {
          const isSuccess = data.score >= 0.8;
          const statusText = isSuccess ? 'Satisfied (>= 80%)' : 'Refinement triggered (< 80%)';
          return {
            ...s,
            status: isSuccess ? 'completed' : 'running',
            badge: `Score: ${(data.score * 100).toFixed(0)}%`,
            details: `Status: ${statusText}\nFeedback: ${data.feedback}`
          };
        }

        if (stepName === 'committed' && nameLower === 'committed') {
          const success = data.status === 'success';
          return {
            ...s,
            status: success ? 'completed' : 'failed',
            badge: success ? `Hash: ${data.commit_hash}` : 'Abandoned',
            details: success
              ? `Changes committed to virtual git ecosystem under hash: ${data.commit_hash} (Time: ${data.duration_ms}ms)`
              : `Pipeline failed all corrective loop retries. Sandbox restored to previous state.`
          };
        }

        return s;
      });
    });
  };

  const handleCommitSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/search?query=${encodeURIComponent(searchQuery)}&project=${activeProject}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data.map((c: { hash: string }) => c.hash));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stats?project=${activeProject}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigatePicker = async (path: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/explorer/navigate?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setPickerCurrentPath(data.current_path);
        setPickerParentPath(data.parent_path);
        setPickerDirectories(data.directories || []);
      } else {
        const fallbackRes = await fetch(`${BACKEND_URL}/api/explorer/navigate?path=`);
        const data = await fallbackRes.json();
        setPickerCurrentPath(data.current_path);
        setPickerParentPath(data.parent_path);
        setPickerDirectories(data.directories || []);
      }
    } catch (err) {
      console.error('Failed to navigate directory:', err);
    }
  };

  const handleOpenFolderPicker = (initialPath: string) => {
    handleNavigatePicker(initialPath);
    setShowFolderPicker(true);
  };

  const runTerminalCommand = async (command: string) => {
    if (!command.trim() || isTerminalRunning) return;
    setIsTerminalRunning(true);
    setTerminalOutput(prev => prev + `\n$ ${command}\n`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sandbox/run?project=${activeProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (res.ok) {
        const data = await res.json();
        let output = '';
        if (data.stdout) output += data.stdout;
        if (data.stderr) output += data.stderr;
        if (!output) output = '(No output details returned)\n';
        setTerminalOutput(prev => prev + output + `Exit code: ${data.exit_code}\n`);
      } else {
        const data = await res.json();
        setTerminalOutput(prev => prev + `Error running command: ${data.detail || 'Server error'}\n`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTerminalOutput(prev => prev + `Error connection failed: ${msg}\n`);
    } finally {
      setIsTerminalRunning(false);
    }
  };

  const clearTerminal = () => {
    setTerminalOutput(TERMINAL_WELCOME);
  };


  return (
    <AppContext.Provider value={{
      isLightMode, setIsLightMode,
      themePalette, setThemePalette,
      provider, setProvider,
      geminiKey, setGeminiKey,
      openaiKey, setOpenaiKey,
      keysConfigured,
      isDrawerOpen, setIsDrawerOpen,
      projects,
      activeProject, setActiveProject,
      showNewProjectModal, setShowNewProjectModal,
      newProjectName, setNewProjectName,
      newProjectFramework, setNewProjectFramework,
      modalTab, setModalTab,
      importPath, setImportPath,
      globalSearchVal, setGlobalSearchVal,
      globalMatches, setGlobalMatches,
      isSearchingGlobal,
      sandboxFiles,
      activeFile, setActiveFile,
      openTabs, setOpenTabs,
      newFilePath, setNewFilePath,
      activeFileContent, setActiveFileContent,
      isEditingFile, setIsEditingFile,
      showMentionBox, setShowMentionBox,
      mentionFilter, setMentionFilter,
      mentionStartIndex, setMentionStartIndex,
      commits,
      activeCommitHash,
      selectedCommitHash,
      selectedDiff,
      searchQuery, setQuery,
      searchResults, setSearchResults,
      promptInput, setPromptInput,
      pipelineActive,
      pipelineSteps,
      stats,
      showProjectSelectorModal, setShowProjectSelectorModal,
      showFolderPicker, setShowFolderPicker,
      pickerCurrentPath,
      pickerParentPath,
      pickerDirectories,
      isViewingCommit, setIsViewingCommit,
      terminalCommand, setTerminalCommand,
      terminalOutput, setTerminalOutput,
      isTerminalOpen, setIsTerminalOpen,
      isTerminalRunning,
      isLeftPanelOpen, setIsLeftPanelOpen,
      isRightPanelOpen, setIsRightPanelOpen,
      
      // Actions
      fetchSettings,
      handleSaveSettings,
      fetchProjects,
      handleCreateProject,
      fetchSandbox,
      handleAddFile,
      handleDeleteFile,
      handleOpenFile,
      handleCloseTab,
      handleSaveFileContent,
      fetchCommits,
      handleSelectCommit,
      handleRollback,
      handleGlobalSearch,
      handleCommitSearch,
      fetchStats,
      handleNavigatePicker,
      handleOpenFolderPicker,
      handleTextareaChange,
      handleSelectMention,
      handleSubmitPrompt,
      runTerminalCommand,
      clearTerminal,
      chatHistoryEndRef,
      textareaRef,
      BACKEND_URL
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
