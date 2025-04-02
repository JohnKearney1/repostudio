import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { BorderSolidIcon, SizeIcon, Cross2Icon,  /* HamburgerMenuIcon */ } from '@radix-ui/react-icons';
// import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import './WindowBar.css';
import logo from '../../assets/img/64x64.png';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

const WindowBar: React.FC = () => {
  const [appWindow, setAppWindow] = useState<WebviewWindow | null>(null);

  // Initialize the current window
  useEffect(() => {
    const init = async () => {
      const currentWindow = getCurrentWebviewWindow();
      setAppWindow(currentWindow);
    };
    init();
  }, []);

  const handleNewWindow = useCallback(async (windowLabel: string) => {
    const existingWindow = await WebviewWindow.getByLabel(windowLabel);
    if (existingWindow) {
      await existingWindow.show();
      // Ensure the window is not minimized
      if (await existingWindow.isMinimized()) {
        await existingWindow.unminimize();
      }
      // Bring the window to the front
      await existingWindow.setFocus();
      return;
    }

    new WebviewWindow(windowLabel, {
      url: 'index.html',
      title: "Repo Studio",
      resizable: true,
      decorations: false
    });
  }, []);

  const handleCtrlWShortcut = useCallback(() => {
    handleNewWindow("main-2");
  }, [handleNewWindow]);

  useEffect(() => {
    if (!appWindow || appWindow.label !== 'main') return;

    const registerShortcuts = async () => {
      try {
        await register('CommandOrControl+W', handleCtrlWShortcut);
      } catch (error) {
        console.error("Error registering shortcuts", error);
      }
    };

    const unregisterShortcuts = async () => {
      try {
        await unregister('CommandOrControl+W');
        await unregister('CommandOrControl+,');
      } catch (error) {
        console.error("Error unregistering shortcuts", error);
      }
    };

    registerShortcuts();

    return () => {
      unregisterShortcuts();
    };
  }, [appWindow, handleCtrlWShortcut]);
  

  // Handle dragging and double-click to maximize/minimize.
  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail === 2 && appWindow) {
      appWindow.toggleMaximize();
    } else if (e.buttons === 1 && appWindow) {
      appWindow.startDragging();
    }
  };

  // Window control button handlers
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
        {/* { appWindow?.label === 'main' && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className='window-title-container'
              onMouseDown={(e) => e.stopPropagation()}
              asChild
            >
              <HamburgerMenuIcon color='white'/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                onMouseDown={(e) => e.stopPropagation()}
                sideOffset={11}
                className='DropdownMenuContent'
              >
                <DropdownMenu.Item
                  className='DropdownMenuItem'
                  onSelect={() => handleNewWindow("main-2")}
                >
                  New Window
                  <div className="RightSlot">⌘+W</div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )} */}

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
