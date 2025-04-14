// App.tsx
// This is the main component of the application.
// It contains the layout structure and the state management context providers.
// It also loads the repositories when the app starts.

import "./App.css";
import './Themes.css';
import FilePane from "./components/MainWindow/FileBrowser/FilePane";
import WindowBar from "./components/Layout/WindowBar";
import PropertiesPane from "./components/MainWindow/TabComponents/PropertiesTab/PropertiesPane";
import Popup from "./components/Layout/Popup";
import { useEffect } from "react";
import { usePopupStore, usePopupContentStore, useRightPanelContentStore, useThemeStore } from "./scripts/store/store";
import AudioPlayer from "./components/MainWindow/AudioPlayer/AudioPlayer";
import { loadRepositoriesScript } from "./scripts/RepoOperations";
import Settings from "./components/MainWindow/TabComponents/SettingsTab/Settings";
import { useTabStore } from "./scripts/store/store";
import { Cross2Icon, GearIcon, InfoCircledIcon, PlusIcon, RocketIcon, CounterClockwiseClockIcon, CodeIcon, Component1Icon, IdCardIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import ActionsPane from "./components/MainWindow/TabComponents/ActionsTab/ActionsPane";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import ConsoleTab from "./components/MainWindow/TabComponents/ConsoleTab/ConsoleTab";
import EventLogTab from "./components/MainWindow/TabComponents/EventLog/EventLogTab";
import { invoke } from "@tauri-apps/api/core";
import BundlesTab from "./components/MainWindow/TabComponents/BundlesTab/BundlesTab";
import Contacts from "./components/MainWindow/TabComponents/Contacts/Contacts";
import MailKit from "./components/MainWindow/TabComponents/MailKit/MailKit";

const ComponentMap: Record<string, React.FC> = {
  'PropertiesPane': PropertiesPane,
  'ActionsTab': ActionsPane,
  'SettingsTab': () => Settings(true),
  'ConsoleTab': ConsoleTab,
  'HistoryTab': EventLogTab,
  'BundlesTab': BundlesTab,
  'ContactsTab': Contacts,
  'MailKitTab': MailKit
  // Add other panes here
};

const IconMap: Record<string, React.ReactNode> = {
  'InfoCircledIcon': <InfoCircledIcon />,
  'ActionsIcon': <RocketIcon />,
  'SettingsIcon': <GearIcon />,
  'ConsoleIcon': <CodeIcon />,
  'HistoryIcon': <CounterClockwiseClockIcon />,
  'BundlesIcon': <Component1Icon />,
  'ContactsIcon': <IdCardIcon />,
  'MailKitIcon': <EnvelopeClosedIcon />,
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
    useTabStore.getState().setActiveTab('properties');
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      // Get the current theme from the database
      const currentSettings = await invoke("get_app_settings_command") as {
        general_auto_fingerprint: boolean;
        general_theme: string;
        audio_autoplay: boolean;
        setup_selected_repository: string;
      };
      document.body.className = currentSettings.general_theme;
      useThemeStore.setState({ theme: currentSettings.general_theme });
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    const setV = () => {
      const vh = window.innerHeight * 0.01;
      const vw = window.innerWidth * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--vw', `${vw}px`);
    };
    setV();
    window.addEventListener('resize', setV);
    return () => {
      window.removeEventListener('resize', setV);
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
  
  // List of all potential additional tabs
  const availableTabs: Array<{ id: string; name: string; iconName: string; componentId: string; hidden?: boolean }> = [
    {
      id: 'actions',
      name: 'Actions',
      iconName: 'ActionsIcon',
      componentId: 'ActionsTab',
    },
    {
      id: 'bundles',
      name: 'Bundles',
      iconName: 'BundlesIcon',
      componentId: 'BundlesTab',
      // hidden: true, // Initially hidden
    },
    {
      id: 'contacts',
      name: 'Contacts',
      iconName: 'ContactsIcon',
      componentId: 'ContactsTab',
    },
    {
      id: 'mailkit',
      name: 'MailKit',
      iconName: 'MailKitIcon',
      componentId: 'MailKitTab',
    },
    {
      id: 'console',
      name: 'Console',
      iconName: 'ConsoleIcon',
      componentId: 'ConsoleTab',
    },
    {
      id: 'history',
      name: 'History',
      iconName: 'HistoryIcon',
      componentId: 'HistoryTab',
      // hidden: true, // Initially hidden
    },
    {
      id: 'settings',
      name: 'Settings',
      iconName: 'SettingsIcon',
      componentId: 'SettingsTab',
    }
  ];

  // Determine which of these tabs are not open
  const openTabIds = new Set(tabs.map(tab => tab.id));
  const closedTabs = availableTabs.filter(
    tab => !openTabIds.has(tab.id) && (tab.hidden !== true)
  );

  return (
    <div className="tab-bar">
      <AnimatePresence>
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

      {/* Only show the plus (dropdown trigger) if there are tabs to add */}
      {closedTabs.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="tab-add" asChild>
            <motion.div>
              <PlusIcon />
            </motion.div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="DropdownMenuContent" sideOffset={5}>
              {closedTabs.map((tab) => (
                <DropdownMenu.Item
                  key={tab.id}
                  className="DropdownMenuItem Tab"
                  onSelect={() => useTabStore.getState().openTab(tab)}
                >
                  {IconMap[tab.iconName]}
                  {tab.name}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
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
          transition={{ duration: 0.1 }}
        >
          <ActiveComponent />
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export default App;
