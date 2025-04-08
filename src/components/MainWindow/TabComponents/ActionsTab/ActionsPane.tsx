import {
  BoxModelIcon,
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
import './ActionsPane.css';
import { useFileStore, useFingerprintCancellationStore, useFingerprintQueueStore } from '../../../../scripts/store/store';
import { getVersion } from '@tauri-apps/api/app';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion } from 'framer-motion';

export default function ActionsPane() {
  const allFiles = useFileStore((state) => state.allFiles);
  const fingerprintQueue = useFingerprintQueueStore((state) => state.fingerprintQueue);
  const addToQueue = useFingerprintQueueStore((state) => state.addToQueue);
  const clearQueue = useFingerprintQueueStore((state) => state.clearQueue);
  const { cancelProcessing, resetCancellation } = useFingerprintCancellationStore.getState();
  const [version, setVersion] = useState<string | null>(null);
  const [bundleProgress, setBundleProgress] = useState<number | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getVersion();
      setVersion(version);
    };
    fetchVersion();
  }
  , []);

  // Listen for bundling progress events from the backend.
  useEffect(() => {
    // Listener for progress updates.
    const unlistenProgress = listen<any>("bundle_progress", (event) => {
      // Update progress bar state based on the payload from the Rust event.
      if (event.payload && typeof event.payload.progress === 'number') {
        setBundleProgress(event.payload.progress);
      }
    });

    // Listener for bundling completion.
    const unlistenCompleted = listen("bundle_completed", () => {
      setBundleProgress(100);
      // Optionally clear the progress bar after a short delay.
      setTimeout(() => setBundleProgress(null), 1500);
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenCompleted.then((f) => f());
    };
  }, []);

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
    console.log(`Added ${allFiles.length} files to the fingerprint queue.`);
  };

  // Export Database: reads the current db file and saves it to a user chosen location
  const handleExportDatabase = async () => {
    try {
      const appData = await appDataDir();
      // Construct the path to your database file
      const dbPath = `${appData}/RepoStudio_AppData/db.sqlite`;
      // Read the database as binary
      const data = await readFile(dbPath);
      // Open a save dialog so the user can choose where to export the file
      const savePath = await save({
        title: "Export Database",
        defaultPath: "db.sqlite",
        filters: [{ name: "SQLite Database", extensions: ["sqlite"] }],
      });
      if (savePath) {
        await writeFile(savePath, data);
        alert("Database exported successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to export database: " + e);
    }
  };

  // Import Database: lets the user select a db file and then overwrites the current db file
  const handleImportDatabase = async () => {
    try {
      // Open a file selection dialog
      const selected = await open({
        title: "Import Database",
        filters: [{ name: "SQLite Database", extensions: ["sqlite"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        // Read the selected file as binary
        const importedData = await readFile(selected);
        const appData = await appDataDir();
        const dbPath = `${appData}/RepoStudio_AppData/db.sqlite`;
        // Overwrite the existing database with the imported data
        await writeFile(dbPath, importedData);
        alert("Database imported successfully! Please restart the application.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to import database: " + e);
    }
  };

  // New handler for the Bundle button that uses base64 conversion.
  const handleBundle = async () => {
    const selectedFiles = useFileStore.getState().selectedFiles;
    if (selectedFiles.length === 0) {
      alert("Select one or more files to bundle! Nothing was selected this time.");
      return;
    }
    try {
      const filePaths = selectedFiles.map(file => file.path);
      console.log("Selected files for bundling:", filePaths);

      // Invoke the Rust command; note that it now returns a base64 string.
      const base64Zip: string = await invoke("bundle_files_command", { filePaths });
      
      // Decode the base64 string into a binary Uint8Array.
      const binaryString = atob(base64Zip);
      const len = binaryString.length;
      const zipData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        zipData[i] = binaryString.charCodeAt(i);
      }
      
      // Prompt the user to choose a save location.
      const savePath = await save({
        title: "Save Bundled Archive",
        defaultPath: "bundle.zip",
        filters: [{ name: "Zip Archive", extensions: ["zip"] }],
      });
      if (savePath) {
        await writeFile(savePath, zipData);
        alert("Files bundled successfully!");
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to bundle files: " + e);
    }
  };

  return (
    <div className="actions-pane">
      <div className="actions-details">
        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          Repository Actions
        </h5>

        {fingerprintQueue.length > 0 ? (
          <motion.button
            className="actions-details-button"
            onClick={() => {
              clearQueue();
              cancelProcessing();
              console.log('Processing cancelled. Fingerprint queue cleared.');
              setTimeout(() => resetCancellation(), 100);
            }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LightningBoltIcon width={'15px'} height={'15px'} />
              Pause Processing
            </h4>
            <h5>Clears the Processing Queue</h5>
          </motion.button>
        ) : (
          <motion.button
            className="actions-details-button"
            onClick={handleProcessRepository}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LightningBoltIcon width={'15px'} height={'15px'} />
              Process Repository
            </h4>
            <h5>Generates Fingerprints for all Files</h5>
          </motion.button>
        )}

        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid #2a2a2a',
            borderTop: '1px solid #2a2a2a',
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

        {/* More buttons like Compress, Convert, Rename, etc. */}
        <button
          className="actions-details-button"
          onClick={() => {}}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BoxModelIcon />
            Compress
          </h4>
          <h5>Compress File Sizes</h5>
        </button>
        <button
          className="actions-details-button"
          onClick={() => {}}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MixerHorizontalIcon />
            Convert
          </h4>
          <h5>Change Audio Encodings</h5>
        </button>
        <button
          className="actions-details-button"
          onClick={() => {}}
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
            borderBottom: '1px solid #2a2a2a',
            borderTop: '1px solid #2a2a2a',
          }}
        >
          System
        </h5>
        <button
          className="actions-details-button"
          onClick={() => {}}
        >
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SymbolIcon />
            Check for Updates
          </h4>
          <h5>RS {version}</h5>
        </button>


        <h5
          style={{
            padding: '0.5rem',
            fontSize: '0.8rem',
            borderBottom: '1px solid #2a2a2a',
            borderTop: '1px solid #2a2a2a',
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
