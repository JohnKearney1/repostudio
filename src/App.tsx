import "./App.css";
import FilePane from "./components/FilePane";
import WindowBar from "./components/WindowBar";
import PropertiesPane from "./components/PropertiesPane";
import Popup from "./components/Popup";
import { useEffect } from "react";
import { usePopupStore } from "./components/store";
import RepositorySelector from "./components/RepositorySelector";
import { useFileStore } from "./components/store";
import AudioPlayer from "./components/AudioPlayer";

import { loadRepositoriesScript } from "./scripts/RepoOperations";
import { loadFilesScript } from "./scripts/FileOperations";

function App() {

  // Load repositories and set the first repository as selected.
  useEffect(() => {
    loadRepositoriesScript();
    loadFilesScript();
  }, []);

  // If there is one or more selected files, show the audio player component.
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;

  useEffect(() => {
    const setVh = () => {
      // 1vh is the value of 1% of the viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
  
    setVh();
    window.addEventListener('resize', setVh);
  
    return () => {
      window.removeEventListener('resize', setVh);
    };
  }, []);  

  const { isVisible: isRepoSelectorVisible} = usePopupStore();


  return (
    <div className="app">
        {/* Top of the App (Column) */}
        <WindowBar />
        
        {/* Main Content (Row) */}
        <div className="main-content">
          {/* Popup for Repositories */}

          <div className="panel-container">
             
          
            <Popup isVisible={isRepoSelectorVisible} setVisible={usePopupStore.getState().setVisible}>
              <RepositorySelector />
            </Popup>
            {/* Left Content*/}
            <div className="left-content">
              <FilePane />
            </div>

            {/* Right Content*/}
            <div className="right-content">
              <PropertiesPane />
              {singleSelected && <AudioPlayer />}

            </div>

          </div>



        </div>

    </div>
  );
}

export default App;
