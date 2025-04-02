// fingerprintProcessing.tsx
import { fingerprintFileScript } from './FileOperations';
import { useFingerprintQueueStore, useFingerprintCancellationStore } from './store';
import { Repository, FileMetadata } from '../types/ObjectTypes';

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

  // Loop until the queue is empty or processing is cancelled
  while (
    useFingerprintQueueStore.getState().fingerprintQueue.length > 0 &&
    !useFingerprintCancellationStore.getState().processingCancelled
  ) {
    // Always get the latest queue state to ensure accuracy
    const queue: FileMetadata[] = useFingerprintQueueStore.getState().fingerprintQueue;
    const file = queue[0];

    try {
      console.log(`Starting fingerprint generation for file: ${file.name}`);
      await fingerprintFileScript(selectedRepository, file);
      console.log(`Fingerprint generated for file: ${file.name}`);
    } catch (error) {
      console.error(`Error fingerprinting file ${file.name}:`, error);
    }

    // Remove the processed file from the queue
    useFingerprintQueueStore.getState().setQueue((currentQueue) => currentQueue.slice(1));
  }
}
