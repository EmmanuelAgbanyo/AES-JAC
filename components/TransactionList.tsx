import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, X, Edit2, Trash2 } from 'lucide-react';
import type { Transaction, Entrepreneur } from '../types';
import { TransactionType, PaidStatus } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Modal from './ui/Modal';

interface TransactionListProps {
  transactions: Transaction[];
  entrepreneurs: Entrepreneur[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

const TransactionList = ({ transactions, entrepreneurs, onDeleteTransaction, onEditTransaction }: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterEntrepreneur, setFilterEntrepreneur] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const getEntrepreneurName = (id: string) => {
    const entrepreneur = entrepreneurs.find(e => e.id === id);
    return entrepreneur ? entrepreneur.businessName : 'N/A';
  };

  const openDeleteModal = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setTransactionToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete.id);
      closeDeleteModal();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterEntrepreneur('ALL');
    setStartDate('');
    setEndDate('');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'ALL' || t.type === filterType;
      const matchesEntrepreneur = filterEntrepreneur === 'ALL' || t.entrepreneurId === filterEntrepreneur;
      
      const transactionDate = new Date(t.date).getTime();
      const matchesStartDate = !startDate || transactionDate >= new Date(startDate).getTime();
      const matchesEndDate = !endDate || transactionDate <= new Date(endDate).getTime();

      return matchesSearch && matchesType && matchesEntrepreneur && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType, filterEntrepreneur, startDate, endDate]);

  const entrepreneurOptions = [
    { value: 'ALL', label: 'All Entrepreneurs' },
    ...entrepreneurs.map(e => ({ value: e.id, label: e.businessName }))
  ];

  const typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: TransactionType.INCOME, label: 'Income' },
    { value: TransactionType.EXPENSE, label: 'Expense' }
  ];

  return (
    <div className="bg-white dark:bg-dark-secondary p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <h2 className="text-xl font-bold text-gray-800 dark:text-dark-text flex items-center">
          <Filter className="mr-2 text-aesBlue" size={20} />
          Transaction History
        </h2>
        
        {/* Search Bar */}
        <div className="w-full md:w-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search descriptions..."
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aesBlue/50 text-sm dark:text-dark-text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 dark:bg-dark-primary/30 p-4 rounded-xl">
        <div className="md:col-span-1">
          <Select
            label="Type"
            id="filterType"
            name="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={typeOptions}
          />
        </div>
        <div className="md:col-span-1">
          <Select
            label="Entrepreneur"
            id="filterEntrepreneur"
            name="filterEntrepreneur"
            value={filterEntrepreneur}
            onChange={(e) => setFilterEntrepreneur(e.target.value)}
            options={entrepreneurOptions}
          />
        </div>
        <div className="md:col-span-1">
          <Input
            label="Start Date"
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <Input
            label="End Date"
            id="endDate"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="md:col-span-1 flex items-end">
          <button 
            onClick={clearFilters}
            className="w-full py-2.5 px-4 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-textSecondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-primary transition-colors flex items-center justify-center text-sm font-medium"
          >
            <X size={16} className="mr-2" /> Clear Filters
          </button>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-dark-primary/30 rounded-xl">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500 dark:text-dark-textSecondary font-medium">No transactions match your criteria.</p>
          <button onClick={clearFilters} className="mt-4 text-aesBlue hover:underline text-sm font-medium">Clear all filters</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto hidden md:block rounded-lg border border-gray-200 dark:border-dark-border">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50/80 dark:bg-dark-primary/80 backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Entrepreneur</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Amount (GHS)</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary divide-y divide-gray-100 dark:divide-dark-border/50">
            <AnimatePresence>
              {filteredTransactions.map((t) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={t.id} 
                  className="hover:bg-gray-50/50 dark:hover:bg-dark-primary/30 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-textSecondary font-medium">
                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text font-medium">
                    {getEntrepreneurName(t.entrepreneurId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.type === TransactionType.INCOME ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text max-w-[200px] truncate" title={t.description}>
                    {t.description}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${t.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                     {t.type === TransactionType.INCOME ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.paidStatus === PaidStatus.FULL ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                          {t.paidStatus}
                        </span>
                     ) : (
                        <span className="text-gray-400 dark:text-dark-textSecondary">—</span>
                     )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEditTransaction(t)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3 transition-colors" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => openDeleteModal(t)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Card view for smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        <AnimatePresence>
          {filteredTransactions.map(t => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={t.id} 
              className={`bg-white dark:bg-dark-secondary rounded-xl p-5 shadow-sm border-l-4 border-r border-y border-gray-100 dark:border-dark-border ${t.type === TransactionType.INCOME ? 'border-l-green-500' : 'border-l-red-500'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-800 dark:text-dark-text line-clamp-1" title={t.description}>{t.description}</p>
                  <p className="text-xs text-gray-600 dark:text-dark-textSecondary font-medium mt-1">{getEntrepreneurName(t.entrepreneurId)}</p>
                </div>
                <p className={`text-lg font-bold whitespace-nowrap ml-2 ${t.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                 <div className="flex items-center space-x-2">
                   <span className="text-xs text-gray-500 dark:text-dark-textSecondary flex items-center">
                     <Calendar size={12} className="mr-1" />
                     {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
                   {t.type === TransactionType.INCOME && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${t.paidStatus === PaidStatus.FULL ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {t.paidStatus}
                      </span>
                   )}
                 </div>
                <div className="flex space-x-3">
                  <button onClick={() => onEditTransaction(t)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => openDeleteModal(t)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
        </>
      )}


      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
      >
        <p className="text-gray-700 dark:text-dark-textSecondary mb-4">Are you sure you want to delete this transaction? This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionList;