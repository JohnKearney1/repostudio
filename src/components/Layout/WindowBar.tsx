// WindowBar.tsx
// This component displays the title bar of the application window.
// It also contains the minimize, maximize, and close buttons.
// It uses the Tauri API to interact with the window, and is draggable by the title bar.

import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BorderSolidIcon, SizeIcon, Cross2Icon } from '@radix-ui/react-icons';
import './WindowBar.css';

const WindowBar: React.FC = () => {
  const appWindow = getCurrentWindow();

  // Handle mouse down on the title bar
  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start dragging if no button was clicked on the controls
    // Double-click toggles maximize
    if (e.detail === 2) {
      appWindow.toggleMaximize();
    } else if (e.buttons === 1) {
      appWindow.startDragging();
    }
  };

  // Button handlers with event propagation stopped
  const handleMinimize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    appWindow.minimize();
  };

  const handleMaximize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    appWindow.toggleMaximize();
  };

  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // appWindow.close();
    appWindow.hide();
  };

  return (
    <div
      id="titlebar"
      onMouseDown={handleTitleBarMouseDown}
      className='window-bar'
    >
      <div className='window-title-container'>
        <img src='/64x64.png' alt='logo' className='windowbar-icon'/>
        <div className='window-title'>Repo Studio <h5>0.1.2-a</h5></div>
      </div>
      
      <div className='window-controls'>
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
