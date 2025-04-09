import { MixIcon } from '@radix-ui/react-icons';
import './ConvertPopup.css';

export default function ConvertPopup() {
    return (
        <div className="ActionPopup">
            <h4>Convert</h4>
            <h5>Converts selected files to a single format!</h5>
            <select className='dropdown-menu'>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="ogg">OGG</option>
                <option value="flac">FLAC</option>
                <option value="aac">AAC</option>
            </select>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <button className='rename-button'>
                    <MixIcon />
                    Encode
                </button>
            </div>
        </div>
    );
}