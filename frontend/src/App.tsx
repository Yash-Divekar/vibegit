import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { RightPanel } from './components/RightPanel';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Modals } from './components/Modals';

function AppLayout() {
  const { isLeftPanelOpen, isRightPanelOpen } = useApp();

  const leftWidth = isLeftPanelOpen ? '290px' : '0px';
  const rightWidth = isRightPanelOpen ? '340px' : '0px';

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Header />

      {/* Dynamic Multi-Column IDE Layout */}
      <main 
        className="app-main" 
        style={{ 
          gridTemplateColumns: `${leftWidth} 1fr ${rightWidth}`,
          transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Left Panel: Files and Timeline */}
        <div style={{ 
          width: leftWidth, 
          height: '100%', 
          overflow: 'hidden', 
          borderRight: isLeftPanelOpen ? '1px solid var(--border-color)' : 'none', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <Sidebar />
        </div>

        {/* Middle Panel: File Tabs and Editor / Commit Diff view */}
        <EditorArea />

        {/* Right Panel: Stepper progress and Prompt chat box */}
        <div style={{ 
          width: rightWidth, 
          height: '100%', 
          overflow: 'hidden', 
          borderLeft: isRightPanelOpen ? '1px solid var(--border-color)' : 'none', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <RightPanel />
        </div>
      </main>

      {/* Slide-out Settings/Metrics Drawer */}
      <SettingsDrawer />

      {/* Global Modal Overlays (Selector, Creator, Folder Browser) */}
      <Modals />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
