import {
  BoxModelIcon,
  Component1Icon,
  CubeIcon,
  DownloadIcon,
  EnvelopeClosedIcon,
  FaceIcon,
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

export default function ActionsPane() {
  const allFiles = useFileStore((state) => state.allFiles);
  const fingerprintQueue = useFingerprintQueueStore((state) => state.fingerprintQueue);
  const addToQueue = useFingerprintQueueStore((state) => state.addToQueue);
  const clearQueue = useFingerprintQueueStore((state) => state.clearQueue);
  const { cancelProcessing, resetCancellation } = useFingerprintCancellationStore.getState();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getVersion();
      setVersion(version);
    };
    fetchVersion();
  }
  , []);

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

        { fingerprintQueue.length > 0 ? (
          <button
            className="actions-details-button"
            onClick={() => {
              clearQueue(); // Empties the fingerprint queue in your Zustand store.
              cancelProcessing(); // Sets processingCancelled to true.
              console.log('Processing cancelled. Fingerprint queue cleared.');
              // Optionally, reset the cancellation flag after a short delay if you want future processing to resume.
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
          <button className="actions-details-button" onClick={handleProcessRepository}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LightningBoltIcon width={'15px'} height={'15px'} />
              Process Repository
            </h4>
            <h5>Generates Fingerprints for all Files</h5>
          </button>
        )}

        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CubeIcon width={'15px'} height={'15px'} />
            New Repo From Meta
          </h4>
          <h5>Creates and Populates a new Repository</h5>
        </button>
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
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Component1Icon />
            Bundle
          </h4>
          <h5>Generate a Folder / Archive</h5>
        </button>
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BoxModelIcon />
            Compress
          </h4>
          <h5>Compress File Sizes</h5>
        </button>
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MixerHorizontalIcon />
            Convert
          </h4>
          <h5>Change Audio Encodings</h5>
        </button>
        <button className="actions-details-button">
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
          Sharing
        </h5>
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <EnvelopeClosedIcon />
            MailKit
          </h4>
          <h5>Automated Mailing Toolkit</h5>
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
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaceIcon />
            Stats
          </h4>
          <h5>Understand your Library</h5>
        </button>
        <button className="actions-details-button">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SymbolIcon />
            Check for Updates
          </h4>
          <h5>Version: {version}</h5>
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
        <button className="actions-details-button" onClick={handleExportDatabase}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DownloadIcon />
            Export Database
          </h4>
          <h5>Backup Your Settings and Repositories</h5>
        </button>
        <button className="actions-details-button" onClick={handleImportDatabase}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadIcon />
            Import Database
          </h4>
          <h5>Import a Backup</h5>
        </button>
      </div>
    </div>
  );
}
