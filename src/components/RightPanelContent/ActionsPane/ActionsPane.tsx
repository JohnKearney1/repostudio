import { BoxModelIcon, CommitIcon, Component1Icon, CubeIcon, DownloadIcon, EnvelopeClosedIcon, FaceIcon, InputIcon, LightningBoltIcon, MixerHorizontalIcon, RocketIcon, SymbolIcon, UploadIcon } from '@radix-ui/react-icons';
import './ActionsPane.css';
import { useFileStore } from '../../../scripts/store';


export default function ActionsPane() {
      const selectedFiles = useFileStore((state) => state.selectedFiles);
    
    return (
        <div className="actions-pane">
        <div className="actions-header">
            <div className="actions-header-icon">
            <RocketIcon width={'20px'} height={'20px'} />
            <div className="actions-header-icon-bg">
                <h4>Actions</h4>
                <h5>
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'} Selected
                </h5>
            </div>
            </div>
        </div>
        <div className="actions-details">
            <h5 style={{padding: '0.5rem', fontSize: '0.8rem',
                borderBottom: '1px solid #2a2a2a'
                }}>
                Repository Actions
            </h5>
            <button className="actions-details-button">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LightningBoltIcon />
                    Process Repository
                </h4>
                <h5>Generates Fingerprints for all Files</h5>
            </button>
            <button className="actions-details-button">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CubeIcon />
                    New Repo From Meta
                </h4>
                <h5>Creates and Populates a new Repository</h5>
            </button>
            <h5 style={{padding: '0.5rem', fontSize: '0.8rem',
                borderBottom: '1px solid #2a2a2a',
                borderTop: '1px solid #2a2a2a'

                }}>
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

            <h5 style={{padding: '0.5rem', fontSize: '0.8rem',
                borderBottom: '1px solid #2a2a2a',
                borderTop: '1px solid #2a2a2a'

                }}>
                Sharing
            </h5>

            <button className="actions-details-button">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <EnvelopeClosedIcon />
                    MailKit
                </h4>
                <h5>Automated Mailing Toolkit</h5>
            </button>

            <h5 style={{padding: '0.5rem', fontSize: '0.8rem',
                borderBottom: '1px solid #2a2a2a',
                borderTop: '1px solid #2a2a2a'

                }}>
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
                <h5>Version: 0.1.3-a</h5>
            </button>

            <h5 style={{padding: '0.5rem', fontSize: '0.8rem',
                borderBottom: '1px solid #2a2a2a',
                borderTop: '1px solid #2a2a2a'

                }}>
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
