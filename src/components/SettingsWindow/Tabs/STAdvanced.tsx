export default function STAdvanced() {
    return (
        <div style={{ width: "100%" }}>
            <h4>Advanced Settings</h4>
            <div className="divider" />

            <div className="settings-checkbox">
                <input type="checkbox" id="autoplay" disabled/>
                <h6>Send Usage Statistics</h6>
            </div>
            <h5>
                Helps developers improve the app by sending anonymous usage stats.
            </h5>
        </div>
    );
}
