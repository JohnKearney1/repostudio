import { Pencil1Icon, FileIcon, InfoCircledIcon, Cross1Icon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useFileStore, usePopupStore } from '../../../../scripts/store/store';
import { useState } from 'react';
import './RenamePopup.css';

export default function RenamePopup() {
    const [ renameMode, setRenameMode ] = useState('prefix'); // 'prefix', 'suffix', 'replace'
    const selectedFiles = useFileStore((state) => state.selectedFiles);
    const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
    const setVisible = usePopupStore((state) => state.setVisible);
    

    return (
        <div className='ConvertPopup'>
            <div className='ConvertPopupContainer'>
                <h4>Rename</h4>
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
                        <select className='ConvertPopupDropdown'
                            value={renameMode}
                            onChange={(e) => setRenameMode(e.target.value)}
                        >
                            <option value="prefix">Add Prefix to Filename</option>
                            <option value="suffix">Add Suffix to Filename</option>
                            <option value="replace">Replace in Filename</option>
                        </select>
                        {renameMode === 'replace' && (
                            <div className='ConvertPopupDropdownContainer'>
                                <input type="text" className='ConvertPopupInput' placeholder='Text to replace' />
                                <ChevronRightIcon width={'2.5rem'}/>
                                <input type="text" className='ConvertPopupInput' placeholder='Replace With' />
                            </div>
                        )}
                        {renameMode === 'prefix' && (
                            <div className='ConvertPopupDropdownContainer'>
                                <input type="text" className='ConvertPopupInput' placeholder='Prefix Text' />
                            </div>
                        )}
                        {renameMode === 'suffix' && (
                            <div className='ConvertPopupDropdownContainer'>
                                <input type="text" className='ConvertPopupInput' placeholder='Suffix Text' />
                            </div>
                        )}
                        <div className='divider' />
                        <button className='ConvertPopupButton' onClick={() => {}}>
                            <Pencil1Icon />
                            Rename
                        </button>
                    </>
                )}
                {selectedFiles.length === 0 && (
                    <>
                        <div className='ConvertPopupDropdownContainer'>
                            <InfoCircledIcon />
                            <h5>Select one or multiple files to view renaming options.</h5>
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