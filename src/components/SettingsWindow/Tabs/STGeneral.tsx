export default function STGeneral() {
    return (
        <div style={{ width: "100%" }}>
            <h4>General Settings</h4>
            <div className="divider" />

            <div className="settings-checkbox">
                <input type="checkbox" id="autoplay" />
                <h6>Fingerprint Automatically</h6>
            </div>
            <h5>
                Automatically generates fingerprints when needed.
            </h5>
        </div>
    );
}
