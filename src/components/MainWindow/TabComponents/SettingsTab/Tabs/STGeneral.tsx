import React, { useState, useEffect } from "react";
import { getAutoFingerprintSetting, setAutoFingerprintSetting } from "../../../../../scripts/fingerprintProcessing";
import { useAppSettingsStore, useThemeStore } from "../../../../../scripts/store/store";
import { invoke } from "@tauri-apps/api/core";

export default function STGeneral() {
  const [autoFingerprint, setAutoFingerprint] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTheme, setCurrentTheme] = useState<string>("theme-dark");

  // Load the settings from the database when the component mounts.
  useEffect(() => {
    (async () => {
      try {
        // Get the current theme setting from the store and apply it to the document body.
        const currentTheme = useThemeStore.getState().theme;
        setCurrentTheme(currentTheme);

        const currentSettings = await invoke("get_app_settings_command") as {
          general_auto_fingerprint: boolean;
          audio_autoplay: boolean;
          setup_selected_repository: string;
        };

        await invoke("update_app_settings_command", {
          args: {
            general_auto_fingerprint: currentSettings.general_auto_fingerprint,
            general_theme: currentTheme,
            audio_autoplay: currentSettings.audio_autoplay,
            setup_selected_repository: currentSettings.setup_selected_repository,
          }
        });

        setAutoFingerprint(await getAutoFingerprintSetting());
      } catch (error) {
        console.error("Failed to load app settings:", error);
      } finally {
        setLoading(false);
      }
    })();
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


      <div className="settings-dropdown" style={{ marginTop: "1rem" }}>
        <select
          className="dropdown-menu"
          id="theme"
          value={currentTheme}
          onChange={async (e) => {
          const selectedTheme = e.target.value;
          try {
            const currentSettings = await invoke("get_app_settings_command") as {
              general_auto_fingerprint: boolean;
              audio_autoplay: boolean;
              setup_selected_repository: string;
            };
  
            await invoke("update_app_settings_command", {
              args: {
                general_auto_fingerprint: currentSettings.general_auto_fingerprint,
                general_theme: selectedTheme,
                audio_autoplay: currentSettings.audio_autoplay,
                setup_selected_repository: currentSettings.setup_selected_repository,
              }
            }
          );
  
            document.body.className = selectedTheme;
            useThemeStore.setState({ theme: selectedTheme });
            setCurrentTheme(selectedTheme);
          }
          catch (error) {
            console.error("Failed to update app settings:", error);
          }
        }}
        >
          <option value="theme-light">Light</option>
          <option value="theme-medium">Greyscale</option>
          <option value="theme-dark">Dark</option>
          <option value="theme-rouge">Neon Twilight</option>
          <option value="theme-ocean">Deep Ocean</option>
          <option value="theme-sunset">Desert Sunset</option>
          <option value="theme-forest">Dark Forest</option>
          <option value="theme-violet">Muted Violet</option>
        </select>
      </div>
    </div>
  );
}
  