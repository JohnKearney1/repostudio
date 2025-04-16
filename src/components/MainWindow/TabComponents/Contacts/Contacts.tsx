import './Contacts.css';
import { useState } from 'react';
import { CheckIcon, FaceIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { usePopupContentStore, usePopupStore, useContactStore } from '../../../../scripts/store/store';
import ContactListPopup from '../../PopupComponents/ContactListPopup/ContactListPopup';

export default function Contacts() {
    const setPopupContent = usePopupContentStore((state) => state.setContent);
    const setPopupVisible = usePopupStore((state) => state.setVisible);
    const selectedContactList = useContactStore((state) => state.selectedContactList);
    const [contactsContent, setContactsContent] = useState<JSX.Element | null>(null);
    const [contacts, setContacts] = useState<any[]>([]); // Replace 'any' with your actual contact type
    const [selectedContact, setSelectedContact] = useState<any | null>(null); // Replace 'any' with your actual contact type

    const handleAddContact = (name: string, email: string) => {
        console.log(`Adding contact: ${name}, ${email}`);
        const newContact = { name, email };
        setContacts([...contacts, newContact]);
        setContactsContent(<SelectedContactView selectedContact={newContact} />);
    };

    return (
        <div className="Contacts">
            <div className="Contacts-Menu">
                <button
                    className="contact-dropdown"
                    onClick={() => {
                        setPopupVisible(true);
                        setPopupContent(<ContactListPopup />);
                    }}
                >
                    <FaceIcon />
                    {selectedContactList?.name || 'Manage Lists'}
                </button>

                <button
                    className="contact-dropdown"
                    onClick={() => {
                        setContactsContent(<NewContactView handleAddContact={handleAddContact} />);
                    }}
                >
                    <PlusIcon />
                    Add Contact
                </button>
                {/* For each contact, show a ContactItem */}
                {contacts.map((contact, index) => (
                    <button
                        key={index}
                        className={`contact-dropdown2 ${selectedContact === contact ? 'selected' : ''}`}
                        onClick={() => {
                            setContactsContent(<SelectedContactView selectedContact={contact} />);
                            setSelectedContact(contact);
                        }}
                    >
                        <ContactItem contact={contact} isSelected={selectedContact === contact} />
                    </button>
                ))}
            </div>
            <div className="Contacts-Content">{contactsContent}</div>
        </div>
    );
}

function NewContactView({
    handleAddContact,
}: {
    handleAddContact: (name: string, email: string) => void;
}) {
    return (
        <div className="NewContactView">
            <h4>New Contact</h4>
            <h5>Add a new contact using the form below. Contacts are automatically added to the "All Contacts" list.</h5>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement;
                    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
                    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                    handleAddContact(nameInput.value, emailInput.value);
                }}
            >
                <input type="text" id="name" name="name" required placeholder='Name'/>
                <input type="email" id="email" name="email" required placeholder='Email'/>
                <input type="text" id="phone" name="phone" placeholder='Phone'/>
                <input type="text" id="profession" name="profession" placeholder='Profession'/>
                <input type="text" id="handle" name="handle" placeholder='@handle' />
                <textarea id="notes" name="notes" placeholder='Notes' style={{resize: 'none'}}/>
                <button type="submit">
                    <CheckIcon />
                    Add Contact
                </button>
            </form>
        </div>
    );
}

function SelectedContactView({ selectedContact }: { selectedContact?: any }) {
    return (
        <div className="SelectedContactView">
            <h4>{selectedContact.name}</h4>
            <h5>{selectedContact?.email}</h5>
        </div>
    );
}

function ContactItem({ contact, isSelected }: { contact: any, isSelected?: boolean }) {
    return (
        <div className="ContactItem">
            <div className='ContactItemDetails'>
                <h5>{contact.name}</h5>
                <h6>{contact.email}</h6>
            </div>
            {isSelected && (
                <button className="ContactItemButton">
                <TrashIcon />
            </button>
            )}
            
        </div>
    );
}