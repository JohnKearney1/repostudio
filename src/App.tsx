// App.tsx
// This is the main component of the application.
// It contains the layout structure and the state management context providers.
// It also loads the repositories when the app starts.

import "./App.css";
import FilePane from "./components/FileBrowser/FilePane";
import WindowBar from "./components/Layout/WindowBar";
import PropertiesPane from "./components/RightPanelContent/PropertiesPane/PropertiesPane";
import Popup from "./components/Layout/Popup";
import { useEffect } from "react";
import { usePopupStore, usePopupContentStore, useRightPanelContentStore } from "./scripts/store";
import AudioPlayer from "./components/AudioPlayer/AudioPlayer";

import { loadRepositoriesScript } from "./scripts/RepoOperations";

function App() {
  const { isVisible: isRepoSelectorVisible} = usePopupStore();
  const { content: popupContent } = usePopupContentStore();
  const { content: rightPanelContent, setContent } = useRightPanelContentStore();

  // Load repositories and set the first repository as selected.
  useEffect(() => {
    // If the rightPanelContent does not contain a value, set it to the PropertiesPane.
    if (!rightPanelContent) {
      setContent(<PropertiesPane />);
    }
    
    // Load the repositories from the backend.
    loadRepositoriesScript();
  }, []);

  // Effect to set the CSS variable for viewport height.
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

  return (
    <div className="app">
        {/* Window Bar of the App */}
        <WindowBar />
        
        {/* Main Content */}
        <div className="main-content"> 

          <div className="panel-container">
            {/* Displays the popup, and whatever element is inside it (as supplied by the store) */}
            <Popup isVisible={isRepoSelectorVisible} setVisible={usePopupStore.getState().setVisible}>
              {popupContent}
            </Popup>

            {/* Left Content*/}
            <div className="left-content">
              <FilePane />
            </div>

            {/* Right Content*/}
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
