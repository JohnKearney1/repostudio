import {
  Component1Icon,
  // CubeIcon,
  DownloadIcon,
  // EnvelopeClosedIcon,
  InputIcon,
  LightningBoltIcon,
  MixerHorizontalIcon,
  SymbolIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import './ActionsPane.css';
import { useFileStore,
  useFingerprintCancellationStore,
  useFingerprintQueueStore
} from '../../../../scripts/store/store';
import { useEventLoggerStore } from '../../../../scripts/EventLogger';
import { getVersion } from '@tauri-apps/api/app';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ReactElement, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePopupContentStore, usePopupStore } from '../../../../scripts/store/store';
import ConvertPopup from '../../PopupComponents/ConvertPopup/ConvertPopup';
import RenamePopup from '../../PopupComponents/RenamePopup/RenamePopup';

export default function ActionsPane() {
  const allFiles = useFileStore((state) => state.allFiles);
  const fingerprintQueue = useFingerprintQueueStore((state) => state.fingerprintQueue);
  const addToQueue = useFingerprintQueueStore((state) => state.addToQueue);
  const clearQueue = useFingerprintQueueStore((state) => state.clearQueue);
  const { cancelProcessing, resetCancellation } = useFingerprintCancellationStore.getState();
  const [version, setVersion] = useState<string | null>(null);
  const [bundleProgress, setBundleProgress] = useState<number | null>(null);
  const addEvent = useEventLoggerStore((state) => state.addEvent);
  const { setContent } = usePopupContentStore();

  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getVersion();
      setVersion(version);
    };
    fetchVersion();
  }
  , []);

  useEffect(() => {
    const unlistenProgress = listen<any>("bundle_progress", (event) => {
      if (event.payload && typeof event.payload.progress === 'number') {
        setBundleProgress(event.payload.progress);
      }
    });


    const unlistenCompleted = listen("bundle_completed", () => {
      setBundleProgress(100);
      setTimeout(() => setBundleProgress(null), 1500);
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenCompleted.then((f) => f());
    };
  }, []);

  const handleShowPopup = (content: ReactElement) => {
    usePopupStore.setState({ isVisible: true });
    setContent(content);
  }

  const handleProcessRepository = () => {
    if (fingerprintQueue.length > 0) {
      alert('Fingerprinting in progress! Please wait.');
      return;
    }
    allFiles.forEach((file) => {
      if (!file.audio_fingerprint && !fingerprintQueue.find((queuedFile) => queuedFile.id === file.id)) {
        addToQueue(file);
      }
    });
  };

  const handleExportDatabase = async () => {
    try {
      const appData = await appDataDir();
      const dbPath = `${appData}/RepoStudio_AppData/db.sqlite`;
      const data = await readFile(dbPath);
      const savePath = await save({
        title: "Export Database",
        defaultPath: "db.sqlite",
        filters: [{ name: "SQLite Database", extensions: ["sqlite"] }],
      });
      if (savePath) {
        await writeFile(savePath, data);
        addEvent({
          timestamp: new Date().toISOString(),
          text: "Export Database",
          description: "Exported the SQLite Database successfully to: " + savePath,
          status: "success"
        });
        alert("Database exported successfully!");
      }
    } catch (e) {
      console.error(e);
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Export Database",
        description: "Something went wrong... Here's the info we have: " + e,
        status: "error"
      });
      alert("Failed to export database: " + e);
    }
  };

  const handleImportDatabase = async () => {
    try {
      const selected = await open({
        title: "Import Database",
        filters: [{ name: "SQLite Database", extensions: ["sqlite"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        const importedData = await readFile(selected);
        const appData = await appDataDir();
        const dbPath = `${appData}/RepoStudio_AppData/db.sqlite`;
        addEvent({
          timestamp: new Date().toISOString(),
          text: "Import Database",
          description: "Imported the database successfully! Might want to restart, just in case.",
          status: "success"
        });
        await writeFile(dbPath, importedData);
        alert("Database imported successfully! Please restart the application.");
      }
      
    } catch (e) {
      console.error(e);
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Import Database",
        description: "Whoops... The database wasn't imported for some reason. Here's the info we have: " + e,
        status: "error"
      });
      alert("Failed to import database: " + e);
    }
  };

  const handleBundle = async () => {
    const selectedFiles = useFileStore.getState().selectedFiles;
    if (selectedFiles.length === 0) {
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Bundle Selected Files",
        description: "Looks like no files were selected when you clicked the Bundle button. Select some files to bundle them!",
        status: "warning"
      });
      return;
    }
    try {
      const filePaths = selectedFiles.map(file => file.path);
      const base64Zip: string = await invoke("bundle_files_command", { filePaths });
      const binaryString = atob(base64Zip);
      const len = binaryString.length;
      const zipData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        zipData[i] = binaryString.charCodeAt(i);
      }
      
      const savePath = await save({
        title: "Save Bundled Archive",
        defaultPath: "bundle.zip",
        filters: [{ name: "Zip Archive", extensions: ["zip"] }],
      });
      if (savePath) {
        await writeFile(savePath, zipData);
        addEvent({
          timestamp: new Date().toISOString(),
          text: "Bundle Selected Files",
          description: "Files bundled successfully!",
          status: "success"
        });
      }
    } catch (e: any) {
      console.error(e);
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Bundle Selected Files",
        description: "Failed to bundle files. Here's the info we have: " + e.message,
        status: "error"
      });
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const shouldRelaunch = confirm("An update is available! Do you want to restart and apply the update?");
        if (shouldRelaunch) {
          await relaunch();
        }
      } else {
        alert("No updates available.");
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Check for Updates",
        description: "Failed to check for updates. Here's the info we have: " + error,
        status: "error"
      });
    }
  };

  return (
    <div className="actions-pane">
      <div className="actions-details">
        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid var(--border-color)',
          }}>
          Repository Actions
        </h5>

        {fingerprintQueue.length > 0 ? (
          <button
            className="actions-details-button"
            onClick={() => {
              clearQueue();
              cancelProcessing();
              setTimeout(() => resetCancellation(), 100);
            }}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LightningBoltIcon width={'15px'} height={'15px'} />
              Pause Processing
            </h4>
            <h5>Clears the Processing Queue</h5>
          </button>
        ) : (
          <button
            className="actions-details-button"
            onClick={handleProcessRepository}
            disabled={allFiles.length === 0 || fingerprintQueue.length > 0}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LightningBoltIcon width={'15px'} height={'15px'} />
              Process Repository
            </h4>
            <h5>Generates Fingerprints for all Files</h5>
          </button>
        )}

        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid var(--border-color)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          Selected Files
        </h5>
        <button
          className="actions-details-button"
          onClick={handleBundle}
          disabled={bundleProgress !== null}
        >
          {bundleProgress !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Component1Icon />
              <h4>
                Bundling... {bundleProgress}%
              </h4>
            </div>
          ) : (
            <>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Component1Icon />
                Bundle
              </h4>
              <h5>Generate a Folder / Archive</h5>
            </>
          )}
        </button>
        <button
          className="actions-details-button"
          onClick={() => {
            handleShowPopup(<ConvertPopup />);
          }}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MixerHorizontalIcon />
            Convert
          </h4>
          <h5>Change Audio Encodings</h5>
        </button>
        <button
          className="actions-details-button"
          onClick={() => {
            handleShowPopup(<RenamePopup />);
          }}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <InputIcon />
            Rename
          </h4>
          <h5>Add Prefix or Suffix to Filename(s)</h5>
        </button>

        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid var(--border-color)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          System
        </h5>
        <button className="actions-details-button" onClick={handleCheckForUpdates}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SymbolIcon /> Check for Updates
          </h4>
          <h5>RS {version}</h5>
        </button>


        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid var(--border-color)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          Advanced
        </h5>

        <button
          className="actions-details-button"
          onClick={handleExportDatabase}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadIcon />
            Export Database
          </h4>
          <h5>Export the SQLite Database</h5>
        </button>
        <button
          className="actions-details-button"
          onClick={handleImportDatabase}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DownloadIcon />
            Import Database
          </h4>
          <h5>Import a SQLite Database</h5>
        </button>
        
      </div>
    </div>
  );
}
