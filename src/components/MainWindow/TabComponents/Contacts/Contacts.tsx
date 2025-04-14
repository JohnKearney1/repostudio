import { useState, ChangeEvent, FormEvent } from 'react';

interface Contact {
    id: number;
    name: string;
    phone?: string;
    email?: string;
}

export default function Contacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<Omit<Contact, 'id'>>({
        name: '',
        phone: '',
        email: '',
    });
    const [nextId, setNextId] = useState(1);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.name.trim()) return; // Name is required

        if (editingId === null) {
            // Adding a new contact
            setContacts([...contacts, { id: nextId, ...form }]);
            setNextId(nextId + 1);
        } else {
            // Editing an existing contact
            setContacts(
                contacts.map(contact =>
                    contact.id === editingId ? { id: editingId, ...form } : contact
                )
            );
            setEditingId(null);
        }
        setForm({ name: '', phone: '', email: '' });
    };

    const handleEdit = (id: number) => {
        const contact = contacts.find(c => c.id === id);
        if (contact) {
            setEditingId(id);
            setForm({
                name: contact.name,
                phone: contact.phone || '',
                email: contact.email || '',
            });
        }
    };

    const handleDelete = (id: number) => {
        setContacts(contacts.filter(c => c.id !== id));
        if (editingId === id) {
            setEditingId(null);
            setForm({ name: '', phone: '', email: '' });
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ name: '', phone: '', email: '' });
    };

    return (
        <div>
            <h1>Contacts</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Name*:
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleInputChange}
                            required
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Phone:
                        <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleInputChange}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Email:
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleInputChange}
                        />
                    </label>
                </div>
                <button type="submit">{editingId === null ? 'Add Contact' : 'Update Contact'}</button>
                {editingId !== null && (
                    <button type="button" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </form>
            <hr />
            <ul>
                {contacts.map(contact => (
                    <li key={contact.id}>
                        <strong>{contact.name}</strong>
                        {contact.phone && <> | Phone: {contact.phone}</>}
                        {contact.email && <> | Email: {contact.email}</>}
                        <button onClick={() => handleEdit(contact.id)}>Edit</button>
                        <button onClick={() => handleDelete(contact.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
