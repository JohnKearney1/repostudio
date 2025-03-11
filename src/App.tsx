import { useState } from "react";
import "./App.css";
import FilePane from "./components/FilePane";

function App() {

  return (
    <div className="app">
      <div className="app-main">
        <FilePane />
      </div>
    </div>
  );
}

export default App;
