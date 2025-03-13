import React, { useState, useEffect } from 'react';

interface Repository {
    id: string;
    name: string;
}

const RepositorySelector: React.FC = () => {
    const [repositories, setRepositories] = useState<Repository[]>([]);

    const handleAddRepository = () => {
        // Add your logic to add a new repository (e.g., open a modal or navigate to a form)
        console.log('Add repository triggered');
    };

    const handleRemoveRepository = () => {
        // Add your logic to remove the selected repository
        console.log('Remove repository triggered');
    };

    return (
        <div>
            {/* Toolbar */}
            <h4>
                Current Repository
            </h4>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderBottom: '1px solid #ccc',
                }}
            >
                <button onClick={handleAddRepository} style={{ marginRight: '8px' }}>
                    New Repository
                </button>
                <button onClick={handleRemoveRepository}>Delete Repository</button>
            </div>

            {/* Menu */}
            <div style={{ padding: '16px' }}>
                {/* map a RepoButton for each repo in the list */}
                
                <RepoButton />

            </div>
        </div>
    );
};

function RepoButton() {
    return (
        <button style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc' }}>
            Repository Name
        </button>
    );
}

export default RepositorySelector;