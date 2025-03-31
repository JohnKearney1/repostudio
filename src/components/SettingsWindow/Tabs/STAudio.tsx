export default function STAudio() {
    return (
        <div style={{ width: "100%" }}>
            
            <h4>Audio Settings</h4>
            <div className="divider" />

            <div className="settings-checkbox">
                <input type="checkbox" id="autoplay" disabled/>
                <h6>Disable Audio Player</h6>
            </div>
            <h5>
                Disables the audio player in the bottom corner of the screen.
            </h5>

            <div className="divider" />

            <div className="settings-checkbox">
                <input type="checkbox" id="autoplay" checked={true} disabled/>
                <h6>Autoplay</h6>
                
            </div>
            <h5>
                Continue playing when a new song is selected.
            </h5>

            <div className="divider" />
            
        </div>
    );
}
