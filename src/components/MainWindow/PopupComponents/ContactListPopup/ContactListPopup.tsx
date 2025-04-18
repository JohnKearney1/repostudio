import { useState, useRef, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckCircledIcon, FaceIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { ContactList } from '../../../../scripts/store/store';
import { useContactStore } from '../../../../scripts/store/store';
import '../RepositorySelector/RepositorySelector.css';

const DEFAULT_LIST_ID = 'all';

const ContactListPopup: React.FC = () => {
  const contactLists = useContactStore((state) => state.contactLists);
  const setContactLists = useContactStore((state) => state.setContactLists);
  const selectedContactList = useContactStore((state) => state.selectedContactList);
  const setSelectedContactList = useContactStore((state) => state.setSelectedContactList);

  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);

  // Load lists on mount
  useEffect(() => {
    (async () => {
      const lists: ContactList[] = await invoke('get_contact_lists_command');
      setContactLists(lists);

           // only pick a default if nothing’s selected yet
     if (!selectedContactList) {
       const defaultList = lists.find((l) => l.id === DEFAULT_LIST_ID)
                         || lists[0]
                         || null;
       setSelectedContactList(defaultList);
     } else {
        // if a list is selected, check if it still exists
        const existingList = lists.find((l) => l.id === selectedContactList.id);
        if (!existingList) {
          // if it doesn't exist, set the first one as selected
          const newSelectedList = lists[0] || null;
          setSelectedContactList(newSelectedList);
        }

     }

    })();
  }, [setContactLists, setSelectedContactList]);

  const handleAddContactList = async () => {
    const name = 'New Contact List ' + (contactLists.length + 1);
    const newId = await invoke<string>('create_contact_list_command', { name });
    const newList: ContactList = {
      id: newId,
      name,
      contacts: [],
    };
    setContactLists([...contactLists, newList]);
    setSelectedContactList(newList);
  };

  const handleDeleteButtonClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimeoutRef.current = window.setTimeout(() => {
        setConfirmDelete(false);
      }, 2000);
    } else {
      clearTimeout(confirmTimeoutRef.current!);
      handleRemoveContactList();
      setConfirmDelete(false);
    }
  };

  const handleRemoveContactList = async () => {
    if (!selectedContactList || String(selectedContactList.id) === DEFAULT_LIST_ID) return;
    await invoke('delete_contact_list_command', { id: selectedContactList.id });
    const remaining = contactLists.filter((l) => l.id !== selectedContactList.id);
    setContactLists(remaining);
    const next = remaining.find((l) => l.id !== selectedContactList.id) || remaining[0];
    setSelectedContactList(next);
  };

  const handleListButtonClick = (list: ContactList) => {
    setSelectedContactList(list);
  };

  const handleContactListNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedContactList) return;
    const name = e.target.value;
    // optimistically update UI
    const updated = { ...selectedContactList, name };
    setSelectedContactList(updated);
    setContactLists(contactLists.map((l) => l.id === updated.id ? updated : l));
    setShowSavedAlert(true);
    clearTimeout(confirmTimeoutRef.current!);
    confirmTimeoutRef.current = window.setTimeout(() => setShowSavedAlert(false), 2000);
    // persist
    invoke('update_contact_list_command', { id: updated.id, name });
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
        style={{ borderBottom: '1px solid var(--border-color)', justifyContent: 'center', alignItems: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className='repo-info'>
          {selectedContactList ? (
            <div className='repo-name-input-container' style={{ position: 'relative', display: 'inline-block'}}>
              <input
                type='text'
                value={selectedContactList.name}
                className='repo-name-input'
                placeholder='Contact List Name'
                onChange={handleContactListNameChange}
                disabled={String(selectedContactList.id) === DEFAULT_LIST_ID}
                style={String(selectedContactList.id) === DEFAULT_LIST_ID ? { opacity: 0.5, pointerEvents: 'none' } : {}}
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
                    <CheckCircledIcon /> Changes saved!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <p>No Contact List selected</p>
          )}
          <h5>Create and edit lists of contacts. </h5>
        </div>

        <motion.div
          className='repo-btn-container'
          style={{ flexDirection: 'row', justifyContent: 'center', padding: 0, width: '90%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.button onClick={handleAddContactList} className='repo-btn'>
            <PlusIcon /> New List
          </motion.button>
          <motion.button
            onClick={handleDeleteButtonClick}
            className='repo-btn'
            disabled={String(selectedContactList?.id) === DEFAULT_LIST_ID}
            animate={{ backgroundColor: confirmDelete ? '#ff0000' : 'var(--colorDark)' }}
            transition={{ duration: 0.3 }}
          >
            <TrashIcon /> {confirmDelete ? 'Confirm' : 'Delete List'}
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div
        className='repo-btn-container2'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {contactLists.map((list) => (
          <ListButton
            key={list.id}
            contactlist={list}
            isSelected={selectedContactList?.id === list.id}
            onClick={() => handleListButtonClick(list)}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

interface ListButtonProps {
  contactlist: ContactList;
  isSelected: boolean;
  onClick: () => void;
}

const ListButton: React.FC<ListButtonProps> = ({ contactlist, isSelected, onClick }) => (
  <motion.button
    className={`repo-btn2 ${isSelected ? 'selected' : ''}`}
    onClick={onClick}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    transition={{ duration: 0.3 }}
  >
    <FaceIcon />
    <div>
      <h4>{contactlist.name}</h4>
      <h5>#{contactlist.id}</h5>
    </div>
  </motion.button>
);

export default ContactListPopup;
