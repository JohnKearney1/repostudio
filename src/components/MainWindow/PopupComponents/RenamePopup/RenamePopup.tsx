import { Pencil1Icon } from '@radix-ui/react-icons';
import './RenamePopup.css';

export default function RenamePopup() {
    return (
        <div className='ActionPopup'>
            <h4>Rename</h4>
            <h5>
                Adds a prefix and/or suffix to the selected files.
            </h5>
            <form className='RenamePopupForm'>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center' }}>
                    <input type='text' id='prefix' name='prefix' placeholder='Prefix' className='rename-input'/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center' }}>
                    <input type='text' id='suffix' name='suffix' placeholder='Suffix' className='rename-input'/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center' }}>
                    <input type='text' id='remove' name='remove' placeholder='Remove' className='rename-input'/>
                </div>
            </form>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center' }}>
                <select id='case' name='case' className='dropdown-menu'>
                    <option value='ignore'>Ignore Casing</option>
                    <option value='lower'>To Lowercase</option>
                    <option value='upper'>To Uppercase</option>
                </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <button className='rename-button'>
                    <Pencil1Icon />
                    Rename
                </button>
            </div>
        </div>
    );
}