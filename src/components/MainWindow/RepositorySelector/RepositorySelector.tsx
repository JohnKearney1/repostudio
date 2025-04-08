import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './RepositorySelector.css';
import { CubeIcon, PlusIcon, TrashIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { useRepositoryStore } from '../../../scripts/store/store';
import { Repository } from '../../../types/ObjectTypes';
import { deleteRepository, createRepository } from '../../../scripts/RepoOperations';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventLoggerStore } from '../../../scripts/store/EventLogger';
import { updateSelectedRepository } from '../../../scripts/RepoOperations';

const RepositorySelector: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const setSelectedRepository = useRepositoryStore((state) => state.setSelectedRepository);
  const { setRepositories: setRepoStore } = useRepositoryStore.getState();
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const alertTimeoutRef = useRef<number | null>(null);
  const { addEvent } = useEventLoggerStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);

  // Fetch repositories from backend and sync state/store.
  const fetchRepositories = async () => {
    try {
      const repos = await invoke<Repository[]>('get_repositories_command');
      setRepositories(repos);
      setRepoStore(repos);
    } catch (err) {
      console.error('Failed to load repositories', err);
    }
  };

  useEffect(() => {
    const initializeRepositories = async () => {
      await fetchRepositories();
      await fetchSelectedRepository();  // This must be called AFTER fetchRepositories
    };
  
    initializeRepositories();
  
    const unlistenCreate = listen('create_repository_completed', () => fetchRepositories());
    const unlistenDelete = listen('delete_repository_completed', () => fetchRepositories());
  
    return () => {
      unlistenCreate.then((unlisten) => unlisten());
      unlistenDelete.then((unlisten) => unlisten());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  
  const fetchSelectedRepository = async () => {
    try {
      const currentSettings = await invoke("get_app_settings_command") as {
        general_auto_fingerprint: boolean;
        audio_autoplay: boolean;
        setup_selected_repository: string;
      };

      console.log('fetching repository:', currentSettings);
      
      const selectedRepoId = currentSettings.setup_selected_repository;
      if (!selectedRepoId) return; 
  
      const repo = repositories.find(r => r.id === selectedRepoId);
      if (repo) {
        setSelectedRepository(repo);  
      }
    } catch (err) {
      console.error('Failed to load selected repository', err);
    }
  };
  
  


  const handleFieldChange = (updatedRepo: Repository) => {
    setSelectedRepository(updatedRepo);
    handleUpdateRepository(updatedRepo);

    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    setShowSavedAlert(true);
    alertTimeoutRef.current = window.setTimeout(() => setShowSavedAlert(false), 2500);
  };

  const handleUpdateRepository = async (updatedRepo: Repository) => {
    try {
      await invoke('update_repository_command', {
        id: updatedRepo.id,
        name: updatedRepo.name,
        description: updatedRepo.description,
      });
    } catch (err) {
      console.error('Failed to update repository', err);
    }
  };

  const handleAddRepository = async () => {
    let newId = crypto.randomUUID();
    while (repositories.some((repo) => repo.id === newId)) {
      newId = crypto.randomUUID();
    }

    try {
      await createRepository(newId, 'New Repository', '');
      addEvent({
        timestamp: new Date().toISOString(),
        text: `new-repository`,
        description: 'New repository created successfully: ' + newId,
        status: 'success',
      });
    }
    catch (err) {
      console.error('Failed to create repository', err);
      addEvent({
        timestamp: new Date().toISOString(),
        text: `new-repository`,
        description: 'Failed to create new repository: ' + newId,
        status: 'error',
      });
    }

  };

  const handleRemoveRepository = async () => {
    if (repositories.length <= 1) {
      alert('Whoops! Make a new repository before you delete this one.');
      return;
    }

    try {
      const deletedRepoId = selectedRepository?.id;
      
      if (!deletedRepoId) return;

      // Determine the index of the repository being deleted
      const deletedRepoIndex = repositories.findIndex(repo => repo.id === deletedRepoId);

      // Remove the repository from the list
      await deleteRepository(deletedRepoId);

      addEvent({
        timestamp: new Date().toISOString(),
        text: `delete-repository`,
        description: `Repository deleted successfully: ${deletedRepoId}`,
        status: 'success',
      });

      // Fetch updated repository list
      await fetchRepositories();
      
      // Determine which repository to select next
      let nextRepo: Repository | null = null;

      if (repositories.length > 0) {
        if (deletedRepoIndex < repositories.length - 1) {
          // Select the next repository in the list
          nextRepo = repositories[deletedRepoIndex + 1];
        } else {
          // Select the previous repository if no next exists
          nextRepo = repositories[deletedRepoIndex - 1];
        }
      }

      if (nextRepo) {
        await updateSelectedRepository(nextRepo);
        const { setSelectedRepository } = useRepositoryStore.getState();
        setSelectedRepository(nextRepo);
      } else {
        setSelectedRepository(null); // No repositories left
      }
    }
    catch (err) {
      console.error('Failed to delete repository', err);
      addEvent({
        timestamp: new Date().toISOString(),
        text: `delete-repository`,
        description: `Failed to delete repository: ${selectedRepository?.id}`,
        status: 'error',
      });
    }
  };

  // New handler for the delete button confirmation logic.
  const handleDeleteButtonClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Set a 2-second timer to reset the button
      confirmTimeoutRef.current = window.setTimeout(() => {
        setConfirmDelete(false);
      }, 2000);
    } else {
      // User confirmed deletion by clicking again within 2 seconds
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = null;
      }
      handleRemoveRepository();
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      className='repo-selector'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className='repo-btn-container'
        style={{ borderBottom: '1px solid #333', justifyContent: 'center', alignItems: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className='repo-info'>
          {selectedRepository ? (
            <>
              <div className='repo-name-input-container' style={{ position: 'relative', display: 'inline-block' }}>
                <input
                  type='text'
                  value={selectedRepository.name}
                  onChange={(e) => {
                    const updatedRepo = { ...selectedRepository, name: e.target.value };
                    handleFieldChange(updatedRepo);
                  }}
                  className='repo-name-input'
                  placeholder='Repository Name'
                />
                <AnimatePresence>
                  {showSavedAlert && (
                    <motion.div
                      className='saved-alert'
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircledIcon />
                      Changes saved!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <h5 style={{ userSelect: 'none' }}>#{selectedRepository.id}</h5>
              <textarea
                placeholder='Add a description...'
                className='repo-desc'
                rows={3}
                cols={70}
                value={selectedRepository.description}
                onChange={(e) => {
                  const updatedRepo = { ...selectedRepository, description: e.target.value };
                  handleFieldChange(updatedRepo);
                }}
              />
            </>
          ) : (
            <p>No repository selected</p>
          )}
        </div>

        <motion.div
          className='repo-btn-container'
          style={{ flexDirection: 'row', justifyContent: 'center', padding: '0', width: '90%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.button
            onClick={handleAddRepository}
            className='repo-btn'
          >
            <PlusIcon />
            New Repository
          </motion.button>
          <motion.button
            onClick={handleDeleteButtonClick}
            className='repo-btn'
            animate={{ backgroundColor: confirmDelete ? '#ff0000' : '#1a1a1a'}}
            transition={{ duration: 0.3 }}
          >
            <TrashIcon />
            {confirmDelete ? 'Confirm Deletion' : 'Delete Repository'}
          </motion.button>
        </motion.div>
      </motion.div>
      <motion.div
        className='repo-btn-container2'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
          {repositories.map((repository) => (
            <RepoButton
            key={repository.id}
            repository={repository}
            isSelected={selectedRepository?.id === repository.id}
            onClick={() => {
              if (!selectedRepository || selectedRepository.id !== repository.id) {
                updateSelectedRepository(repository).then(() => {
                  // Ensure the store is updated after the database operation
                  const { setSelectedRepository } = useRepositoryStore.getState();
                  setSelectedRepository(repository);
                });
              }
            }}
          />
          ))}
      </motion.div>
    </motion.div>
  );
};

interface RepoButtonProps {
  repository: Repository;
  isSelected: boolean;
  onClick: () => void;
}

const RepoButton: React.FC<RepoButtonProps> = ({ repository, isSelected, onClick }) => (
  <motion.button
    className={`repo-btn2 ${isSelected ? 'selected' : ''}`}
    onClick={onClick}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    transition={{ duration: 0.3 }}
  >
    <CubeIcon />
    <div>
      <h4>{repository.name}</h4>
      <h5>#{repository.id}</h5>
    </div>
  </motion.button>
);

export default RepositorySelector;
