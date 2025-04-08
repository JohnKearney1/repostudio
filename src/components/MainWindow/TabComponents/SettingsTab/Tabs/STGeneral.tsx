import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function STGeneral() {
  const [autoFingerprint, setAutoFingerprint] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load the settings from the database when the component mounts.
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await invoke("get_app_settings_command") as {
            general_auto_fingerprint: boolean;
            audio_autoplay: boolean;
            setup_selected_repository: string;
        };
        setAutoFingerprint(settings.general_auto_fingerprint);
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
      // Retrieve the current settings to ensure you have the most recent state
      const currentSettings = await invoke("get_app_settings_command") as {
          general_auto_fingerprint: boolean;
          audio_autoplay: boolean;
          setup_selected_repository: string;
      };
  
      await invoke("update_app_settings_command", {
        args: {
          general_auto_fingerprint: checked,
          audio_autoplay: currentSettings.audio_autoplay,
          setup_selected_repository: currentSettings.setup_selected_repository,
        }
      });
      
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
