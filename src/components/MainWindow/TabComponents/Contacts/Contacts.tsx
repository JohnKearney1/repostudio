import { useState, ChangeEvent, FormEvent } from 'react';
import './Contacts.css';

interface Contact {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface ContactList {
  id: number;
  name: string;
  contacts: Contact[];
}

export default function Contacts() {
    return (
        <div className="contacts-container">
            <ContactListManager />
            <ContactManager />
        </div>
    )
}

export function ContactListManager() {
    const [listName, setListName] = useState('');
    const [contactLists, setContactLists] = useState<ContactList[]>([]);

    const handleListNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setListName(event.target.value);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (listName) {
            const newList: ContactList = {
                id: Date.now(),
                name: listName,
                contacts: [],
            };
            setContactLists([...contactLists, newList]);
            setListName('');
        }
    };

    const handleDeleteList = (id: number) => {
        setContactLists(contactLists.filter(list => list.id !== id));
    };

    const handleAddContact = (listId: number, contact: Contact) => {
        setContactLists(contactLists.map(list => {
            if (list.id === listId) {
                return { ...list, contacts: [...list.contacts, contact] };
            }
            return list;
        }));
    };


    return (
        <div className="contact-list-manager">
            <h2>Contact Lists</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="List Name" value={listName} onChange={handleListNameChange} />
                <button type="submit">Add List</button>
            </form>
            <ul>
                {contactLists.map((list) => (
                    <li key={list.id}>
                        {list.name}
                        <button onClick={() => handleDeleteList(list.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function ContactManager() {

    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);

    const handleContactNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setContactName(event.target.value);
    };

    const handleContactPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
        setContactPhone(event.target.value);
    };

    const handleContactEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
        setContactEmail(event.target.value);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (contactName) {
            const newContact: Contact = {
                id: Date.now(),
                name: contactName,
                phone: contactPhone,
                email: contactEmail,
            };
            setContacts([...contacts, newContact]);
            setContactName('');
            setContactPhone('');
            setContactEmail('');
        }
    };

    const handleDeleteContact = (id: number) => {
        setContacts(contacts.filter(contact => contact.id !== id));
    };


    return (
        <div className="contact-manager">
            <h2>Contacts</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Contact Name" value={contactName} onChange={handleContactNameChange} />
                <input type="text" placeholder="Phone" value={contactPhone} onChange={handleContactPhoneChange} />
                <input type="text" placeholder="Email" value={contactEmail} onChange={handleContactEmailChange} />
                <button type="submit">Add Contact</button>
            </form>
            <ul>
                {contacts.map((contact) => (
                    <li key={contact.id}>
                        {contact.name} - {contact.phone} - {contact.email}
                        <button onClick={() => handleDeleteContact(contact.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    )
}