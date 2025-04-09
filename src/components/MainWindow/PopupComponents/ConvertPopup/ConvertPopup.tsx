import { Cross1Icon, FileIcon, InfoCircledIcon, MixIcon } from '@radix-ui/react-icons';
import { useFileStore, usePopupStore } from '../../../../scripts/store/store';
import './ConvertPopup.css';

export default function ConvertPopup() {
    const selectedFiles = useFileStore((state) => state.selectedFiles);
    const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
    const setVisible = usePopupStore((state) => state.setVisible);
    
    return (
        <div className="ConvertPopup">
            <div className="ConvertPopupContainer">
                <h4>Convert</h4>
                <h5>{selectedFiles.length} Files Selected</h5>
                <div className='divider' />

                {selectedFiles.length > 0 && (
                    <>
                        
                        <div className="ConvertPopupFileList">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="list-item-popup"
                                    onClick={() => {
                                        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                                        if (selectedFiles.length === 1) {
                                            setVisible(false);
                                        }
                                    }}
                                >
                                    {file.name}
                                    <FileIcon />
                                </div>
                            ))}
                        </div>
                        <div className='divider' />
                        <div className='ConvertPopupDropdownContainer'>
                            <h5 style={{textWrap: 'nowrap'}}>Convert to:</h5>
                            <select className='ConvertPopupDropdown'>
                                <option value="mp3">MP3</option>
                                <option value="wav">WAV</option>
                                <option value="flac">FLAC</option>
                                <option value="ogg">OGG</option>
                                <option value="aac">AAC</option>
                                <option value="m4a">M4A</option>
                            </select>
                        </div>
                        <div className='divider' />
                        <button className='ConvertPopupButton' onClick={() => {}}>
                            <MixIcon />
                            Convert
                        </button>
                    </>
                )}
                {selectedFiles.length === 0 && (
                    <>
                        <div className='ConvertPopupDropdownContainer'>
                            <InfoCircledIcon />
                            <h5>Select one or multiple files to view conversion options.</h5>
                        </div>
                        <br />
                        <button className='ConvertPopupButton' onClick={() => {
                            setVisible(false);
                        }}>
                            <Cross1Icon />
                            Close
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}