import React, { useState, useMemo } from 'react';
import type { Client } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import ClientForm from './ClientForm';
import { User, Phone, Mail, MapPin, Building, Calendar, Edit2, Trash2, Search, Plus, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClientManagerProps {
    clients: Client[];
    onAddClient: (client: Client) => void;
    onUpdateClient: (client: Client) => void;
    onDeleteClient: (id: string) => void;
    entrepreneurId: string;
}

const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
);

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient, entrepreneurId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm]);

    const handleEditClick = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        if (window.confirm("Are you sure you want to delete this client?")) {
            onDeleteClient(id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleFormSubmit = (client: Client) => {
        if (editingClient) {
            onUpdateClient(client);
        } else {
            onAddClient(client);
        }
        handleCloseModal();
    };

    const handleExportClients = () => {
        const data = clients.map(c => ({
            Name: c.name,
            Company: c.company,
            Email: c.email,
            Phone: c.phone,
            Address: c.address,
            'Date of Birth': c.dateOfBirth,
            Notes: c.notes,
            'Created At': new Date(c.createdAt).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clients");
        XLSX.writeFile(wb, "clients_export.xlsx");
    };

    const upcomingBirthdays = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        return clients.filter(client => {
            if (!client.dateOfBirth) return false;

            const [year, month, day] = client.dateOfBirth.split('-').map(Number);
            // Month is 0-indexed in Date constructor
            const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
            birthdayThisYear.setHours(0, 0, 0, 0);

            // If birthday has passed this year, check next year
            if (birthdayThisYear < today) {
                birthdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            return birthdayThisYear >= today && birthdayThisYear <= nextWeek;
        });
    }, [clients]);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Birthday Alert Banner */}
            {upcomingBirthdays.length > 0 && (
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-4 flex items-start gap-4 backdrop-blur-sm">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-500 animate-bounce">
                        <User size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Birthdays Coming Up!</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            Don't forget to wish a happy birthday to:{" "}
                            <span className="font-medium text-pink-600 dark:text-pink-400">
                                {upcomingBirthdays.map(c => c.name).join(", ")}
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                        Client Management
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Cultivate your customer relationships with precision.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleExportClients}
                        variant="secondary"
                        icon={<Download className="w-5 h-5" />}
                        className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
                    >
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        icon={<Plus className="w-5 h-5" />}
                        className="shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow duration-300"
                    >
                        Add New Client
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex items-center space-x-4 relative z-10">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30 text-white">
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Clients</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{clients.length}</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex items-center space-x-4 relative z-10">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30 text-white">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">New This Month</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                {clients.filter(c => {
                                    const date = new Date(c.createdAt);
                                    const now = new Date();
                                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex items-center space-x-4 relative z-10">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30 text-white">
                            <Building size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Companies</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                {new Set(clients.map(c => c.company).filter(Boolean)).size}
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Controls Bar */}
            <GlassCard className="p-2 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-grow w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search clients..."
                        className="w-full pl-11 pr-4 py-2.5 bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-1 pr-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${viewMode === 'grid'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    >
                        <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                            <div className="bg-current rounded-[1px]"></div>
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${viewMode === 'list'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    >
                        <div className="flex flex-col gap-1 w-5 h-5 justify-center">
                            <div className="bg-current h-0.5 rounded-full w-full"></div>
                            <div className="bg-current h-0.5 rounded-full w-full"></div>
                            <div className="bg-current h-0.5 rounded-full w-full"></div>
                        </div>
                    </button>
                </div>
            </GlassCard>

            {/* Client List/Grid */}
            {filteredClients.length === 0 ? (
                <div className="text-center py-24">
                    <div className="inline-flex p-6 rounded-full bg-gray-100/50 dark:bg-gray-800/50 mb-6 backdrop-blur-sm">
                        <User className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No clients found</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                        {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first client to the system."}
                    </p>
                    {!searchTerm && (
                        <div className="flex justify-center gap-4">
                            <Button onClick={() => setIsModalOpen(true)} size="lg">Add Client</Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {filteredClients.map((client) => (
                        <GlassCard
                            key={client.id}
                            className={`group transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'p-6 flex flex-col h-full'}`}
                        >
                            {/* Actions Overlay */}
                            <div className={`absolute top-4 right-4 flex space-x-2 transition-all duration-300 ${viewMode === 'list' ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(client); }}
                                    className="p-2 text-gray-400 hover:text-blue-600 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-lg backdrop-blur-sm shadow-sm transition-all"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(client.id); }}
                                    className="p-2 text-gray-400 hover:text-red-600 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-lg backdrop-blur-sm shadow-sm transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className={`flex items-start ${viewMode === 'list' ? 'flex-shrink-0' : 'mb-5'}`}>
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <div className={`flex-grow ${viewMode === 'list' ? 'grid grid-cols-1 md:grid-cols-3 gap-8 items-center w-full' : ''}`}>
                                <div className={viewMode === 'list' ? '' : 'mb-6'}>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate mb-1">
                                        {client.name}
                                    </h3>
                                    {client.company && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                            <Building size={14} className="mr-1.5 opacity-70" />
                                            {client.company}
                                        </p>
                                    )}
                                </div>

                                <div className={`space-y-2.5 ${viewMode === 'list' ? 'col-span-2 flex flex-row flex-wrap gap-6 space-y-0 items-center' : ''}`}>
                                    {client.email && (
                                        <div className="flex items-center text-sm group/link">
                                            <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mr-3 group-hover/link:bg-blue-100 dark:group-hover/link:bg-blue-900/40 transition-colors">
                                                <Mail size={14} />
                                            </div>
                                            <a href={`mailto:${client.email}`} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                                                {client.email}
                                            </a>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center text-sm group/link">
                                            <div className="p-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 mr-3 group-hover/link:bg-green-100 dark:group-hover/link:bg-green-900/40 transition-colors">
                                                <Phone size={14} />
                                            </div>
                                            <a href={`tel:${client.phone}`} className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                                {client.phone}
                                            </a>
                                        </div>
                                    )}
                                    {client.address && viewMode !== 'list' && (
                                        <div className="flex items-start text-sm">
                                            <div className="p-1.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 mr-3 mt-0.5">
                                                <MapPin size={14} />
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-300 line-clamp-2">{client.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {viewMode === 'grid' && (
                                <div className="mt-auto pt-5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs font-medium text-gray-400">
                                    <span>Added {new Date(client.createdAt).toLocaleDateString()}</span>
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <Modal
                    isOpen={true}
                    onClose={handleCloseModal}
                    title={editingClient ? "Edit Client" : "Add New Client"}
                >
                    <ClientForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseModal}
                        initialData={editingClient || undefined}
                        entrepreneurId={entrepreneurId}
                    />
                </Modal>
            )}
        </div>
    );
};

export default ClientManager;
