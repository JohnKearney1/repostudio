import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './RepositorySelector.css';
import { CubeIcon, PlusIcon, TrashIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { useRepositoryStore } from './store';

interface Repository {
  id: string;
  name: string;
  description: string;
}

const RepositorySelector: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const setSelectedRepository = useRepositoryStore((state) => state.setSelectedRepository);

  // State and ref for the "Changes saved" alert.
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const alertTimeoutRef = useRef<number | null>(null);

  const fetchRepositories = async (): Promise<Repository[]> => {
    try {
      const repos = await invoke<Repository[]>('get_repositories_command');
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepository) {
        setSelectedRepository(repos[0]);
      } else if (selectedRepository) {
        const updatedRepo = repos.find((repo) => repo.id === selectedRepository.id);
        if (updatedRepo &&
            (updatedRepo.name !== selectedRepository.name ||
             updatedRepo.description !== selectedRepository.description)) {
          setSelectedRepository(updatedRepo);
        }
      }
      return repos;
    } catch (err) {
      console.error('Failed to fetch repositories', err);
      return [];
    }
  };

  useEffect(() => {
    fetchRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to call update command and trigger the alert.
  const handleFieldChange = (updatedRepo: Repository) => {
    setSelectedRepository(updatedRepo);
    // Update the database immediately.
    handleUpdateRepository(updatedRepo);
    // Reset alert timeout if already active.
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    setShowSavedAlert(true);
    alertTimeoutRef.current = window.setTimeout(() => setShowSavedAlert(false), 2500);
  };

  const handleUpdateRepository = async (updatedRepo: Repository) => {
    try {
      await invoke('update_repository_command', {
        repoId: updatedRepo.id,
        name: updatedRepo.name,
        description: updatedRepo.description,
      });
    } catch (err) {
      console.error('Failed to update repository', err);
    }
  };

  const handleAddRepository = async () => {
    let newId = crypto.randomUUID();
    while (repositories.some(repo => repo.id === newId)) {
      newId = crypto.randomUUID();
    }
  
    try {
      await invoke('create_repository_command', {
        name: "New Repository",
        description: "",
        id: newId,
      });
      const newRepos = await fetchRepositories();
      const newRepo = newRepos.find(repo => repo.id === newId);
      if (newRepo) {
        setSelectedRepository(newRepo);
      }
    } catch (err) {
      console.error('Failed to create new repository', err);
    }
  };

  const handleRemoveRepository = async () => {
    if (repositories.length <= 1) {
      alert('Whoops! Make a new repository before you delete this one.');
      return;
    }
  
    if (selectedRepository) {
      try {
        await invoke('delete_repository_command', { repoId: selectedRepository.id });
        const newRepos = await fetchRepositories();
        if (newRepos.length > 0) {
          setSelectedRepository(newRepos[0]);
        } else {
          setSelectedRepository(null);
        }
      } catch (err) {
        console.error('Failed to delete repository', err);
      }
    }
  };

  return (
    <div className='repo-selector'>
      {/* Toolbar */}
      <div className='repo-btn-container' style={{ borderBottom: '1px solid #333', justifyContent: 'center', alignItems: 'center' }}>
        <div className='repo-info'>
          {selectedRepository ? (
            <>
              {/* Wrap the name input in a container to position the alert */}
              <div className="repo-name-input-container" style={{ position: 'relative', display: 'inline-block' }}>
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
                  {showSavedAlert && (
                    <div className="saved-alert">
                      <CheckCircledIcon />
                      Changes saved!
                    </div>
                  )}
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

        <div className='repo-btn-container' style={{ flexDirection: 'row', justifyContent: 'center', padding: '0', width: '90%' }}>
          <button onClick={handleAddRepository} className='repo-btn'>
            <PlusIcon />
            Create Repository
          </button>
          <button onClick={handleRemoveRepository} className='repo-btn'>
            <TrashIcon />
            Delete Repository
          </button>
        </div>
      </div>

      {/* Repository Menu */}
      <div className='repo-btn-container2'>
        {repositories.map((repository) => (
          <RepoButton
            key={repository.id}
            repository={repository}
            isSelected={selectedRepository?.id === repository.id}
            onClick={() => {
              if (!selectedRepository || selectedRepository.id !== repository.id) {
                setSelectedRepository(repository);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface RepoButtonProps {
  repository: Repository;
  isSelected: boolean;
  onClick: () => void;
}

const RepoButton: React.FC<RepoButtonProps> = ({ repository, isSelected, onClick }) => {
  return (
    <button className={`repo-btn2 ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <CubeIcon />
      <div>
        <h4>{repository.name}</h4>
        <h5>#{repository.id}</h5>
      </div>
    </button>
  );
};

export default RepositorySelector;
