import React, { useState, useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { BorderSolidIcon, SizeIcon, Cross2Icon,  /* HamburgerMenuIcon */ } from '@radix-ui/react-icons';
// import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import './WindowBar.css';
import logo from '../../assets/img/64x64.png';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const WindowBar: React.FC = () => {
  const [appWindow, setAppWindow] = useState<WebviewWindow | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentWindow = getCurrentWebviewWindow();
      setAppWindow(currentWindow);
    };
    init();
  }, []);

  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail === 2 && appWindow) {
      appWindow.toggleMaximize();
    } else if (e.buttons === 1 && appWindow) {
      appWindow.startDragging();
    }
  };

  const handleMinimize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    appWindow?.minimize();
  };

  const handleMaximize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    appWindow?.toggleMaximize();
  };

  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    appWindow?.close();
  };

  return (
    <div
      id="titlebar"
      onMouseDown={handleTitleBarMouseDown}
      className='window-bar'
    >
      <div className='window-controls'>
        <button className='window-title-container'>
          <img src={logo} alt='logo' className='windowbar-icon'/>
        </button>
      </div>
      <div className='window-controls' style={{ gap: '0' }}>
        <div
          id="titlebar-minimize"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMinimize}
          className='min-btn'
        >
          <BorderSolidIcon width="10px" />
        </div>
        <div
          id="titlebar-maximize"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMaximize}
          className='max-btn'
        >
          <SizeIcon />
        </div>
        <div
          id="titlebar-close"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className='close-btn'
        >
          <Cross2Icon />
        </div>
      </div>
    </div>
  );
};

export default WindowBar;
