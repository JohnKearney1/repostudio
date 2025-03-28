// WindowBar.tsx
// This component displays the title bar of the application window.
// It also contains the minimize, maximize, and close buttons.
// It uses the Tauri API to interact with the window, and is draggable by the title bar.

import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { BorderSolidIcon, SizeIcon, Cross2Icon, HamburgerMenuIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import './WindowBar.css';
import logo from '../../assets/img/64x64.png';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const WindowBar: React.FC = () => {
  const [appWindow, setAppWindow] = useState<WebviewWindow | null>(null);

  useEffect(() => {
    setAppWindow(getCurrentWebviewWindow());
  }, []);

  // Handle mouse down on the title bar
  const handleTitleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start dragging if no button was clicked on the controls
    // Double-click toggles maximize
    if (e.detail === 2 && appWindow) {
      appWindow.toggleMaximize();
    } else if (e.buttons === 1 && appWindow) {
      appWindow.startDragging();
    }
  };

  // Button handlers with event propagation stopped
  const handleMinimize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (appWindow) {
      appWindow.minimize();
    }
  };

  const handleMaximize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (appWindow) {
      appWindow.toggleMaximize();
    }
  };

  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // appWindow.close();
    if (appWindow?.label === 'repo-studio') {
      appWindow.close()
    } 
    else {
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
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className='window-title-container'
                onMouseDown={(e) => e.stopPropagation()}
                asChild
              >
                  <HamburgerMenuIcon color='white'/>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content onMouseDown={(e) => e.stopPropagation()}
                  sideOffset={11}
                  className='DropdownMenuContent'
                  >
                  { appWindow?.label === 'repo-studio' ? (
                    null
                  ) : (
                    <>
                      <DropdownMenu.Item className='DropdownMenuItem'
                      onSelect={() => {
                        const newWindow = new WebviewWindow(`repo-studio`, {
                          url: 'index.html', // or a custom route if you're using something like React Router
                          title: `repo-studio-${Date.now()}`,
                          resizable: true,
                          decorations: false
                        });
                    
                        newWindow.once('tauri://created', () => {
                          console.log('New Repo Studio window created');
                        });
                    
                        newWindow.once('tauri://error', (e): void => {
                          console.error('Failed to create new window', e);
                        });
                      }}
                    
                    >
                        New Window
                        <div className="RightSlot">⌘+N</div>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className='DropdownMenuSeparator' />
                    </>
                  )} 


                  {/* Sub Menu */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger className='DropdownMenuSubTrigger'>
                      View
                      <div className="RightSlot">
                        <ChevronRightIcon />
                      </div>
                    </DropdownMenu.SubTrigger>
                    
                  </DropdownMenu.Sub>

                  <DropdownMenu.Separator className='DropdownMenuSeparator' />

                  <DropdownMenu.Item className='DropdownMenuItem'>
                    Settings
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
      </div>
      
      <div className='window-controls'
        style={{gap: '0'}}
      >
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