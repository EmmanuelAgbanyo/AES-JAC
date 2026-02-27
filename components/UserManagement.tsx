import React, { useState } from 'react';
import type { User } from '../types';
import { Role } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';

interface UserManagementProps {
    allUsers: User[];
    onSaveUser: (user: User) => Promise<void>;
    onDeleteUser: (id: string) => Promise<void>;
}

const UserForm = ({ onSubmit, onCancel, initialData }: { onSubmit: (user: User) => void, onCancel: () => void, initialData?: User | null }) => {
    const [formData, setFormData] = useState({
        username: initialData?.username || '',
        password: '',
        role: initialData?.role || Role.STAFF,
    });

    const isEditingSuperAdmin = initialData?.role === Role.SUPER_ADMIN;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (!formData.username || (!initialData && !formData.password) || !formData.role) {
            alert('Please fill all required fields.');
            return;
        }
        const finalPassword = formData.password || initialData?.password;
        if (!finalPassword) {
            alert('A password is required for new users.');
            return;
        }

        onSubmit({
            ...initialData,
            id: initialData?.id || crypto.randomUUID(),
            username: formData.username,
            password: finalPassword,
            role: formData.role,
        } as User);
    };

    const roleOptions: { value: Role, label: string }[] = Object.values(Role)
        .filter(role => role !== Role.SUPER_ADMIN) // Cannot create other super admins
        .map(role => ({ value: role, label: role }));

    if (isEditingSuperAdmin) {
        roleOptions.unshift({ value: Role.SUPER_ADMIN, label: Role.SUPER_ADMIN });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Username"
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
            />
            <Input
                label={`Password ${initialData ? '(leave blank to keep current)' : ''}`}
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!initialData}
            />
            <Select
                label="Role"
                id="role"
                options={roleOptions}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                required
                disabled={isEditingSuperAdmin}
            />
            <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" type="submit">{initialData ? 'Save Changes' : 'Create User'}</Button>
            </div>
        </form>
    );
};

const UserManagement = ({ allUsers, onSaveUser, onDeleteUser }: UserManagementProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleSaveUser = async (userData: User) => {
        await onSaveUser(userData);
        handleCloseModal();
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            await onDeleteUser(userId);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                <Button variant="primary" onClick={() => handleOpenModal()}>Add New User</Button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button variant="info" size="sm" onClick={() => handleOpenModal(user)}>Edit</Button>
                                        {user.role !== Role.SUPER_ADMIN && (
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <Modal isOpen={true} onClose={handleCloseModal} title={editingUser ? 'Edit User' : 'Add New User'}>
                    <UserForm
                        onSubmit={handleSaveUser}
                        onCancel={handleCloseModal}
                        initialData={editingUser}
                    />
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;