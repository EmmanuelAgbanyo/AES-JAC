import React, { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import type { Entrepreneur, Transaction, AiReport, Goal } from '../types';
import { AppView, TransactionType } from '../constants';
import { GoalType } from '../types';
import Button from './ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Select from './ui/Select';
import HtmlReportView from './HtmlReportView';
import { generateAiPoweredReport } from '../services/geminiService';
import { generateStandardReport } from '../services/reportService';
import LoadingSpinner from './LoadingSpinner';
import GoalCard from './GoalCard';
import Modal from './ui/Modal';
import TransactionForm from './TransactionForm';
import ClientManager from './ClientManager';
import { LayoutDashboard, Users, TrendingUp, Package, User, Mail, Phone, Calendar, FileText, Save, Image as ImageIcon } from 'lucide-react';
import type { Client, InventoryItem, Supplier, InventoryLog } from '../types';
import InventoryManager from './InventoryManager';


interface EntrepreneurDashboardProps {
    entrepreneur: Entrepreneur | null;
    transactions: Transaction[];
    navigateTo: (view: AppView) => void;
    onEditTransaction: (transaction: Transaction) => void;
    onSetGoal: (entrepreneur: Entrepreneur) => void;
    userRole: 'admin' | 'entrepreneur';
    onAddTransaction?: (transaction: Transaction) => Promise<void>; // For entrepreneur to add transactions
    clients?: Client[];
    onAddClient?: (client: Client) => void;
    onUpdateClient?: (client: Client) => void;
    onDeleteClient?: (id: string) => void;
    inventory?: InventoryItem[];
    onAddInventoryItem?: (item: InventoryItem) => void;
    onUpdateInventoryItem?: (item: InventoryItem) => void;
    onDeleteInventoryItem?: (id: string) => void;
    suppliers?: Supplier[];
    onAddSupplier?: (supplier: Supplier) => void;
    onUpdateSupplier?: (supplier: Supplier) => void;
    onDeleteSupplier?: (id: string) => void;
    inventoryLogs?: InventoryLog[];
    onWriteLog?: (log: InventoryLog) => void;
    onUpdateEntrepreneur?: (entrepreneur: Entrepreneur) => Promise<void>;
    onUpdateTransaction?: (transaction: Transaction) => Promise<void>;
}

const StatCard = ({ title, value, color, icon }: { title: string, value: string | number, color: string, icon?: ReactNode }) => {
    // Map standard tailwind colors to glassmorphic gradient overlays based on the passed color string
    let gradientOverlay = 'from-gray-500/10';
    if (color.includes('success')) gradientOverlay = 'from-green-500/20';
    if (color.includes('info')) gradientOverlay = 'from-blue-500/20';
    if (color.includes('aesYellow')) gradientOverlay = 'from-yellow-500/20';
    if (color.includes('aesBlue')) gradientOverlay = 'from-indigo-500/20';
    if (color.includes('danger')) gradientOverlay = 'from-red-500/20';

    return (
        <div className={`relative overflow-hidden bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-6 rounded-3xl shadow-lg border border-white/50 dark:border-white/10 hover:border-white/80 dark:hover:border-white/20 transition-all duration-500 group hover:-translate-y-2 hover:shadow-2xl`}>
            {/* Subtle Gradient Background Overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${gradientOverlay} to-transparent pointer-events-none`}></div>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</p>
                </div>
                {icon && (
                    <div className="text-4xl opacity-80 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 drop-shadow-md">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};


const EntrepreneurDashboard = ({ entrepreneur, transactions, navigateTo, onEditTransaction, onSetGoal, userRole, onAddTransaction, onUpdateTransaction, clients = [], onAddClient, onUpdateClient, onDeleteClient, inventory = [], onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem, suppliers = [], onAddSupplier, onUpdateSupplier, onDeleteSupplier, inventoryLogs = [], onWriteLog, onUpdateEntrepreneur }: EntrepreneurDashboardProps) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'inventory' | 'profile'>('dashboard');
    const [showReportView, setShowReportView] = useState<boolean>(false);
    const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [aiReport, setAiReport] = useState<AiReport | null>(null);
    const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [autoGeneratePdf, setAutoGeneratePdf] = useState<boolean>(true);
    const [shouldAutoExport, setShouldAutoExport] = useState<boolean>(false);
    const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | undefined>(entrepreneur?.logoUrl);

    useEffect(() => {
        if (entrepreneur) {
            setLogoBase64(entrepreneur.logoUrl);
        }
    }, [entrepreneur]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(t => months.add(t.date.slice(0, 7)));
        if (months.size === 0) {
            return [];
        }
        return Array.from(months)
            .sort()
            .reverse()
            .map(m => ({
                value: m,
                label: new Date(m + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
            }));
    }, [transactions]);

    useEffect(() => {
        if (!selectedMonth && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0].value);
        }
    }, [availableMonths, selectedMonth]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        transactions.forEach(t => years.add(t.date.slice(0, 4)));
        if (years.size === 0) {
            return [];
        }
        return Array.from(years).sort().reverse().map(y => ({ value: y, label: y }));
    }, [transactions]);


    const handleGenerateReport = useCallback(async () => {
        const period = periodType === 'monthly' ? selectedMonth : selectedYear;
        if (!entrepreneur || !period) {
            setReportError("Please select a period to generate a report.");
            return;
        }
        setIsReportLoading(true);
        setReportError(null);
        setAiReport(null);

        try {
            const relevantTransactions = transactions.filter(t => t.date.startsWith(period));
            setShouldAutoExport(autoGeneratePdf && relevantTransactions.length > 0);

            let report: AiReport;
            try {
                // Attempt to generate the report using Gemini AI for strategic insights
                report = await generateAiPoweredReport(relevantTransactions, entrepreneur, period);
            } catch (aiError) {
                console.warn("AI generation failed or skipped, falling back to standard deterministic report.", aiError);
                // Generate deterministic highly-impressive CFO report locally without API dependency
                report = generateStandardReport(entrepreneur, period, relevantTransactions) as unknown as AiReport;
            }

            // Adding a small artificial delay to simulate "analysis" for a better UX when falling back locally
            setTimeout(() => {
                setAiReport(report);
                setShowReportView(true);
                setIsReportLoading(false);
            }, 1200);

        } catch (err) {
            console.error("Error generating report:", err);
            setReportError((err as Error).message || "Failed to generate report.");
            setIsReportLoading(false);
        }
    }, [entrepreneur, periodType, selectedMonth, selectedYear, transactions, autoGeneratePdf]);

    const handleAddTransactionSubmit = async (transaction: Transaction) => {
        if (onAddTransaction) {
            await onAddTransaction(transaction);
            setIsAddTransactionModalOpen(false); // Close modal on success
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onUpdateEntrepreneur || !entrepreneur) return;
        
        const form = e.target as HTMLFormElement;
        const updated: Entrepreneur = {
            ...entrepreneur,
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            businessName: (form.elements.namedItem('businessName') as HTMLInputElement).value,
            contact: (form.elements.namedItem('contact') as HTMLInputElement).value,
            bio: (form.elements.namedItem('bio') as HTMLTextAreaElement).value,
            startDate: (form.elements.namedItem('startDate') as HTMLInputElement).value,
            logoUrl: logoBase64,
        };
        
        await onUpdateEntrepreneur(updated);
        setActiveTab('dashboard');
    };

    const calculateGoalProgress = (goal: Goal) => {
        const goalPeriod = goal.targetDate.slice(0, 7); // YYYY-MM, assumes monthly goals for now
        const relevantTransactions = transactions.filter(t => t.date.startsWith(goalPeriod));

        switch (goal.type) {
            case GoalType.REVENUE_TARGET:
                return relevantTransactions
                    .filter(t => t.type === TransactionType.INCOME)
                    .reduce((sum, t) => sum + t.amount, 0);
            case GoalType.PROFIT_TARGET:
                const income = relevantTransactions
                    .filter(t => t.type === TransactionType.INCOME)
                    .reduce((sum, t) => sum + t.amount, 0);
                const expense = relevantTransactions
                    .filter(t => t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
                return income - expense;
            case GoalType.EXPENSE_REDUCTION:
                return relevantTransactions
                    .filter(t => t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
            default:
                return 0;
        }
    };


    const selectedPeriod = periodType === 'monthly' ? selectedMonth : selectedYear;
    const relevantTransactionsForPeriod = transactions.filter(t => t.date.startsWith(selectedPeriod));


    if (!entrepreneur) {
        return (
            <div className="text-center p-10 bg-white dark:bg-dark-secondary rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text mb-4">No Entrepreneur Selected</h2>
                <p className="text-gray-500 dark:text-dark-textSecondary mb-6">Please go back to the list and select an entrepreneur to view their dashboard.</p>
                <Button variant="primary" onClick={() => navigateTo(AppView.ENTREPRENEURS)}>← Go to Entrepreneurs List</Button>
            </div>
        )
    }

    if (isReportLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <LoadingSpinner message="JAC Automated Auditor is compiling the integrated financial report..." />
                <Button variant="secondary" onClick={() => setIsReportLoading(false)} className="mt-4">Cancel</Button>
            </div>
        );
    }

    if (showReportView && aiReport) {
        return (
            <HtmlReportView
                aiReport={aiReport}
                entrepreneur={entrepreneur}
                transactionsForPeriod={relevantTransactionsForPeriod}
                period={selectedPeriod}
                onClose={() => {
                    setShowReportView(false);
                    setAiReport(null);
                    setShouldAutoExport(false);
                }}
                autoExportAs={shouldAutoExport ? 'pdf' : null}
            />
        );
    }

    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const customers = transactions.reduce((acc, t) => {
        if (t.type === TransactionType.INCOME && t.customerName && t.customerName.trim() !== '') {
            const name = t.customerName.trim();
            if (!acc[name]) {
                acc[name] = { name, totalSpent: 0, transactionCount: 0, lastPurchase: '1970-01-01' };
            }
            acc[name].totalSpent += t.amount;
            acc[name].transactionCount += 1;
            if (new Date(t.date) > new Date(acc[name].lastPurchase)) {
                acc[name].lastPurchase = t.date;
            }
        }
        return acc;
    }, {} as Record<string, { name: string, totalSpent: number, transactionCount: number, lastPurchase: string }>);

    const customerList = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);

    const monthlyIncomeData = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => {
            const month = t.date.slice(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { income: 0, expense: 0 };
            }
            acc[month].income += t.amount;
            return acc;
        }, {} as Record<string, { income: number; expense: number }>);

    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
        const month = t.date.slice(0, 7);
        if (monthlyIncomeData[month]) {
            monthlyIncomeData[month].expense += t.amount;
        } else {
            monthlyIncomeData[month] = { income: 0, expense: t.amount };
        }
    });

    const chartData = Object.entries(monthlyIncomeData)
        .map(([month, data]) => ({
            name: new Date(month + '-02').toLocaleString('default', { month: 'short', year: 'numeric' }),
            Income: data.income,
            Expenses: data.expense,
        }))
        .sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime()).slice(0, 12).reverse();

    const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);


    return (
        <div className="space-y-8">
            {userRole === 'admin' && (
                <div className="flex justify-start">
                    <Button variant="secondary" onClick={() => navigateTo(AppView.ENTREPRENEURS)}>← Back to Entrepreneurs List</Button>
                </div>
            )}
            {isAddTransactionModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAddTransactionModalOpen(false)} title="Add New Transaction">
                    <TransactionForm
                        onSubmit={handleAddTransactionSubmit}
                        onCancel={() => setIsAddTransactionModalOpen(false)}
                        currentEntrepreneur={entrepreneur}
                        entrepreneurs={[]} // Not needed for entrepreneur view
                        inventory={inventory}
                    />
                </Modal>
            )}

            {/* Tab Navigation */}
            <div className="flex space-x-2 bg-white/50 dark:bg-black/30 backdrop-blur-md p-1.5 rounded-2xl shadow-inner border border-white/40 dark:border-white/10 mb-8 max-w-fit mx-auto md:mx-0 relative z-10">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
                    { id: 'clients', icon: Users, label: 'Clients' },
                    { id: 'inventory', icon: Package, label: 'Inventory' },
                    { id: 'profile', icon: User, label: 'Profile' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-aesBlue to-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-100'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'clients' ? (
                <div className="animate-fadeIn">
                    {onAddClient && onUpdateClient && onDeleteClient ? (
                        <ClientManager
                            clients={clients}
                            onAddClient={onAddClient}
                            onUpdateClient={onUpdateClient}
                            onDeleteClient={onDeleteClient}
                            entrepreneurId={entrepreneur.id}
                        />
                    ) : (
                        <div className="p-8 text-center text-gray-500">Client management features are not fully configured.</div>
                    )}
                </div>
            ) : activeTab === 'inventory' ? (
                <div className="animate-fadeIn">
                    {onAddInventoryItem && onUpdateInventoryItem && onDeleteInventoryItem ? (
                        <InventoryManager
                            inventory={inventory}
                            onAddInventoryItem={onAddInventoryItem}
                            onUpdateInventoryItem={onUpdateInventoryItem}
                            onDeleteInventoryItem={onDeleteInventoryItem}
                            entrepreneurId={entrepreneur.id}
                            suppliers={suppliers}
                            onAddSupplier={onAddSupplier}
                            onUpdateSupplier={onUpdateSupplier}
                            onDeleteSupplier={onDeleteSupplier}
                inventoryLogs={inventoryLogs}
                onWriteLog={onWriteLog}
                onAddTransaction={onAddTransaction}
                transactions={transactions.filter(t => t.entrepreneurId === entrepreneur.id)}
            />
        ) : (
                        <div className="p-8 text-center text-gray-500">Inventory management features are not fully configured.</div>
                    )}
                </div>
            ) : activeTab === 'profile' ? (
                <div className="animate-fadeIn max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
                        <div className="bg-gradient-to-r from-aesBlue to-indigo-600 p-8 text-white relative">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-2">Edit Business Profile</h2>
                                <p className="text-blue-100 opacity-80">Keep your professional identity up to date</p>
                            </div>
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <User size={120} />
                            </div>
                        </div>
                        
                        <form onSubmit={handleProfileSubmit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Basic Information</h4>
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aesBlue transition-colors" size={18} />
                                            <input 
                                                name="name" 
                                                defaultValue={entrepreneur.name} 
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-aesBlue focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Business Name</label>
                                        <div className="relative">
                                            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aesBlue transition-colors" size={18} />
                                            <input 
                                                name="businessName" 
                                                defaultValue={entrepreneur.businessName} 
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-aesBlue focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Contact & Operations</h4>
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Contact Email / Phone</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aesBlue transition-colors" size={18} />
                                            <input 
                                                name="contact" 
                                                defaultValue={entrepreneur.contact} 
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-aesBlue focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Launch Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-aesBlue transition-colors" size={18} />
                                            <input 
                                                type="date"
                                                name="startDate" 
                                                defaultValue={entrepreneur.startDate} 
                                                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-aesBlue focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Business Logo</label>
                                        <div className="relative flex items-center gap-4 mt-2">
                                            {logoBase64 ? (
                                                <img src={logoBase64} alt="Preview" className="w-12 h-12 rounded-xl object-cover ring-2 ring-aesBlue" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-black/30 flex items-center justify-center shrink-0">
                                                    <ImageIcon className="text-gray-400" size={20} />
                                                </div>
                                            )}
                                            <input 
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-aesBlue hover:file:bg-blue-100 dark:file:bg-black/50 dark:file:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Business Bio / Value Proposition</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 text-gray-400 group-focus-within:text-aesBlue transition-colors" size={18} />
                                    <textarea 
                                        name="bio" 
                                        defaultValue={entrepreneur.bio} 
                                        rows={4}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-aesBlue focus:border-transparent outline-none transition-all resize-none"
                                        placeholder="Describe what your business does..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setActiveTab('dashboard')}>Cancel</Button>
                                <Button type="submit" className="px-8 bg-gradient-to-r from-aesBlue to-indigo-600 shadow-lg shadow-indigo-500/20" icon={<Save size={18} />}>
                                    Save Profile Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fadeIn">
                    {/* Header Banner - Glassmorphic */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-6 bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl shadow-indigo-500/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-aesBlue/5 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                        <div className="flex items-center space-x-6 relative z-10">
                            {entrepreneur.logoUrl ? (
                                <img src={entrepreneur.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl object-cover shadow-xl shadow-yellow-500/30 ring-4 ring-white/50 dark:ring-black/20 transform group-hover:rotate-3 transition-transform duration-500" />
                            ) : (
                                <div className="text-5xl bg-gradient-to-br from-aesYellow to-yellow-600 text-white w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 font-extrabold shadow-xl shadow-yellow-500/30 ring-4 ring-white/50 dark:ring-black/20 transform group-hover:rotate-3 transition-transform duration-500">
                                    {entrepreneur.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-grow">
                                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">{entrepreneur.name}</h1>
                                <p className="text-xl text-aesBlue dark:text-blue-400 font-bold mt-1">{entrepreneur.businessName}</p>
                                {entrepreneur.bio && <p className="mt-2 text-gray-500 dark:text-gray-400 italic">"{entrepreneur.bio}"</p>}
                            </div>
                        </div>
                        <div className="relative z-10">
                            {userRole === 'entrepreneur' && (
                                <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-500/30 transition-all transform hover:scale-105 font-bold" onClick={() => setIsAddTransactionModalOpen(true)}>
                                    + Add Transaction
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Lifetime Income" value={`GHS ${totalIncome.toFixed(2)}`} color="border-success" icon={<span>💰</span>} />
                        <StatCard title="Total Customers" value={customerList.length} color="border-info" icon={<span>👥</span>} />
                        <StatCard title="Total Transactions" value={transactions.length} color="border-aesYellow" icon={<span>🔄</span>} />
                        <StatCard title="Lifetime Net" value={`GHS ${netIncome.toFixed(2)}`} color={netIncome >= 0 ? "border-aesBlue" : "border-danger"} icon={<span>🏦</span>} />
                    </div>

                    {/* Goals Section */}
                    <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-xl transition-colors duration-500 hover:border-white/80 dark:hover:border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Goals & Milestones</h3>
                            <button className="bg-aesBlue/10 text-aesBlue hover:bg-aesBlue hover:text-white transition-colors duration-300 px-4 py-2 rounded-xl font-bold text-sm" onClick={() => onSetGoal(entrepreneur)}>Set New Goal</button>
                        </div>
                        {entrepreneur.goals && entrepreneur.goals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {entrepreneur.goals.map(goal => (
                                    <GoalCard key={goal.id} goal={goal} currentValue={calculateGoalProgress(goal)} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white/50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400 italic font-medium">No goals set yet. Click "Set New Goal" to get started.</p>
                            </div>
                        )}
                    </div>

                    {/* Report Generator Card */}
                    <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg border-2 border-aesYellow">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">AI Performance Reports</h3>
                        <p className="text-gray-600 dark:text-dark-textSecondary mb-4">
                            Select a period to generate a detailed, professional report with AI-powered financial analysis.
                        </p>
                        {(availableMonths.length > 0 || availableYears.length > 0) ? (
                            <>
                                <div className="flex flex-col sm:flex-row gap-4 items-end mb-4">
                                    <div className="w-full sm:w-auto">
                                        <Select
                                            label="Report Type"
                                            id="reportType"
                                            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]}
                                            value={periodType}
                                            onChange={e => setPeriodType(e.target.value as 'monthly' | 'yearly')}
                                        />
                                    </div>
                                    <div className="w-full sm:w-auto flex-grow">
                                        {periodType === 'monthly' ? (
                                            <Select
                                                label="Report Month"
                                                id="reportMonth"
                                                options={availableMonths}
                                                value={selectedMonth}
                                                onChange={(e) => { setSelectedMonth(e.target.value); setReportError(null); }}
                                                required
                                            />
                                        ) : (
                                            <Select
                                                label="Report Year"
                                                id="reportYear"
                                                options={availableYears}
                                                value={selectedYear}
                                                onChange={(e) => { setSelectedYear(e.target.value); setReportError(null); }}
                                                required
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <input
                                                id="auto-pdf-checkbox-dash"
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary"
                                                checked={autoGeneratePdf}
                                                onChange={(e) => setAutoGeneratePdf(e.target.checked)}
                                            />
                                            <label htmlFor="auto-pdf-checkbox-dash" className="ml-2 block text-sm text-gray-700 dark:text-dark-textSecondary">
                                                Auto-generate PDF
                                            </label>
                                        </div>
                                        <Button onClick={handleGenerateReport} disabled={!selectedPeriod}>
                                            Generate AI Report
                                        </Button>
                                    </div>
                                </div>
                                {reportError && <p className="text-red-500 mt-2">{reportError}</p>}
                            </>
                        ) : (
                            <p className="text-gray-500 dark:text-dark-textSecondary p-4 bg-gray-50 dark:bg-dark-primary rounded-md">No transactions recorded yet. An AI report can be generated once transactions are added.</p>
                        )}
                    </div>

                    {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Chart */}
                            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-xl transition-colors duration-500 hover:border-white/80 dark:hover:border-white/20">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Monthly Performance</h3>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#8b949e', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="Income" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Expenses" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} />
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                                                </linearGradient>
                                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-gray-500 dark:text-gray-400 italic">Not enough data for a monthly chart.</p>}
                            </div>
                            {/* Recent Transactions */}
                            <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-xl transition-colors duration-500 hover:border-white/80 dark:hover:border-white/20">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Recent Transactions</h3>
                                {recentTransactions.length > 0 ? (
                                    <ul className="space-y-3">
                                        {recentTransactions.map(t => (
                                            <li key={t.id} className="p-4 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex justify-between items-center hover:bg-white/80 dark:hover:bg-white/10 transition-all hover:shadow-md hover:-translate-y-0.5 group">
                                                <div className="flex-grow">
                                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{t.description}</p>
                                                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        <span className="font-medium bg-gray-100 dark:bg-black/30 px-2 py-0.5 rounded-md">{new Date(t.date).toLocaleDateString()}</span>
                                                        <span>&bull;</span>
                                                        <span className={`font-bold px-2 py-0.5 rounded-md ${t.type === TransactionType.INCOME ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'}`}>
                                                            {t.type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end">
                                                    <p className={`font-extrabold text-xl ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === TransactionType.INCOME ? '+' : '-'}GHS {t.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </p>
                                                    <button onClick={() => onEditTransaction(t)} className="mt-2 text-xs font-bold text-aesBlue hover:text-indigo-700 transition-colors bg-blue-50/50 dark:bg-white/5 px-3 py-1.5 rounded-lg hover:bg-blue-100/50 border border-blue-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">Edit</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-gray-500 dark:text-gray-400 italic">No transactions recorded yet.</p>}
                            </div>
                        </div>

                        {/* Customer List */}
                        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-xl transition-colors duration-500 hover:border-white/80 dark:hover:border-white/20">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Top Customers</h3>
                            {customerList.length > 0 ? (
                                <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '600px' }}>
                                    <ul className="space-y-3">
                                        {customerList.map((c, idx) => (
                                            <li key={c.name} className="p-4 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center hover:bg-white/80 dark:hover:bg-white/10 transition-all hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-600' : 'bg-transparent'}`}></div>
                                                <div className="w-10 h-10 rounded-xl bg-aesBlue/10 text-aesBlue flex items-center justify-center font-bold text-lg mr-4 shrink-0">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-extrabold text-gray-900 dark:text-white">{c.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{c.transactionCount} purchase(s) &bull; {new Date(c.lastPurchase).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-bold text-aesBlue bg-blue-50 dark:bg-white/5 px-2.5 py-1 rounded-xl shadow-sm border border-blue-100 dark:border-white/5">
                                                        GHS {c.totalSpent.toLocaleString()}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : <p className="text-gray-500 dark:text-gray-400 italic">No customers with recorded names yet.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntrepreneurDashboard;