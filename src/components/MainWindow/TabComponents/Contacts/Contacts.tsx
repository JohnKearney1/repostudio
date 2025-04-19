// src/components/MainWindow/TabComponents/ContactsTab/Contacts.tsx
import './Contacts.css';
import { useState, useEffect } from 'react';
import { CheckIcon, FaceIcon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import {
  usePopupContentStore,
  usePopupStore,
  useContactStore,
  ContactList,
} from '../../../../scripts/store/store';
import ContactListPopup from '../../PopupComponents/ContactListPopup/ContactListPopup';

export default function Contacts() {
  const setPopupContent = usePopupContentStore((s) => s.setContent);
  const setPopupVisible = usePopupStore((s) => s.setVisible);
  const setContactLists = useContactStore((s) => s.setContactLists);
  const selectedContactList = useContactStore((s) => s.selectedContactList);
  const setSelectedContactList = useContactStore((s) => s.setSelectedContactList);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 1) On mount: load all lists, then pick the default ("all") or first one
  useEffect(() => {
    (async () => {
      try {
        const lists: ContactList[] = await invoke('get_contact_lists_command');
        setContactLists(lists);
        // choose the "All Contacts" list (id === 'all') or fallback
        const defaultList = lists.find((l) => l.id === 'all') || lists[0] || null;
        setSelectedContactList(defaultList);
      } catch (e) {
        console.error('Failed to load contact lists', e);
      }
    })();
  }, [setContactLists, setSelectedContactList]);

  // 2) Whenever the selected list changes, reload its contacts
  useEffect(() => {
    if (!selectedContactList) return;
    loadContacts(selectedContactList.id);
  }, [selectedContactList]);

  // Fetch contacts for a given list ID
  async function loadContacts(listId: string) {
    try {
      const cs: Contact[] = await invoke('get_contacts_command', { listId });
      setContacts(cs);
      setSelectedContact(null);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
  }

  // Create a new contact in the current list
  async function handleAddContact(data: Partial<Contact>) {
    if (!selectedContactList) return;
    try {
        const newId: string = await invoke('create_contact_command', {
            name: data.name!,
            email: data.email!,
            phone: data.phone || null,
            handle: data.handle || null,
            notes: data.notes || null,
            profession: data.profession || null,
            listId: selectedContactList.id,
        });
        const cs: Contact[] = await invoke('get_contacts_command', { listId: selectedContactList.id });
        setContacts(cs);

        // Find and select the newly created contact
        const newContact = cs.find((c) => c.id === newId);
        if (newContact) {
            setSelectedContact(newContact);
            setIsEditing(false);
        } else {
            console.error('New contact not found in the list after creation');
        }
    } catch (e) {
      console.error('Failed to add contact', e);
    }
  }

  // Delete an existing contact
  async function handleDeleteContact(id: string) {
    try {
      await invoke('delete_contact_command', { contactId: id });
      if (selectedContact?.id === id) {
        setSelectedContact(null);
        setIsEditing(false);
      }
      if (selectedContactList) {
        await loadContacts(selectedContactList.id);
      }
    } catch (e) {
      console.error('Failed to delete contact', e);
    }
  }

// Update an existing contact's details
async function handleUpdateContact(contact: Contact) {
  try {
    // 1) Persist the update
    await invoke('update_contact_command', { contact });
    setIsEditing(false);

    if (selectedContactList) {
      // 2) Reload this list’s contacts
      const cs: Contact[] = await invoke('get_contacts_command', {
        listId: selectedContactList.id,
      });
      setContacts(cs);

      // 3) Re‑select the contact we just edited
      const updated = cs.find((c) => c.id === contact.id);
      if (updated) {
        setSelectedContact(updated);
      }
    }
  } catch (e) {
    console.error('Failed to update contact', e);
  }
}


  return (
    <div className="Contacts">
      <div className="Contacts-Menu">
        {/* Manage Lists Dropdown */}
        <button
          className="contact-dropdown"
          onClick={() => {
            setPopupVisible(true);
            setPopupContent(<ContactListPopup />);
          }}
        >
          <FaceIcon />
          {selectedContactList?.name}
        </button>

        {/* New Contact Button */}
        <button
          className="contact-dropdown"
          onClick={() => {
            setSelectedContact(null);
            setIsEditing(false);
          }}
        >
          <PlusIcon />
          Add Contact
        </button>

        {/* List of existing contacts */}
        {contacts.map((c) => (
          <button
            key={c.id}
            className={`contact-dropdown2 ${
              selectedContact?.id === c.id ? 'selectedContact' : ''
            }`}
            onClick={() => {
              setSelectedContact(c);
              setIsEditing(false);
            }}
          >
            <ContactItem contact={c} />
          </button>
        ))}
      </div>

      <div className="Contacts-Content">
        {!selectedContact ? (
          <NewContactView onSubmit={handleAddContact} />
        ) : (
          <SelectedContactView
            contact={selectedContact}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onCancelEdit={() => setIsEditing(false)}
            onSave={handleUpdateContact}
            onDelete={() => handleDeleteContact(selectedContact.id)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub‑components & Types
// ---------------------------------------------------------------------------

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  handle?: string;
  notes?: string;
  profession?: string;
};

function NewContactView({
  onSubmit,
}: {
  onSubmit: (data: Partial<Contact>) => void;
}) {
  return (
    <div className="NewContactView">
      <h4>New Contact</h4>
      <h5>New contacts are added to the current list, and the All Contacts list.</h5>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget as HTMLFormElement;
          onSubmit({
            name: (f.elements.namedItem('name') as HTMLInputElement).value,
            email: (f.elements.namedItem('email') as HTMLInputElement).value,
            phone: (f.elements.namedItem('phone') as HTMLInputElement).value,
            profession: (f.elements.namedItem('profession') as HTMLInputElement).value,
            handle: (f.elements.namedItem('handle') as HTMLInputElement).value,
            notes: (f.elements.namedItem('notes') as HTMLTextAreaElement).value,
          });
          f.reset();
        }}
      >
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="phone" placeholder="Phone" />
        <input name="profession" placeholder="Profession" />
        <input name="handle" placeholder="@handle" />
        <textarea name="notes" placeholder="Notes" style={{ resize: 'none' }} />
        <button type="submit">
          <CheckIcon />
          Add Contact
        </button>
      </form>
    </div>
  );
}

function SelectedContactView({
  contact,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  contact: Contact;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (c: Contact) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(contact);

  useEffect(() => {
    setDraft(contact);
  }, [contact]);

  if (!isEditing) {
    return (
      <div className="SelectedContactView">
        <h4>{contact.name}</h4>
        <h5>{contact.email}</h5>
        <h6>{contact.phone}</h6>
        <h6>{contact.profession}</h6>
        <h6>{contact.handle}</h6>
        <h6>{contact.notes}</h6>
        <div className='SelectedContactButtons'>
          <button className="ContactItemButton" onClick={onEdit}>
            <Pencil1Icon />
            Edit
          </button>
          <button className="ContactItemButton" onClick={onDelete}>
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="SelectedContactView" >
      <h4>Edit Contact</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
        />
        <input
          type="email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          required
        />
        <input
          value={draft.phone ?? ''}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <input
          value={draft.profession ?? ''}
          onChange={(e) => setDraft({ ...draft, profession: e.target.value })}
        />
        <input
          value={draft.handle ?? ''}
          onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
        />
        <textarea
          value={draft.notes ?? ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          style={{ resize: 'none' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="submit" className="ContactItemButton">
            Save
          </button>
          <button type="button" className="ContactItemButton" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ContactItem({ contact }: { contact: Contact }) {
  return (
    <div className="ContactItem">
      <div className="ContactItemDetails">
        <h6>{contact.name}</h6>
        <h5>{contact.email}</h5>
      </div>
    </div>
  );
}
