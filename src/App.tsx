// App.tsx
// This is the main component of the application.
// It contains the layout structure and the state management context providers.
// It also loads the repositories when the app starts.

import "./App.css";
import FilePane from "./components/MainWindow/FileBrowser/FilePane";
import WindowBar from "./components/Layout/WindowBar";
import PropertiesPane from "./components/MainWindow/RightPanelContent/PropertiesPane/PropertiesPane";
import Popup from "./components/Layout/Popup";
import { useEffect } from "react";
import { usePopupStore, usePopupContentStore, useRightPanelContentStore } from "./scripts/store";
import AudioPlayer from "./components/MainWindow/AudioPlayer/AudioPlayer";
import { loadRepositoriesScript } from "./scripts/RepoOperations";
import Settings from "./components/SettingsWindow/Settings";
import { useTabStore } from "./scripts/store";
import { Cross2Icon, GearIcon, InfoCircledIcon, PlusIcon, RocketIcon } from "@radix-ui/react-icons";
import ActionsPane from "./components/MainWindow/RightPanelContent/ActionsPane/ActionsPane";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";


const ComponentMap: Record<string, React.FC> = {
  'PropertiesPane': PropertiesPane,
  'ActionsPane': ActionsPane,
  'Settings': () => Settings(true),
  // Add other panes here
};

const IconMap: Record<string, React.ReactNode> = {
  'InfoCircledIcon': <InfoCircledIcon />,
  'RocketIcon': <RocketIcon />,
  'GearIcon': <GearIcon />
  // Add other icons here
};

function App() {

  useEffect(() => {
    useTabStore.getState().openTab({
      id: 'properties',
      name: 'Properties',
      iconName: 'InfoCircledIcon',
      componentId: 'PropertiesPane'
    });
    useTabStore.getState().openTab({
      id: 'actions',
      name: 'Actions',
      iconName: 'RocketIcon',
      componentId: 'ActionsPane'
    });
    console.log("Tab opened: PropertiesPane");
    useTabStore.getState().setActiveTab('properties');
  }, []);
  

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

  return <Home />;
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
              <TabBar />
              <ActiveTabContent />
            </div> 
          </div>
          <AudioPlayer />
        </div>
    </div>
  );
}

function TabBar() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabStore();

  return (
    <div className="tab-bar">
      <AnimatePresence mode="wait">
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.1 }}
          >
            <button>
              {IconMap[tab.iconName]}
              {tab.name}
            </button>
            {tab.id !== 'properties' && tab.id === activeTabId && (
              <motion.button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Cross2Icon />
              </motion.button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="tab-add" asChild>
          <motion.div
          >
            <PlusIcon />
          </motion.div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="DropdownMenuContent" sideOffset={5}>
            <DropdownMenu.Item
              className="DropdownMenuItem Tab"
              onSelect={() =>
                useTabStore.getState().openTab({
                  id: 'actions',
                  name: 'Actions',
                  iconName: 'RocketIcon',
                  componentId: 'ActionsPane',
                })
              }
            >
              <RocketIcon />
              Actions
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="DropdownMenuItem Tab"
              onSelect={() =>
                useTabStore.getState().openTab({
                  id: 'settings',
                  name: 'Settings',
                  iconName: 'GearIcon',
                  componentId: 'Settings',
                })
              }
            >
              <GearIcon />
              Settings
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}



function ActiveTabContent() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const ActiveComponent = activeTab ? ComponentMap[activeTab.componentId] : null;

  return (
    <AnimatePresence mode="wait">
      {ActiveComponent && (
        <motion.div
          key={activeTabId}
          className="tab-content"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
        >
          <ActiveComponent />
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export default App;
