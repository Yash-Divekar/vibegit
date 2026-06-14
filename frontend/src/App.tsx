import React, { useState, useEffect, useRef } from 'react';

// Types
interface Project {
  id: number;
  name: string;
  created_at: string;
}

interface Commit {
  id: number;
  hash: string;
  parent_hash: string | null;
  project_name: string;
  raw_prompt: string;
  optimized_prompt: string | null;
  eval_score: number;
  eval_feedback: string | null;
  status: string;
  tokens_before: number;
  tokens_after: number;
  cost: number;
  duration_ms: number;
  timestamp: string;
}

interface DiffLine {
  type: 'added' | 'deleted' | 'normal';
  content: string;
}

interface FileDiff {
  status: 'modified' | 'added' | 'deleted';
  lines: DiffLine[];
}

interface CommitDiff {
  commit: string;
  parent: string | null;
  diffs: Record<string, FileDiff>;
}

interface RlmStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details: string;
  badge?: string;
}

interface Stats {
  total_commits: number;
  success_rate: number;
  avg_score: number;
  tokens_saved: number;
  avg_compression_ratio: number;
  cost_saved: number;
  improvement_trend: {
    hash: string;
    score: number;
    timestamp: string;
    prompt: string;
  }[];
}

const BACKEND_URL = 'http://localhost:8002';

