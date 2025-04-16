import { useState, useRef } from 'react';
import { PlusIcon, TrashIcon, CheckCircledIcon, FaceIcon } from '@radix-ui/react-icons';
import { ContactList } from '../../../../scripts/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useContactStore } from '../../../../scripts/store/store';
import '../RepositorySelector/RepositorySelector.css';

const ContactListPopup: React.FC = () => {
    const contactLists = useContactStore((state) => state.contactLists);
    const setContactLists = useContactStore((state) => state.setContactLists);
    const selectedContactList = useContactStore((state) => state.selectedContactList);
    const setSelectedContactList = useContactStore((state) => state.setSelectedContactList);
    const [showSavedAlert, setShowSavedAlert] = useState(false);
    const confirmTimeoutRef = useRef<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    // const [selectedListId, setSelectedListId] = useState<number | null>(null);

    const handleAddContactList = () => {
        const newList: ContactList = {
            id: Date.now(),
            name: 'New Contact List',
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
          if (confirmTimeoutRef.current) {
            clearTimeout(confirmTimeoutRef.current);
            confirmTimeoutRef.current = null;
          }
          handleRemoveContactList();
          setConfirmDelete(false);
        }
    };

    const handleRemoveContactList = () => {
        if (selectedContactList) {
            setContactLists(contactLists.filter((list) => list.id !== selectedContactList.id));
            setSelectedContactList(null);
        }
        // Select the next available list or null if none exists
        const nextList = contactLists.find((list) => list.id !== selectedContactList?.id) || null;
        setSelectedContactList(nextList);

    }

    const handleListButtonClick = (list: ContactList) => {
        setSelectedContactList(list);
    };

    const handleContactListNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (selectedContactList) {
            const updatedList = { ...selectedContactList, name: event.target.value };
            setSelectedContactList(updatedList);
            setContactLists(contactLists.map((list: ContactList): ContactList =>
                    list.id === updatedList.id ? updatedList : list
                ));
            setShowSavedAlert(true);
            if (confirmTimeoutRef.current) {
                clearTimeout(confirmTimeoutRef.current);
                confirmTimeoutRef.current = null;
            }
            confirmTimeoutRef.current = window.setTimeout(() => {
                setShowSavedAlert(false);
            }, 2000);
        }
    }

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
            <>
              <div className='repo-name-input-container' style={{ position: 'relative', display: 'inline-block', minWidth: '500px' }}>
                <input
                  type='text'
                  value={selectedContactList.name}
                  className='repo-name-input'
                  placeholder='Contact List Name'
                  onChange={handleContactListNameChange}
                  style={{
                    display: 'flex',
                    flex: '1',
                    width: '100%',
                  }}
                />
                <AnimatePresence>
                  {showSavedAlert && (
                    <motion.div
                      className='saved-alert'
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      style={
                        {
                            display: 'flex',
                            flex: '1',
                            position: 'absolute',
                            top: '0.15rem',
                            left: '50%',
                            backgroundColor: 'var(--colorMid)',
                            borderRadius: '5px',
                            color: 'var(--colorText)',
                            fontSize: '0.8rem',
                        }
                      }
                    >
                      <CheckCircledIcon />
                      Changes saved!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <p>No Contact List selected</p>
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
            onClick={handleAddContactList}
            className='repo-btn'
          >
            <PlusIcon />
            New List
          </motion.button>
          <motion.button
            onClick={handleDeleteButtonClick}
            className='repo-btn'
            animate={{ backgroundColor: confirmDelete ? '#ff0000' : 'var(--colorDark)'}}
            transition={{ duration: 0.3 }}
          >
            <TrashIcon />
            {confirmDelete ? 'Confirm' : 'Delete List'}
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
  onClick?: () => void;
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
