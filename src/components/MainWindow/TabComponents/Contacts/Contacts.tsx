import './Contacts.css';
import { useState } from 'react';
import {  FaceIcon, PlusIcon } from '@radix-ui/react-icons';
import { usePopupContentStore, usePopupStore, useContactStore } from '../../../../scripts/store/store';
import ContactListPopup from '../../PopupComponents/ContactListPopup/ContactListPopup';

export default function Contacts() {
    const setPopupContent = usePopupContentStore((state) => state.setContent);
    const setPopupVisible = usePopupStore((state) => state.setVisible);
    const selectedContactList = useContactStore((state) => state.selectedContactList);
    const [contactsContent, setContactsContent] = useState<JSX.Element | null>(null);

    return (
        <div className="Contacts">
            <div className='Contacts-Menu'>
                <button className='contact-dropdown' onClick={() => {
                    setPopupVisible(true);
                    setPopupContent(<ContactListPopup />);
                }}>
                    <FaceIcon />
                    {selectedContactList?.name || 'Manage Lists'}
                </button>

                <button className='contact-dropdown' onClick={() => {
                    setContactsContent(<NewContactView />);
                }}>
                    <PlusIcon />
                    Add Contact
                </button>
                {/* For each contact, show a ContactItem */}
                {selectedContactList?.contacts.map((contact, index) => (
                    <button key={index} className='contact-dropdown' onClick={() => {
                        setContactsContent(<SelectedContactView />);
                    }}>
                        <ContactItem contact={contact} />
                    </button>
                ))}
            </div>
            <div className='Contacts-Content'>
                {contactsContent}
            </div>
        </div>
    )
}

function NewContactView() {
    return (
        <div className='NewContactView'>
            <h4>New Contact</h4>
            <form>
                <input type="text" id="name" name="name" required />
                <input type="email" id="email" name="email" required />
                <button type="submit" >Add Contact</button>
            </form>
        </div>
    );
}

function SelectedContactView() {
    return (
        <div className='SelectedContactView'>
            <h2>Selected Contact</h2>
            <p>Details about the selected contact will go here.</p>
        </div>
    );
}


function ContactItem(_props: { contact: any }) {
    return (
        <div className='ContactItem'>
            <h3>Contact Name</h3>
            <p>Contact details will go here.</p>
        </div>
    );
}