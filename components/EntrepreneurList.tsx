import React, { useState } from 'react';
import type { Entrepreneur, User, Transaction, InventoryItem } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Role } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, LayoutDashboard, UserCheck, Search, Building2, Phone, Briefcase, Plus, PlusCircle } from 'lucide-react';
import TransactionForm from './TransactionForm';

interface EntrepreneurListProps {
  entrepreneurs: Entrepreneur[];
  onEdit: (entrepreneur: Entrepreneur) => void;
  onDelete: (id: string) => void;
  onViewDashboard: (entrepreneur: Entrepreneur) => void;
  onAddEntrepreneur: () => void;
  users: User[];
  currentUser: { type: 'system', user: User };
  onAddTransaction?: (transaction: Transaction) => Promise<void>;
  inventory?: InventoryItem[];
}

const tableVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const EntrepreneurList = ({ entrepreneurs, onEdit, onDelete, onViewDashboard, onAddEntrepreneur, users, currentUser, onAddTransaction, inventory = [] }: EntrepreneurListProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entrepreneurToDelete, setEntrepreneurToDelete] = useState<Entrepreneur | null>(null);
  const [transactionEntrepreneur, setTransactionEntrepreneur] = useState<Entrepreneur | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const openDeleteModal = (entrepreneur: Entrepreneur) => {
    onDelete(entrepreneur.id);
  };

  const closeDeleteModal = () => {
    setEntrepreneurToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (entrepreneurToDelete) {
        onDelete(entrepreneurToDelete.id);
        closeDeleteModal();
    }
  };
  
  const getStaffName = (staffId?: string) => {
    if (!staffId) return 'Unassigned';
    return users.find(u => u.id === staffId)?.username || 'Unknown Staff';
  };

  const canManage = [Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF].includes(currentUser.user.role);
  
  const filteredEntrepreneurs = entrepreneurs.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 dark:bg-gray-900/40 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/50 dark:border-white/5 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Briefcase size={24} />
            </div>
            Entrepreneurs
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-14">Manage and monitor all entrepreneur profiles</p>
        </div>
        
        <div className="w-full md:w-auto relative group flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search entrepreneurs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm outline-none text-sm font-medium dark:text-white backdrop-blur-sm"
            />
          </div>
          <button 
            onClick={onAddEntrepreneur}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/50 dark:border-white/5 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
        
        {filteredEntrepreneurs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center relative z-10">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No entrepreneurs found</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Try adjusting your search terms or add a new entrepreneur.</p>
          </div>
        ) : (
          <>
            {/* Table view for larger screens */}
            <div className="overflow-x-auto hidden md:block relative z-10 p-2">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Profile</th>
                    <th scope="col" className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Business</th>
                    <th scope="col" className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Contact</th>
                    {canManage && <th scope="col" className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Assigned To</th>}
                    <th scope="col" className="px-6 py-4 text-right text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={tableVariants} initial="hidden" animate="visible" className="relative z-10">
                  <AnimatePresence>
                    {filteredEntrepreneurs.map((e) => (
                      <motion.tr 
                        variants={rowVariants}
                        layout
                        key={e.id} 
                        className="group bg-white/40 dark:bg-white/5 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors shadow-sm hover:shadow-md rounded-2xl overflow-hidden"
                      >
                        <td className="px-6 py-4 whitespace-nowrap rounded-l-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-indigo-900/40 dark:to-blue-800/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm ring-1 ring-indigo-500/20">
                              {e.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{e.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            <Building2 size={14} className="text-indigo-400" />
                            {e.businessName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Phone size={14} className="text-emerald-400" />
                            {e.contact}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-500/20">
                              <UserCheck size={12} />
                              {getStaffName(e.assignedStaffId)}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right rounded-r-2xl">
                          <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => onViewDashboard(e)} className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-colors tooltip-trigger" title="Dashboard">
                              <LayoutDashboard size={18} />
                            </button>
                            {canManage && onAddTransaction && (
                              <button onClick={() => setTransactionEntrepreneur(e)} className="p-2 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl transition-colors tooltip-trigger" title="Enter Transaction on Behalf">
                                <PlusCircle size={18} />
                              </button>
                            )}
                            <button onClick={() => onEdit(e)} className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl transition-colors tooltip-trigger" title="Edit">
                              <Edit2 size={18} />
                            </button>
                            {canManage && (
                              <button onClick={() => openDeleteModal(e)} className="p-2 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl transition-colors tooltip-trigger" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>
            </div>
            
            {/* Card view for smaller screens */}
            <motion.div variants={tableVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden p-4 relative z-10">
              <AnimatePresence>
                {filteredEntrepreneurs.map(e => (
                  <motion.div variants={rowVariants} layout key={e.id} className="bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-[1.5rem] p-5 shadow-lg border border-gray-100 dark:border-white/10 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-indigo-900/40 dark:to-blue-800/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl shadow-sm ring-1 ring-indigo-500/20 shrink-0">
                          {e.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-lg text-gray-900 dark:text-white leading-tight">{e.businessName}</p>
                          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{e.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                          <Phone size={14} className="text-emerald-500" />
                          {e.contact}
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-500/20">
                              <UserCheck size={12} />
                              {getStaffName(e.assignedStaffId)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-white/5 pt-4 mt-auto">
                        <button onClick={() => onViewDashboard(e)} className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-colors" title="Dashboard">
                          <LayoutDashboard size={18} />
                        </button>
                        {canManage && onAddTransaction && (
                          <button onClick={() => setTransactionEntrepreneur(e)} className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl transition-colors" title="Enter Transaction on Behalf">
                            <PlusCircle size={18} />
                          </button>
                        )}
                        <button onClick={() => onEdit(e)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl transition-colors" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        {canManage && (
                          <button onClick={() => openDeleteModal(e)} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl transition-colors" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title={<span className="flex items-center gap-2 text-rose-600"><Trash2 size={20}/> Delete Entrepreneur</span>}
      >
        <div className="p-2">
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-6 leading-relaxed">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{entrepreneurToDelete?.name}</strong>? This action cannot be undone and will permanently remove all associated transactions, inventory, and clients.
          </p>
          <div className="flex justify-end space-x-3">
            <button onClick={closeDeleteModal} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button onClick={handleDeleteConfirm} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg shadow-rose-500/30 transition-all transform hover:scale-105">
              Delete Forever
            </button>
          </div>
        </div>
      </Modal>

      {transactionEntrepreneur && (
        <Modal
          isOpen={true}
          onClose={() => setTransactionEntrepreneur(null)}
          title={
            <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <PlusCircle size={20} /> Enter Transaction for {transactionEntrepreneur.businessName}
            </span>
          }
        >
          <TransactionForm
            onSubmit={async (transaction) => {
              if (onAddTransaction) {
                await onAddTransaction(transaction);
              }
              setTransactionEntrepreneur(null);
            }}
            onCancel={() => setTransactionEntrepreneur(null)}
            currentEntrepreneur={transactionEntrepreneur}
            entrepreneurs={entrepreneurs}
            inventory={inventory ? inventory.filter(i => i.entrepreneurId === transactionEntrepreneur.id) : []}
          />
        </Modal>
      )}
    </div>
  );
};

export default EntrepreneurList;