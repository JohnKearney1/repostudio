import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './RepositorySelector.css';
import { CubeIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useRepositoryStore } from './store';

interface Repository {
  id: string;
  name: string;
  description: string;
}

const RepositorySelector: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);

  // Fetch repositories on component mount
  const fetchRepositories = () => {
    invoke<Repository[]>('get_repositories_command')
      .then((repos) => {
        setRepositories(repos);
        if (repos.length > 0 && !selectedRepository) {
          setSelectedRepository(repos[0]); // Optionally select the first repo by default
        } else if (selectedRepository) {
          // Update selected repo in case the name or description has changed externally
          const updatedRepo = repos.find((repo) => repo.id === selectedRepository.id);
          if (updatedRepo) setSelectedRepository(updatedRepo);
        }
      })
      .catch((err) => console.error('Failed to fetch repositories', err));
  };

  useEffect(() => {
    fetchRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRepository = () => {
    // Add your logic to add a new repository (e.g., open a modal or navigate to a form)
    console.log('Add repository triggered');
  };

  const handleRemoveRepository = () => {
    if (repositories.length === 1) {
      alert('Whoops! Make a new repository before you delete this one.');
      return;
    }

    if (selectedRepository) {
      invoke('delete_repository_command', { repo_id: selectedRepository.id })
        .then(() => {
          // Refresh the repository list by removing the deleted repository
          setRepositories((prev) =>
            prev.filter((repo) => repo.id !== selectedRepository.id)
          );
          setSelectedRepository(null);
        })
        .catch((err) => console.error('Failed to delete repository', err));
    }
  };

  const handleSaveRepository = () => {
    if (selectedRepository) {
      invoke('update_repository_command', {
        repoId: selectedRepository.id,
        name: selectedRepository.name,
        description: selectedRepository.description,
      })
        .then(() => {
          // Refresh the repository list after saving changes
          fetchRepositories();
          // Update the repository list in the store
            useRepositoryStore.getState().setRepositories(repositories);
            useRepositoryStore.setState({ selectedRepository: selectedRepository });
        })
        .catch((err) => console.error('Failed to update repository', err));
    }
  };

  return (
    <div className='repo-selector'>
      {/* Toolbar */}
      <div className='repo-btn-container' style={{ borderBottom: '1px solid #333' }}>
        <div className='repo-info'>
          {selectedRepository ? (
            <>
              {/* Editable repository name */}
              <input
                type='text'
                value={selectedRepository.name}
                onChange={(e) =>
                  setSelectedRepository({
                    ...selectedRepository,
                    name: e.target.value,
                  })
                }
                className='repo-name-input'
                placeholder='Repository Name'
              />
              <h5>#{selectedRepository.id}</h5>
              <textarea
                placeholder='Add a description...'
                className='repo-desc'
                rows={5}
                cols={70}
                value={selectedRepository.description}
                onChange={(e) =>
                  setSelectedRepository({
                    ...selectedRepository,
                    description: e.target.value,
                  })
                }
              />
              <button onClick={handleSaveRepository} className='repo-btn'>
                Save
              </button>
            </>
          ) : (
            <p>No repository selected</p>
          )}
        </div>

        <div
          className='repo-btn-container'
          style={{ flexDirection: 'row', justifyContent: 'center', padding: '0' }}
        >
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
            onClick={() => setSelectedRepository(repository)}
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
