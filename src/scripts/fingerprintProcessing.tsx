// fingerprintProcessing.tsx
import { fingerprintFileScript } from './FileOperations';
import { useFingerprintQueueStore, useFingerprintCancellationStore } from './store/store';
import { Repository, FileMetadata } from '../types/ObjectTypes';
import { invoke } from '@tauri-apps/api/core';

/**
 * Processes the fingerprint queue for the given repository.
 * This function sequentially processes each file in the queue by invoking
 * the Tauri command to generate the audio fingerprint.
 *
 * @param selectedRepository - The repository for which fingerprinting should occur.
 */
export async function processFingerprintQueue(selectedRepository: Repository | null): Promise<void> {
  if (!selectedRepository) {
    console.warn("No repository selected for fingerprinting.");
    return;
  }
  while (
    useFingerprintQueueStore.getState().fingerprintQueue.length > 0 &&
    !useFingerprintCancellationStore.getState().processingCancelled
  ) {
    const queue: FileMetadata[] = useFingerprintQueueStore.getState().fingerprintQueue;
    const file = queue[0];
    try {
      await fingerprintFileScript(selectedRepository, file);
    } catch (error) {
      console.error(`Error fingerprinting file ${file.name}:`, error);
    }
    useFingerprintQueueStore.getState().setQueue((currentQueue) => currentQueue.slice(1));
  }
}


export async function getAutoFingerprintSetting(): Promise<boolean> {
  try {
    const settings = await invoke("get_app_settings_command") as {
      general_auto_fingerprint: boolean;
      audio_autoplay: boolean;
      setup_selected_repository: string;
    };
    return settings.general_auto_fingerprint;
  } catch (error) {
    console.error("Failed to load app settings:", error);
    return false;
  }
}

export async function setAutoFingerprintSetting(value: boolean): Promise<void> {
  try {
    const currentSettings = await invoke("get_app_settings_command") as {
      general_auto_fingerprint: boolean;
      audio_autoplay: boolean;
      setup_selected_repository: string;
    };
    await invoke("update_app_settings_command", {
      args: {
        general_auto_fingerprint: value,
        audio_autoplay: currentSettings.audio_autoplay,
        setup_selected_repository: currentSettings.setup_selected_repository,
      }
    });
  } catch (error) {
    console.error("Failed to update app settings:", error);
  }
}