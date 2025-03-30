// App.tsx
// This is the main component of the application.
// It contains the layout structure and the state management context providers.
// It also loads the repositories when the app starts.

import "./App.css";
import FilePane from "./components/MainWindow/FileBrowser/FilePane";
import WindowBar from "./components/Layout/WindowBar";
import PropertiesPane from "./components/MainWindow/RightPanelContent/PropertiesPane/PropertiesPane";
import Popup from "./components/Layout/Popup";
import { useEffect, useState } from "react";
import { usePopupStore, usePopupContentStore, useRightPanelContentStore } from "./scripts/store";
import AudioPlayer from "./components/MainWindow/AudioPlayer/AudioPlayer";
import { loadRepositoriesScript } from "./scripts/RepoOperations";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import Settings from "./components/SettingsWindow/Settings";

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
    };
  }, []);  

  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow();
    // Set initial label
    setWindowLabel(currentWindow.label);

    // Poll every second to check if the label changes
    const interval = setInterval(() => {
      const newLabel = currentWindow.label;
      setWindowLabel(prev => (prev !== newLabel ? newLabel : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Render nothing until the label is loaded
  if (!windowLabel) {
    return null;
  }

  // Conditionally render based on the window label
  if (windowLabel === "settings") {
    return <Settings />;
  } else if (windowLabel === "main" || windowLabel === "main-2") {
    return <Home />;
  }

  return null;
}


function Home() {
  const { isVisible: isRepoSelectorVisible} = usePopupStore();
  const { content: popupContent } = usePopupContentStore();
  const { content: rightPanelContent, setContent } = useRightPanelContentStore();

  
  useEffect(() => {
    if (!rightPanelContent) {
      setContent(<PropertiesPane />);
    }
    loadRepositoriesScript();
  }, []);

  return (
    <div className="app">
        <WindowBar />
        <div className="main-content"> 
          <div className="panel-container">
            <Popup isVisible={isRepoSelectorVisible} setVisible={usePopupStore.getState().setVisible}>
              {popupContent}
            </Popup>
            <div className="left-content">
              <FilePane />
            </div>
            <div className="right-content">
              {rightPanelContent}
            </div> 
          </div>
          <AudioPlayer />
        </div>
    </div>
  );
}

export default App;
