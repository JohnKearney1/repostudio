import "./App.css";
import FilePane from "./components/FilePane";
import WindowBar from "./components/WindowBar";
import PropertiesPane from "./components/PropertiesPane";
import { useEffect } from "react";

function App() {

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

  return (
    <div className="app">
        {/* Top of the App (Column) */}
        <WindowBar />
        
        {/* Main Content (Row) */}
        <div className="main-content">
          {/* Left Content*/}
          <div className="left-content">
            <FilePane />
          </div>

          {/* Right Content*/}
          <div className="right-content">
            <PropertiesPane />
          </div>
        </div>

    </div>
  );
}

export default App;
