import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { BorderSolidIcon, SizeIcon, Cross2Icon, HamburgerMenuIcon } from '@radix-ui/react-icons';
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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

  // Command handler to open new windows
  const handleNewWindow = useCallback(async (windowLabel: string) => {
    // Check if the window already exists
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
    
    if (windowLabel === 'settings') {
      const newWindow = new WebviewWindow(windowLabel, {
        url: 'index.html',
        title: "Repo Studio Settings",
        resizable: true,
        decorations: false,
        height: 350,
        width: 600,
        minWidth: 300,
        minHeight: 250,
      });
      newWindow.once('tauri://created', () => {
        console.log('New window created');
      });
  
      newWindow.once('tauri://error', (e) => {
        console.error('Failed to create new window', e);
      });
    } else {
      const newWindow = new WebviewWindow(windowLabel, {
        url: 'index.html',
        title: "Repo Studio",
        resizable: true,
        decorations: false
      });
      newWindow.once('tauri://created', () => {
        console.log('New window created');
      });
  
      newWindow.once('tauri://error', (e) => {
        console.error('Failed to create new window', e);
      });
    }

    
  }, []);

  useEffect(() => {
    if (!appWindow) return;
    
    // Only register shortcuts in the "main" window.
    if (appWindow.label !== 'main') return;
  
    // Helper function: returns true if any of the specified windows are focused.
    const checkAnyWindowFocused = async (): Promise<boolean> => {
      const labels = ['main', 'main-2', 'settings'];
      for (const label of labels) {
        const win = await WebviewWindow.getByLabel(label);
        if (win && (await win.isFocused())) {
          return true;
        }
      }
      return false;
    };
  
    const registerShortcuts = async () => {
      try {
        await register('CommandOrControl+W', () => handleNewWindow("main-2"));
      } catch (error) {
        // Handle error if needed
      }
      try {
        await register('CommandOrControl+,', () => handleNewWindow("settings"));
      } catch (error) {
        // Handle error if needed
      }
    };
  
    const unregisterShortcuts = async () => {
      try {
        await unregister('CommandOrControl+W');
      } catch (error) {
        // Handle error if needed
      }
      try {
        await unregister('CommandOrControl+,');
      } catch (error) {
        // Handle error if needed
      }
    };
  
    // Handler for focus/restore events
    const onFocusOrRestore = async () => {
      if (await checkAnyWindowFocused()) {
        registerShortcuts();
      }
    };
  
    // Handler for blur/minimize events
    const onBlurOrMinimize = async () => {
      // Unregister shortcuts if the app is minimized or none of the windows are focused.
      if (!(await checkAnyWindowFocused())) {
        unregisterShortcuts();
      }
    };
  
    // Listen for window events on the current "main" window.
    const focusUnlisten = appWindow.listen('tauri://focus', onFocusOrRestore);
    const restoreUnlisten = appWindow.listen('tauri://restore', onFocusOrRestore);
    const blurUnlisten = appWindow.listen('tauri://blur', onBlurOrMinimize);
    const minimizeUnlisten = appWindow.listen('tauri://minimize', onBlurOrMinimize);
  
    // Check initial focus state.
    checkAnyWindowFocused().then((focused) => {
      if (focused) {
        registerShortcuts();
      } else {
        unregisterShortcuts();
      }
    });
  
    // Cleanup listeners and unregister shortcuts on unmount.
    return () => {
      focusUnlisten.then((unsub) => unsub());
      restoreUnlisten.then((unsub) => unsub());
      blurUnlisten.then((unsub) => unsub());
      minimizeUnlisten.then((unsub) => unsub());
      unregisterShortcuts();
    };
  }, [appWindow, handleNewWindow]);
  

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
    if (appWindow?.label !== 'main') {
      appWindow?.close();
    } else {
      appWindow?.hide();
    }
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
        { appWindow?.label !== 'settings' && (
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
                { appWindow?.label === 'main' && (
                  <>
                    <DropdownMenu.Item
                      className='DropdownMenuItem'
                      onSelect={() => handleNewWindow("main-2")}
                    >
                      New Window
                      <div className="RightSlot">⌘+W</div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className='DropdownMenuSeparator' />
                  </>
                )}
                {/* <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger className='DropdownMenuSubTrigger disabled'>
                    View
                    <div className="RightSlot">
                      <ChevronRightIcon />
                    </div>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      className='DropdownMenuSubContent'
                      sideOffset={2}
                      alignOffset={-5}
                    >
                      <DropdownMenu.Item className="DropdownMenuItem">
                        Home <div className="RightSlot">⌘+H</div>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="DropdownMenuItem" style={{ filter: 'blur(0.15rem)' }} disabled>
                        Teamview <div className="RightSlot">⌘+T</div>
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator className='DropdownMenuSeparator' /> */}
                <DropdownMenu.Item className='DropdownMenuItem'
                onSelect={() => handleNewWindow("settings")}
                >
                  Settings <div className="RightSlot">⌘+,</div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
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
