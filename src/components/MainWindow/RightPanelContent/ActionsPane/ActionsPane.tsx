import {
    BoxModelIcon,
    CommitIcon,
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
  import { useFileStore, useFingerprintCancellationStore, useFingerprintQueueStore } from '../../../../scripts/store';
  
  export default function ActionsPane() {
    const allFiles = useFileStore((state) => state.allFiles);
    const fingerprintQueue = useFingerprintQueueStore((state) => state.fingerprintQueue);
    const addToQueue = useFingerprintQueueStore((state) => state.addToQueue);
    const clearQueue = useFingerprintQueueStore((state) => state.clearQueue);
    const { cancelProcessing, resetCancellation } = useFingerprintCancellationStore.getState();

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
          </button>)}

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
              <CommitIcon />
              Event Log
            </h4>
            <h5>View Repository History</h5>
          </button>
          <button className="actions-details-button">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SymbolIcon />
              Check for Updates
            </h4>
            <h5>Version: 0.1.6</h5>
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
          <button className="actions-details-button">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DownloadIcon />
              Export Database
            </h4>
            <h5>Backup Your Settings and Repositories</h5>
          </button>
          <button className="actions-details-button">
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
  