export default function App() {
  // Settings & Flyout Drawer State
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [keysConfigured, setKeysConfigured] = useState({ gemini: false, openai: false });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string>('default');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Sandbox Files & Tabs State
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [activeFileContent, setActiveFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);

  // Commits & Diff State
  const [commits, setCommits] = useState<Commit[]>([]);
  const [activeCommitHash, setActiveCommitHash] = useState<string>('root-default');
  const [selectedCommitHash, setSelectedCommitHash] = useState<string>('root-default');
  const [selectedDiff, setSelectedDiff] = useState<CommitDiff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Refs
  const chatHistoryEndRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    fetchSettings();
    fetchProjects();
  }, []);

  // Fetch Sandbox & Commits when project changes
  useEffect(() => {
    if (activeProject) {
      setOpenTabs([]);
      setActiveFile('');
      setSelectedCommitHash(`root-${activeProject}`);
      setActiveCommitHash(`root-${activeProject}`);
      setSelectedDiff(null);
      fetchSandbox();
      fetchCommits();
      fetchStats();
    }
  }, [activeProject]);

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
    } catch (err) {
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
        // Default to first project if activeProject is not set
        if (data.length > 0 && !activeProject) {
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
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok) {
        setNewProjectName('');
        setShowNewProjectModal(false);
        await fetchProjects();
        setActiveProject(trimmed);
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || 'Failed to create project'}`);
      }
    } catch (err) {
      alert('Error creating project.');
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
    } catch (err) {
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
    } catch (err) {
      alert('Error deleting file.');
    }
  };

  // Open File in Tabs
  const handleOpenFile = (path: string) => {
    setSelectedCommitHash(`root-${activeProject}`); // Return to active editing mode
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
    } catch (err) {
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
    if (hash === `root-${activeProject}`) {
      setSelectedDiff(null);
      return;
    }
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
        await fetchSandbox();
        await fetchCommits();
        await fetchStats();
        alert(`Successfully checked out commit: ${hash}`);
      }
    } catch (err) {
      alert('Rollback failed.');
    }
  };

  // Submit Prompt to RLM Pipeline
  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || pipelineActive) return;

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
        body: JSON.stringify({ prompt: promptInput, project_name: activeProject })
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

  // Update specific stepper node
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
          return { ...s, status: 'running', details: `Attempt #${data.retry_number}: Running generative model...` };
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

  // Perform Semantic Search
  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/search?query=${encodeURIComponent(searchQuery)}&project=${activeProject}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data.map((c: any) => c.hash));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stats?project=${activeProject}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  // SVG Line Chart renderer helper (Inside Drawer)
  const renderTrendChart = () => {
    if (!stats || !stats.improvement_trend || stats.improvement_trend.length < 2) {
      return <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Need at least 2 commits to generate trend chart.</div>;
    }

    const data = stats.improvement_trend;
    const width = 300;
    const height = 90;
    const paddingX = 15;
    const paddingY = 15;

    const points = data.map((d, index) => {
      const x = paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - d.score * (height - 2 * paddingY);
      return { x, y };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--neon-cyan)" />
            <stop offset="100%" stopColor="var(--neon-purple)" />
          </linearGradient>
        </defs>
        
        <line x1={0} y1={paddingY} x2={width} y2={paddingY} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        <line x1={0} y1={height - paddingY} x2={width} y2={height - paddingY} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

        <path
          d={pathD}
          fill="none"
          stroke="url(#chartGlow)"
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 242, 254, 0.4))' }}
        />

        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#0d1220"
            stroke={idx === points.length - 1 ? 'var(--neon-cyan)' : 'var(--neon-purple)'}
            strokeWidth={1.5}
          />
        ))}
      </svg>
    );
  };

  const selectedCommit = Array.isArray(commits) ? commits.find(c => c.hash === selectedCommitHash) : undefined;
  const isViewingCommit = selectedCommitHash !== `root-${activeProject}`;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-text">VibeGit</span>
          <span className="logo-badge">IDE Layer</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Active project header info */}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Active Project: <strong style={{ color: 'var(--neon-cyan)' }}>{activeProject}</strong>
          </span>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>|</span>

          {/* Settings Flyout Drawer Toggle */}
          <button className="btn btn-neon-cyan" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            <svg style={{ marginRight: '6px' }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Metrics & Keys
          </button>
        </div>
      </header>

      {/* Main Panels Layout */}
      <main className="app-main">
        {/* Left Sidebar Panel (Scoping Project, Files, Commits) */}
        <div className="sidebar-layout">
          {/* Top Project Selector */}
          <div className="project-selector-bar">
            <select
              value={activeProject}
              onChange={e => setActiveProject(e.target.value)}
              className="project-select"
            >
              {projects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="btn btn-neon-purple"
              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            >
              New
            </button>
          </div>

          {/* Top-Left: File Explorer */}
          <div className="file-explorer-container">
            <div className="glass-panel-header">
              <span className="glass-panel-title">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Files Explorer
              </span>
              <form onSubmit={handleAddFile} style={{ display: 'flex', gap: '3px' }}>
                <input
                  type="text"
                  placeholder="name.py"
                  value={newFilePath}
                  onChange={e => setNewFilePath(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '0.7rem',
                    width: '70px',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
                <button type="submit" className="btn-icon" style={{ padding: '1px 5px', fontSize: '0.7rem' }}>+</button>
              </form>
            </div>
            <div className="glass-panel-body" style={{ padding: '4px' }}>
              <div className="file-list">
                {Object.keys(sandboxFiles).length === 0 ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 8px' }}>Sandbox is empty. Create a file to begin!</div>
                ) : (
                  Object.keys(sandboxFiles).map(path => (
                    <div
                      key={path}
                      className={`file-item ${!isViewingCommit && activeFile === path ? 'active' : ''}`}
                      onClick={() => handleOpenFile(path)}
                    >
                      <div className="file-info">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.6 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{path}</span>
                      </div>
                      <button className="file-delete-btn" onClick={(e) => handleDeleteFile(path, e)}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom-Left: Vertical Timeline Commit History */}
          <div className="commit-timeline-container">
            <div className="glass-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <span className="glass-panel-title">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commit Timeline
                </span>
                
                {/* Micro Search commits */}
                <form onSubmit={handleSemanticSearch} style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value) setSearchResults([]);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontSize: '0.65rem',
                      width: '70px',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                </form>
              </div>
            </div>
            <div className="glass-panel-body">
              <div className="vertical-commit-list">
                {commits.length === 0 ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No commits yet.</div>
                ) : (
                  commits.map((commit) => {
                    const isRoot = commit.hash === `root-${activeProject}`;
                    const isSelected = commit.hash === selectedCommitHash;
                    const isActive = commit.hash === activeCommitHash;
                    const isSearchResult = searchResults.includes(commit.hash);
                    
                    let statusClass = 'success';
                    if (commit.status === 'failed') {
                      statusClass = 'failed';
                    }

                    return (
                      <div
                        key={commit.hash}
                        className={`vertical-commit-node ${statusClass} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectCommit(commit.hash)}
                        style={{
                          border: isSearchResult ? '1px dashed var(--neon-amber)' : 'none',
                          padding: isSearchResult ? '4px' : '0',
                          borderRadius: '4px'
                        }}
                      >
                        <div className="vertical-commit-dot" />
                        <div className="vertical-commit-info">
                          <div className="vertical-commit-header">
                            <span>{commit.hash.slice(0, 7)}</span>
                            {isActive && <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>HEAD</span>}
                            {!isRoot && <span>{(commit.eval_score * 100).toFixed(0)}%</span>}
                          </div>
                          <div className="vertical-commit-prompt">
                            {commit.raw_prompt}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Tabs & Code/Diff Editor */}
        <div className="middle-column">
          {/* Tabs Bar */}
          <div className="editor-tabs-bar">
            {/* If viewing a commit diff, display diff tab */}
            {isViewingCommit ? (
              <div className="editor-tab active">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--neon-cyan)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Diff: {selectedCommitHash.slice(0, 7)}</span>
                <span onClick={() => handleSelectCommit(`root-${activeProject}`)} style={{ marginLeft: '4px', cursor: 'pointer', opacity: 0.6 }}>×</span>
              </div>
            ) : (
              // Open file tabs
              openTabs.map(tabPath => (
                <div
                  key={tabPath}
                  className={`editor-tab ${activeFile === tabPath ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFile(tabPath);
                    setIsEditingFile(false);
                  }}
                >
                  <span>{tabPath}</span>
                  <span onClick={(e) => { e.stopPropagation(); handleCloseTab(tabPath); }} style={{ marginLeft: '4px', cursor: 'pointer', opacity: 0.6 }}>×</span>
                </div>
              ))
            )}
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Diff View Panel */}
            {isViewingCommit ? (
              <div className="diff-editor-container">
                <div className="diff-header-bar">
                  <span>Commit: <strong>{selectedCommitHash}</strong></span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-neon-cyan"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => handleRollback(selectedCommitHash)}
                    >
                      Rollback to here
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => handleSelectCommit(`root-${activeProject}`)}
                    >
                      Close Diff
                    </button>
                  </div>
                </div>

                {selectedCommit && (
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Raw Prompt:</div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>{selectedCommit.raw_prompt}</div>
                    {selectedCommit.eval_feedback && (
                      <>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px', color: selectedCommit.eval_score >= 0.8 ? 'var(--neon-green)' : 'var(--neon-rose)' }}>Evaluator Feedback:</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace' }}>{selectedCommit.eval_feedback}</div>
                      </>
                    )}
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {!selectedDiff || Object.keys(selectedDiff.diffs).length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No code files modified in this commit snapshot.</div>
                  ) : (
                    Object.entries(selectedDiff.diffs).map(([path, diffData]) => (
                      <div key={path} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <div className="diff-header-bar" style={{ background: 'rgba(0,0,0,0.1)' }}>
                          <span>File: <strong>{path}</strong></span>
                          <span className="logo-badge" style={{
                            color: diffData.status === 'added' ? 'var(--neon-green)' : diffData.status === 'deleted' ? 'var(--neon-rose)' : 'var(--neon-cyan)',
                            borderColor: diffData.status === 'added' ? 'rgba(56,239,125,0.2)' : diffData.status === 'deleted' ? 'rgba(255,8,68,0.2)' : 'rgba(0,242,254,0.2)'
                          }}>{diffData.status}</span>
                        </div>
                        <div className="diff-body">
                          {diffData.lines.map((line, idx) => (
                            <div key={idx} className={`diff-line ${line.type}`}>
                              <span className="diff-line-num">{idx + 1}</span>
                              <span className="diff-line-content">{line.content || ' '}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Active code editor view
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {activeFile ? (
                  <>
                    <div className="diff-header-bar">
                      <span>File: <strong>{activeFile}</strong></span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isEditingFile ? (
                          <>
                            <button className="btn btn-neon-cyan" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={handleSaveFileContent}>Save</button>
                            <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => { setIsEditingFile(false); fetchSandbox(); }}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn btn-neon-purple" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => setIsEditingFile(true)}>Edit Code</button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={activeFileContent}
                      onChange={e => setActiveFileContent(e.target.value)}
                      readOnly={!isEditingFile}
                      style={{
                        flex: 1,
                        width: '100%',
                        background: '#05070a',
                        color: '#cbd5e1',
                        border: 'none',
                        padding: '16px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                        lineHeight: '1.45',
                        outline: 'none',
                        resize: 'none',
                        opacity: isEditingFile ? 1 : 0.85
                      }}
                    />
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', flexDirection: 'column', gap: '12px' }}>
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.3 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Double click a file in Left Explorer to open tabs, or run a vibe prompt to generate new files.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column Layout: Stepper & Chat Console */}
        <div className="right-column">
          {/* Stepper RLM Progress Flow */}
          <div className="glass-panel" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="glass-panel-header">
              <span className="glass-panel-title">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                RLM Context Stepper
              </span>
              {pipelineActive && <div className="spinner" />}
            </div>
            <div className="glass-panel-body" style={{ padding: '8px' }}>
              <div className="stepper-container">
                {pipelineSteps.map((step, idx) => {
                  const isActive = step.status === 'running';
                  const isCompleted = step.status === 'completed';
                  const isFailed = step.status === 'failed';
                  
                  return (
                    <div key={idx} className={`step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                      <div className="step-header">
                        <div className="step-title-wrap">
                          <span className="step-dot" />
                          <span className="step-label" style={{
                            color: isFailed ? 'var(--neon-rose)' : isActive ? 'var(--neon-cyan)' : isCompleted ? '#c084fc' : 'var(--text-muted)',
                            fontSize: '0.65rem'
                          }}>{step.name}</span>
                        </div>
                        {step.badge && <span className="step-badge">{step.badge}</span>}
                      </div>
                      {isActive || isCompleted || isFailed ? (
                        <div className="step-content" style={{ whiteSpace: 'pre-wrap', maxHeight: '55px', overflowY: 'auto' }}>
                          {step.details}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vibe Chat Console */}
          <div className="chat-container">
            <div className="glass-panel-header">
              <span className="glass-panel-title">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                AI Prompt Console
              </span>
            </div>
            <div className="chat-history">
              {commits.filter(c => c.hash !== `root-${activeProject}`).map((commit) => (
                <div
                  key={commit.hash}
                  className="chat-message user"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectCommit(commit.hash)}
                >
                  <div className="chat-message-meta">
                    <span>Commit [{commit.hash.slice(0, 7)}]</span>
                    <span style={{
                      color: commit.status === 'success' ? 'var(--neon-green)' : 'var(--neon-rose)',
                      fontSize: '0.65rem'
                    }}>
                      {commit.status.toUpperCase()} ({(commit.eval_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div>{commit.raw_prompt}</div>
                </div>
              ))}
              
              {pipelineActive && (
                <div className="chat-message user" style={{ opacity: 0.65 }}>
                  <div className="chat-message-meta">
                    <span>Pipeline Active...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner" />
                    <span>Decomposing tasks and auditing file diffs...</span>
                  </div>
                </div>
              )}

              <div ref={chatHistoryEndRef} />
            </div>

            <form onSubmit={handleSubmitPrompt} className="chat-input-area">
              <textarea
                className="chat-textarea"
                placeholder="Submit vibe prompt to active sandbox..."
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                disabled={pipelineActive}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitPrompt(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={pipelineActive || !promptInput.trim()}
                className="btn btn-neon-purple"
                style={{ height: '40px', padding: '0 12px' }}
              >
                Vibe
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Flyout Drawer for Settings & Metrics (Drawer Grid on Right) */}
      <div className={`settings-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="settings-drawer-header">
          <span className="settings-drawer-title">Metrics & Settings</span>
          <button className="btn-icon" onClick={() => setIsDrawerOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', padding: '0' }}>×</button>
        </div>
        <div className="settings-drawer-body">
          {/* Section 1: LLM Configuration */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--text-secondary)' }}>Credentials</div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Active Provider</label>
                <select
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value as any);
                    fetch(`${BACKEND_URL}/api/settings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: e.target.value, gemini_key: '', openai_key: '' })
                    });
                  }}
                  className="form-input"
                  style={{ background: '#0e1424' }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">
                  Gemini API Key
                  {keysConfigured.gemini && <span style={{ color: 'var(--neon-green)', marginLeft: '6px' }}>✓</span>}
                </label>
                <input
                  type="password"
                  placeholder={keysConfigured.gemini ? '••••••••••••••••' : 'Enter API Key'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">
                  OpenAI API Key
                  {keysConfigured.openai && <span style={{ color: 'var(--neon-green)', marginLeft: '6px' }}>✓</span>}
                </label>
                <input
                  type="password"
                  placeholder={keysConfigured.openai ? '••••••••••••••••' : 'Enter API Key'}
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-neon-cyan" style={{ marginTop: '4px', width: '100%' }}>
                Save API Keys
              </button>
            </form>
          </div>

          {/* Section 2: Self-Improvement Analysis */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--text-secondary)' }}>Project Analytics</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats ? stats.total_commits : 0}</div>
                <div className="stat-label">Commits</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats ? `${(stats.success_rate * 100).toFixed(0)}%` : '0%'}</div>
                <div className="stat-label">Success Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats ? stats.avg_compression_ratio : '1.0'}x</div>
                <div className="stat-label">Avg Compression</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats ? stats.tokens_saved : 0}</div>
                <div className="stat-label">Tokens Saved</div>
              </div>
            </div>

            <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Self-Correction Score Trend</span>
                {stats && stats.avg_score && (
                  <span>Avg: {(stats.avg_score * 100).toFixed(0)}%</span>
                )}
              </div>
              {renderTrendChart()}
            </div>
            
            {stats && stats.cost_saved > 0 && (
              <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', background: 'rgba(56, 239, 125, 0.05)', border: '1px dashed var(--neon-green)', padding: '6px', borderRadius: '4px' }}>
                Estimated LLM Costs Saved: <strong style={{ color: 'var(--neon-green)' }}>${stats.cost_saved.toFixed(5)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create New Sandbox Project</span>
              <button className="btn-icon" onClick={() => setShowNewProjectModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', padding: '0' }}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. prime-checker"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-icon" onClick={() => setShowNewProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-neon-purple">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
