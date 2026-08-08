import React, { useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, BrainCircuit, PenTool, PlusCircle, MinusCircle } from 'lucide-react';
import type { Transaction, Entrepreneur, PartialTransaction } from '../types';
import { TransactionType } from '../constants';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { parseExpenseFromReceipt } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface TransactionManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  entrepreneurs: Entrepreneur[];
  onEditTransaction: (transaction: Transaction) => void;
  onScanSuccess: (parsedData: PartialTransaction) => void;
}

const TransactionManager = ({ 
  transactions, 
  onAddTransaction,
  onDeleteTransaction,
  entrepreneurs, 
  onEditTransaction, 
  onScanSuccess 
}: TransactionManagerProps) => {
  const [isParsing, setIsParsing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<TransactionType>(TransactionType.INCOME);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            if (!base64String) {
                throw new Error("Could not read file as base64.");
            }
            if (!process.env.API_KEY) {
              throw new Error("Gemini API key is not configured. Cannot parse receipt.");
            }
            const parsedData = await parseExpenseFromReceipt(base64String);
            onScanSuccess(parsedData);
        };
        reader.readAsDataURL(file);

    } catch (error) {
        console.error("Error parsing receipt:", error);
        alert(`Error: ${(error as Error).message}`);
    } finally {
        setIsParsing(false);
        // Reset file input value to allow re-uploading the same file
        if (event.target) {
            event.target.value = "";
        }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const openAddModal = (type: TransactionType) => {
    setAddType(type);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (transaction: Transaction) => {
      await onAddTransaction(transaction);
      setIsAddModalOpen(false);
  };

  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
       {isParsing && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
            <LoadingSpinner message="AI is reading your receipt..." />
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Manage Transactions</h1>
          <p className="text-gray-500 dark:text-dark-textSecondary mt-1">Overview and entry for all financial activities.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-green-800/30"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Income</p>
              <h3 className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">₵{totalIncome.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-green-200 dark:bg-green-800/50 rounded-lg">
              <TrendingUp className="text-green-700 dark:text-green-300" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-800/20 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-800/30"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
              <h3 className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">₵{totalExpense.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-red-200 dark:bg-red-800/50 rounded-lg">
              <TrendingDown className="text-red-700 dark:text-red-300" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/30"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Net Balance</p>
              <h3 className={`text-3xl font-bold mt-1 ${netBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`}>
                {netBalance >= 0 ? '' : '-'}₵{Math.abs(netBalance).toFixed(2)}
              </h3>
            </div>
            <div className="p-3 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
              <Wallet className="text-blue-700 dark:text-blue-300" size={24} />
            </div>
          </div>
        </motion.div>
      </div>
      
      {entrepreneurs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-dark-secondary p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border flex flex-col justify-center items-center text-center transition-shadow hover:shadow-md"
            >
                <div className="p-4 bg-gray-100 dark:bg-dark-primary rounded-full mb-4">
                  <PenTool className="text-gray-700 dark:text-gray-300" size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-dark-text mb-2">Manual Entry</h2>
                <p className="text-gray-500 dark:text-dark-textSecondary mb-8 max-w-sm">
                    Manually log income or expenses for an entrepreneur. Perfect for physical cash transactions.
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full justify-center">
                    <Button variant="success" onClick={() => openAddModal(TransactionType.INCOME)} className="flex items-center justify-center px-6">
                        <PlusCircle size={18} className="mr-2" /> Add Income
                    </Button>
                    <Button variant="danger" onClick={() => openAddModal(TransactionType.EXPENSE)} className="flex items-center justify-center px-6">
                        <MinusCircle size={18} className="mr-2" /> Add Expense
                    </Button>
                </div>
            </motion.div>

             <motion.div 
              whileHover={{ y: -5 }}
              className="bg-gradient-to-b from-blue-50/50 to-blue-100/50 dark:from-dark-primary/30 dark:to-blue-900/10 p-8 rounded-2xl shadow-sm border-2 border-dashed border-blue-200 dark:border-blue-800/50 flex flex-col justify-center items-center text-center transition-shadow hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
            >
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4 text-aesBlue">
                  <BrainCircuit size={32} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-dark-text mb-2">AI Scan Assistant</h3>
                <p className="text-gray-500 dark:text-dark-textSecondary mt-2 mb-8 max-w-sm">
                    Save time on data entry. Upload a photo of a receipt, and the AI will automatically fill out the expense details.
                </p>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleFileChange}
                />
                <Button 
                    variant="primary" 
                    onClick={triggerFileUpload}
                    isLoading={isParsing}
                    className="w-full sm:w-auto px-8"
                >
                    Scan Expense Receipt
                </Button>
            </motion.div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-yellow-800 dark:text-yellow-200 p-6 rounded-xl shadow-sm flex items-start space-x-4">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-bold text-lg">No Entrepreneurs Found</h3>
            <p className="mt-1">Please add an entrepreneur first before logging transactions.</p>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
          <Modal isOpen={true} onClose={() => setIsAddModalOpen(false)} title={`Add ${addType}`}>
              <TransactionForm 
                  onSubmit={handleAddSubmit}
                  onCancel={() => setIsAddModalOpen(false)}
                  entrepreneurs={entrepreneurs}
                  initialData={{ type: addType }}
              />
          </Modal>
      )}

      <TransactionList 
        transactions={transactions} 
        entrepreneurs={entrepreneurs} 
        onDeleteTransaction={onDeleteTransaction} 
        onEditTransaction={onEditTransaction}
      />
    </div>
  );
};

export default TransactionManager;
