import React, { useState, useEffect } from "react";
import { getAutoFingerprintSetting, setAutoFingerprintSetting } from "../../../../../scripts/FingerprintProcessing";
import { useAppSettingsStore } from "../../../../../scripts/store/store";

export default function STGeneral() {
  const [autoFingerprint, setAutoFingerprint] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load the settings from the database when the component mounts.
  useEffect(() => {
    async function loadSettings() {
      try {
        setAutoFingerprint(await getAutoFingerprintSetting());
      } catch (error) {
        console.error("Failed to load app settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);
  

  const handleAutoFingerprintChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = e.target.checked;
    setAutoFingerprint(checked);
  
    try {
      await setAutoFingerprintSetting(checked);
      useAppSettingsStore.setState({ autoFingerprint: checked });

    } catch (error) {
      console.error("Failed to update app settings:", error);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div style={{ width: "100%" }}>
      <h4>General Settings</h4>
      <div className="divider" />

      <div className="settings-checkbox">
        <input
          type="checkbox"
          id="autofingerprint"
          checked={autoFingerprint}
          onChange={handleAutoFingerprintChange}
        />
        <h6>Fingerprint Automatically</h6>
      </div>
      <h5>Automatically generates fingerprints when needed.</h5>
    </div>
  );
}
