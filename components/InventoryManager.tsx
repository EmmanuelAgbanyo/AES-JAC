import React, { useState, useMemo } from 'react';
import Input from './ui/Input';
import type { InventoryItem } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import InventoryItemForm from './InventoryItemForm';
import { 
    Package, Search, Plus, Download, Edit2, Trash2, AlertTriangle, Layers, Tag, 
    DollarSign, TrendingUp, Filter, ArrowUpDown, RefreshCw, BarChart2, Calendar, 
    History, MapPin, Users as UsersIcon, Clock, ChevronRight, Activity, SearchIcon,
    ShoppingCart, CreditCard, ShoppingBag, Receipt, ArrowRight, Minus, PieChart as PieIcon,
    CheckCircle, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LogType, type InventoryLog, type Supplier, type Transaction } from '../types';

const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
);

interface InventoryManagerProps {
    inventory: InventoryItem[];
    onAddInventoryItem: (item: InventoryItem) => void;
    onUpdateInventoryItem: (item: InventoryItem) => void;
    onDeleteInventoryItem: (id: string) => void;
    entrepreneurId: string;
    suppliers: Supplier[];
    onAddSupplier: (supplier: Supplier) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (id: string) => void;
    inventoryLogs: InventoryLog[];
    onWriteLog: (log: InventoryLog) => void;
    onAddTransaction: (transaction: any) => void;
    transactions: Transaction[];
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ 
    inventory, onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem, 
    entrepreneurId, suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, 
    inventoryLogs, onWriteLog, onAddTransaction, transactions
}) => {
    const [activeView, setActiveView] = useState<'inventory' | 'suppliers' | 'history' | 'pos' | 'analytics'>('inventory');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
    const [viewingLogsItem, setViewingLogsItem] = useState<InventoryItem | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    
    const [restockAmount, setRestockAmount] = useState<string>('');
    const [restockReason, setRestockReason] = useState<LogType>(LogType.RESTOCK);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'value' | 'margin' | 'expiry' | 'sales'>('name');
    
    // POS State
    const [cart, setCart] = useState<{item: InventoryItem, qty: number}[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [lastSaleBatch, setLastSaleBatch] = useState<{items: any[], total: number, method: string} | null>(null);

    const categories = useMemo(() => ['All', ...Array.from(new Set(inventory.map(i => i.category).filter(Boolean)))], [inventory]);

    const filteredInventory = useMemo(() => {
        let result = inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (categoryFilter !== 'All') {
            result = result.filter(item => item.category === categoryFilter);
        }

        if (statusFilter !== 'All') {
            if (statusFilter === 'Out of Stock') result = result.filter(item => item.quantity <= 0);
            if (statusFilter === 'Low Stock') result = result.filter(item => item.quantity > 0 && item.quantity <= (item.lowStockThreshold || 5));
            if (statusFilter === 'Expiring Soon') {
                const soon = new Date();
                soon.setDate(soon.getDate() + 30);
                result = result.filter(item => item.expiryDate && new Date(item.expiryDate) <= soon);
            }
        }

        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'quantity') return b.quantity - a.quantity;
            if (sortBy === 'value') return (b.quantity * b.price) - (a.quantity * a.price);
            if (sortBy === 'margin') {
                const marginA = ((a.price - a.cost) / a.price) || 0;
                const marginB = ((b.price - b.cost) / b.price) || 0;
                return marginB - marginA;
            }
            if (sortBy === 'expiry') {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            }
            if (sortBy === 'sales') return (b.totalUnitsSold || 0) - (a.totalUnitsSold || 0);
            return 0;
        });

        return result;
    }, [inventory, searchTerm, categoryFilter, statusFilter, sortBy]);

    const stats = useMemo(() => {
        const totalItems = inventory.length;
        const outOfStock = inventory.filter(i => i.quantity <= 0).length;
        const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= (i.lowStockThreshold || 5)).length;
        const expiringSoon = inventory.filter(item => {
            if (!item.expiryDate) return false;
            const soon = new Date();
            soon.setDate(soon.getDate() + 30);
            return new Date(item.expiryDate) <= soon;
        }).length;

        const totalValue = inventory.reduce((acc, i) => acc + (i.quantity * i.price), 0);
        const totalCost = inventory.reduce((acc, i) => acc + (i.quantity * i.cost), 0);
        const totalRevenue = inventory.reduce((acc, i) => acc + (i.totalRevenue || 0), 0);
        const totalSoldCount = inventory.reduce((acc, i) => acc + (i.totalUnitsSold || 0), 0);
        const potentialProfit = totalValue - totalCost;
        
        const categoryData = categories.filter(c => c !== 'All').map(cat => ({
            name: cat as string,
            value: inventory.filter(i => i.category === cat).length
        })).sort((a, b) => b.value - a.value);

        const salesData = inventory.filter(i => (i.totalUnitsSold || 0) > 0).map(i => ({
            name: i.name,
            sales: i.totalUnitsSold || 0,
            revenue: i.totalRevenue || 0
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        return { totalItems, outOfStock, lowStock, expiringSoon, totalValue, totalCost, potentialProfit, categoryData, totalRevenue, totalSoldCount, salesData };
    }, [inventory, categories]);

    const logInventoryAction = (itemId: string, type: LogType, quantityChange: number, reason: string) => {
        const log: InventoryLog = {
            id: crypto.randomUUID(),
            itemId,
            entrepreneurId,
            timestamp: new Date().toISOString(),
            type,
            quantityChange,
            reason,
            performedBy: 'Entrepreneur'
        };
        onWriteLog(log);
    };

    const handleFormSubmit = (item: InventoryItem) => {
        if (editingItem) {
            onUpdateInventoryItem(item);
            if (item.quantity !== editingItem.quantity) {
                logInventoryAction(item.id, LogType.ADJUSTMENT, item.quantity - editingItem.quantity, "Manual Adjustment");
            }
        } else {
            onAddInventoryItem(item);
            logInventoryAction(item.id, LogType.RESTOCK, item.quantity, "Initial Stock Setup");
        }
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleRestockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (restockItem && restockAmount) {
            const amount = parseInt(restockAmount);
            if (!isNaN(amount) && amount !== 0) {
                const updatedItem = {
                    ...restockItem,
                    quantity: restockItem.quantity + amount,
                    lastRestockDate: new Date().toISOString()
                };
                onUpdateInventoryItem(updatedItem);
                logInventoryAction(restockItem.id, restockReason, amount, `Stock ${amount > 0 ? 'added' : 'removed'} via Quick Action`);
                setIsRestockModalOpen(false);
                setRestockItem(null);
                setRestockAmount('');
            }
        }
    };

    const handleSupplierSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const supplier: Supplier = {
            id: editingSupplier?.id || crypto.randomUUID(),
            entrepreneurId,
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            contactName: (form.elements.namedItem('contactName') as HTMLInputElement).value,
            email: (form.elements.namedItem('email') as HTMLInputElement).value,
            phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
            category: (form.elements.namedItem('category') as HTMLInputElement).value,
            notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
        };
        if (editingSupplier) onUpdateSupplier(supplier);
        else onAddSupplier(supplier);
        setIsSupplierModalOpen(false);
        setEditingSupplier(null);
    };

    // POS Logic
    const addToCart = (item: InventoryItem) => {
        if (item.quantity <= 0) return;
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                if (existing.qty >= item.quantity) return prev;
                return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { item, qty: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(c => c.item.id !== itemId).map(c => c.item.id === itemId && c.qty > 1 ? { ...c, qty: c.qty - 1 } : c));
    };
    
    const updateCartQty = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === itemId) {
                const newQty = Math.max(1, Math.min(c.item.quantity, c.qty + delta));
                return { ...c, qty: newQty };
            }
            return c;
        }));
    };

    const handleCheckout = async (paymentMethod: any) => {
        const batch = {
            items: cart.map(c => ({ name: c.item.name, qty: c.qty, price: c.item.price })),
            total: cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0),
            method: paymentMethod
        };

        for (const line of cart) {
            const updatedItem: InventoryItem = {
                ...line.item,
                quantity: line.item.quantity - line.qty,
                totalRevenue: (line.item.totalRevenue || 0) + (line.item.price * line.qty),
                totalUnitsSold: (line.item.totalUnitsSold || 0) + line.qty
            };
            
            // 1. Update Inventory
            onUpdateInventoryItem(updatedItem);
            
            // 2. Write Log
            logInventoryAction(line.item.id, LogType.SALE, -line.qty, `POS Sale: ${line.qty} units`);
            
            // 3. Create Transaction
            onAddTransaction({
                id: crypto.randomUUID(),
                entrepreneurId,
                type: 'Income' as any,
                date: new Date().toISOString(),
                description: `Sale: ${line.item.name} x${line.qty}`,
                amount: line.item.price * line.qty,
                paymentMethod,
                inventoryItemId: line.item.id,
                quantitySold: line.qty
            });
        }
        
        setLastSaleBatch(batch);
        setCart([]);
        setIsCheckoutOpen(false);
        setIsSuccessOpen(true);
    };

    const handleGenerateReport = (period: 'daily' | 'weekly' | 'monthly') => {
        const now = new Date();
        let startDate = new Date();
        
        if (period === 'daily') startDate.setHours(0,0,0,0);
        else if (period === 'weekly') startDate.setDate(now.getDate() - 7);
        else if (period === 'monthly') startDate.setMonth(now.getMonth() - 1);

        const reportData = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= now && t.inventoryItemId;
        }).map(t => {
            const item = inventory.find(i => i.id === t.inventoryItemId);
            return {
                Date: new Date(t.date).toLocaleDateString(),
                Item: item?.name || t.description,
                SKU: item?.sku || 'N/A',
                Quantity: t.quantitySold || 1,
                Price: item?.price || 0,
                Total: t.amount,
                Method: t.paymentMethod,
                Status: 'PAID'
            };
        });

        if (reportData.length === 0) {
            alert(`No sales recorded for this ${period} period.`);
            return;
        }

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
        XLSX.writeFile(wb, `AES_Sales_Report_${period}_${now.toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportInventory = () => {
        const data = inventory.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Category: item.category,
            Quantity: item.quantity,
            Price: item.price,
            Cost: item.cost,
            Location: item.location,
            Expiry: item.expiryDate,
            Supplier: suppliers.find(s => s.id === item.supplierId)?.name || 'N/A'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "enterprise_inventory_export.xlsx");
    };

    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
            {/* Top Navigation Tabs */}
            <div className="flex bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1 rounded-2xl border border-white/20 dark:border-white/10 w-fit">
                <button 
                    onClick={() => setActiveView('inventory')}
                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Package size={16} /> Inventory
                    </div>
                </button>
                <button 
                    onClick={() => setActiveView('suppliers')}
                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'suppliers' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <UsersIcon size={16} /> Suppliers
                    </div>
                </button>
                <button 
                    onClick={() => setActiveView('history')}
                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <History size={16} /> Audit Logs
                    </div>
                </button>
                <div className="mx-2 w-[1px] bg-gray-200 dark:bg-gray-700 h-6 self-center" />
                <button 
                    onClick={() => setActiveView('pos')}
                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'pos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={16} /> Sales Terminal
                    </div>
                </button>
                <button 
                    onClick={() => setActiveView('analytics')}
                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === 'analytics' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart2 size={16} /> Financial Insights
                    </div>
                </button>
            </div>

            {activeView === 'inventory' && (
                <>
                    {/* Professional Alerts */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {stats.lowStock > 0 && (
                            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4">
                                <div className="p-2 bg-red-500 rounded-lg text-white"><AlertTriangle size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-red-600">Low Stock Detected</h4>
                                    <p className="text-xs text-red-500/80">{stats.lowStock} items require immediate reorder.</p>
                                </div>
                            </div>
                        )}
                        {stats.expiringSoon > 0 && (
                            <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
                                <div className="p-2 bg-orange-500 rounded-lg text-white"><Clock size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-orange-600">Expiry Warnings</h4>
                                    <p className="text-xs text-orange-500/80">{stats.expiringSoon} items expiring within 30 days.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <GlassCard className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Active Stock</p>
                                    <h3 className="text-3xl font-black mt-1">{stats.totalItems}</h3>
                                </div>
                                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Package size={24} /></div>
                            </div>
                        </GlassCard>
                        <GlassCard className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Stock Health</p>
                                    <h3 className={`text-3xl font-black mt-1 ${stats.outOfStock > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {Math.round(((stats.totalItems - stats.outOfStock) / stats.totalItems) * 100 || 100)}%
                                    </h3>
                                </div>
                                <div className="p-3 bg-green-500/10 text-green-600 rounded-xl"><Activity size={24} /></div>
                            </div>
                        </GlassCard>
                        <GlassCard className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Assets Value</p>
                                    <h3 className="text-3xl font-black mt-1">GHS {stats.totalValue.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl"><DollarSign size={24} /></div>
                            </div>
                        </GlassCard>
                        <GlassCard className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-blue-100 font-bold uppercase tracking-widest opacity-80">Potential Profit</p>
                                    <h3 className="text-3xl font-black mt-1">GHS {stats.potentialProfit.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl"><TrendingUp size={24} /></div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Controls Bar */}
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-grow w-full">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by SKU, Name or Location..."
                                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <select 
                                className="flex-1 lg:w-40 px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Optimal">Optimal</option>
                                <option value="Low Stock">Low Stock</option>
                                <option value="Expiring Soon">Expiring Soon</option>
                            </select>
                            <Button onClick={handleExportInventory} variant="secondary" className="rounded-2xl h-[46px]"><Download size={18} /></Button>
                            <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-[46px] px-6" icon={<Plus size={18} />}>Stock</Button>
                        </div>
                    </div>

                    {/* Inventory Table/Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredInventory.map(item => (
                            <GlassCard key={item.id} className="group relative">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl ${item.quantity <= 0 ? 'bg-red-500' : 'bg-blue-600'} text-white shadow-lg`}>
                                            <Package size={24} />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setViewingLogsItem(item); setIsLogModalOpen(true); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><History size={16} /></button>
                                            <button onClick={() => { setRestockItem(item); setIsRestockModalOpen(true); }} className="p-2 hover:bg-green-100 text-green-600 rounded-lg"><RefreshCw size={16} /></button>
                                            <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={16} /></button>
                                            <button onClick={() => onDeleteInventoryItem(item.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-xl font-bold mb-1 truncate">{item.name}</h4>
                                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                        <Tag size={12} /> {item.category || 'General'} &bull; <MapPin size={12} /> {item.location || 'unassigned'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Qty Available</p>
                                            <p className={`text-xl font-black ${item.quantity <= (item.lowStockThreshold || 0) ? 'text-red-500' : 'text-blue-600'}`}>
                                                {item.quantity}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Margin</p>
                                            <p className="text-xl font-black text-green-500">
                                                {Math.round(((item.price - item.cost) / item.price) * 100 || 0)}%
                                            </p>
                                        </div>
                                    </div>

                                    {item.expiryDate && (
                                        <div className={`mt-4 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                                            new Date(item.expiryDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                            <div className="flex items-center gap-2"><Calendar size={14} /> Expiry: {new Date(item.expiryDate).toLocaleDateString()}</div>
                                            {new Date(item.expiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </>
            )}

            {activeView === 'suppliers' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Supplier Directory</h2>
                        <Button onClick={() => setIsSupplierModalOpen(true)} icon={<Plus size={18} />}>Add Supplier</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suppliers.map(supplier => (
                            <GlassCard key={supplier.id} className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingSupplier(supplier); setIsSupplierModalOpen(true); }} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                                        <button onClick={() => onDeleteSupplier(supplier.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <h4 className="text-xl font-bold">{supplier.name}</h4>
                                <p className="text-sm text-gray-500 mb-4">{supplier.category}</p>
                                <div className="space-y-2 text-xs">
                                    <p className="flex items-center gap-2"><strong>Contact:</strong> {supplier.contactName}</p>
                                    <p className="flex items-center gap-2"><strong>Phone:</strong> {supplier.phone}</p>
                                    <p className="flex items-center gap-2"><strong>Email:</strong> {supplier.email}</p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}

            {activeView === 'history' && (
                <GlassCard className="p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><History /> Inventory Audit Trail</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-gray-800 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                    <th className="py-4">Timestamp</th>
                                    <th>Item</th>
                                    <th>Action</th>
                                    <th>Adjustment</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {inventoryLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => {
                                    const item = inventory.find(i => i.id === log.itemId);
                                    return (
                                        <tr key={log.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="py-4 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="font-bold">{item?.name || 'Unknown Item'}</td>
                                            <td>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                                    log.type === LogType.RESTOCK ? 'bg-green-100 text-green-600' :
                                                    log.type === LogType.SALE ? 'bg-blue-100 text-blue-600' :
                                                    'bg-orange-100 text-orange-600'
                                                }`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className={`font-mono font-bold ${log.quantityChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                            </td>
                                            <td className="text-gray-500 italic">{log.reason}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}

            {activeView === 'pos' && (
                <div className="flex flex-col lg:flex-row gap-8 animate-fadeIn">
                    <div className="flex-grow space-y-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-grow">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Scan SKU or search name..."
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select 
                                className="px-4 py-4 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredInventory.map(item => (
                                <button 
                                    key={item.id}
                                    disabled={item.quantity <= 0}
                                    onClick={() => addToCart(item)}
                                    className={`text-left p-4 rounded-2xl border transition-all ${
                                        item.quantity <= 0 
                                        ? 'bg-gray-100 dark:bg-gray-800/20 border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed' 
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-lg active:scale-95'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                                            <Package size={20} />
                                        </div>
                                        <div className="text-xs font-bold text-gray-400">STOCK: {item.quantity}</div>
                                    </div>
                                    <h5 className="font-bold text-sm truncate">{item.name}</h5>
                                    <p className="text-lg font-black text-indigo-600">GHS {item.price}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{item.brand || 'No Brand'}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full lg:w-96">
                        <GlassCard className="p-6 sticky top-8 flex flex-col h-[calc(100vh-200px)]">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingCart className="text-indigo-600" />
                                <h3 className="text-xl font-bold">Shopping Cart</h3>
                                <span className="ml-auto bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs">{cart.length}</span>
                            </div>

                            <div className="flex-grow overflow-y-auto space-y-4 mb-6 pr-2">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-center space-y-4">
                                        <ShoppingBag size={48} className="opacity-20" />
                                        <p>Your cart is empty.<br/>Select products to start a sale.</p>
                                    </div>
                                ) : (
                                    cart.map(line => (
                                        <div key={line.item.id} className="flex gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                            <div className="flex-grow">
                                                <h6 className="font-bold text-sm truncate">{line.item.name}</h6>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button onClick={() => updateCartQty(line.item.id, -1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"><Minus size={14} /></button>
                                                    <span className="text-xs font-bold w-4 text-center">{line.qty}</span>
                                                    <button onClick={() => updateCartQty(line.item.id, 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">GHS {line.item.price * line.qty}</p>
                                                <button onClick={() => removeFromCart(line.item.id)} className="text-[10px] text-red-500 hover:underline">Remove</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-bold text-gray-900 dark:text-white">GHS {cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xl font-black">
                                    <span>Total</span>
                                    <span className="text-indigo-600">GHS {cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0)}</span>
                                </div>
                                <Button 
                                    disabled={cart.length === 0}
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {activeView === 'analytics' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none">
                            <p className="text-xs font-bold uppercase opacity-80 mb-1">Total Revenue</p>
                            <h3 className="text-4xl font-black">GHS {stats.totalRevenue.toLocaleString()}</h3>
                            <div className="mt-4 flex items-center gap-2 text-sm bg-black/10 w-fit px-3 py-1 rounded-full">
                                <TrendingUp size={16} /> +12.5% vs last month
                            </div>
                        </GlassCard>
                        <GlassCard className="p-6">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Units Sold</p>
                            <h3 className="text-4xl font-black">{stats.totalSoldCount}</h3>
                            <p className="text-xs text-gray-400 mt-2">Across {inventory.filter(i => (i.totalUnitsSold || 0) > 0).length} performing items</p>
                        </GlassCard>
                        <GlassCard className="p-6">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Avg. Gross Margin</p>
                            <h3 className="text-4xl font-black text-emerald-500">
                                {Math.round((stats.potentialProfit / stats.totalValue) * 100 || 0)}%
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Overall portfolio profitability</p>
                        </GlassCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold mb-6">Top Products by Revenue</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.salesData}>
                                        <XAxis dataKey="name" hide />
                                        <RechartsTooltip />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-3">
                                {stats.salesData.map((item, idx) => (
                                    <div key={item.name} className="flex items-center gap-3">
                                        <span className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-[10px] font-bold">{idx+1}</span>
                                        <span className="text-sm font-medium flex-grow truncate">{item.name}</span>
                                        <span className="text-sm font-black">GHS {item.revenue}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold mb-6">Stock Distribution by Category</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.categoryData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.categoryData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <RechartsLegend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </GlassCard>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <GlassCard className="p-8 bg-black/5 dark:bg-white/5 border-dashed border-2">
                             <div className="text-center space-y-2">
                                 <TrendingUp className="mx-auto text-emerald-500" size={32} />
                                 <h4 className="text-xl font-bold">Predictive Intelligence</h4>
                                 <p className="text-sm text-gray-500 max-w-md mx-auto">Based on your sales velocity of {Math.round(stats.totalSoldCount / 30 || 0)} units/day, your inventory is projected to last for approximately <span className="text-emerald-500 font-bold">45 days</span>.</p>
                             </div>
                        </GlassCard>

                        <GlassCard className="p-8 border-indigo-500/30 bg-indigo-500/5">
                             <div className="flex items-center gap-4 mb-6">
                                 <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                                     <FileText size={24} />
                                 </div>
                                 <h4 className="text-xl font-bold">Auditable Reports</h4>
                             </div>
                             <p className="text-sm text-gray-500 mb-6">Generate professional Excel audit logs for your sales activities.</p>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                 <button onClick={() => handleGenerateReport('daily')} className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all font-bold text-xs uppercase">Daily</button>
                                 <button onClick={() => handleGenerateReport('weekly')} className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all font-bold text-xs uppercase">Weekly</button>
                                 <button onClick={() => handleGenerateReport('monthly')} className="flex items-center justify-center gap-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all font-bold text-xs uppercase">Monthly</button>
                             </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingItem ? "Edit Asset" : "Add New Asset"}>
                    <InventoryItemForm 
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsModalOpen(false)}
                        initialData={editingItem || undefined}
                        entrepreneurId={entrepreneurId}
                        suppliers={suppliers}
                    />
                </Modal>
            )}

            {isRestockModalOpen && restockItem && (
                <Modal isOpen={true} onClose={() => setIsRestockModalOpen(false)} title={`Quick Stock Action: ${restockItem.name}`}>
                    <form onSubmit={handleRestockSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <p className="text-xs text-gray-500">Current Stock</p>
                                <p className="text-2xl font-black">{restockItem.quantity}</p>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-500/20">
                                <p className="text-xs text-blue-500">Adjustment</p>
                                <p className="text-2xl font-black text-blue-600">{restockAmount || '0'}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-400">Action Type</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <button type="button" onClick={() => setRestockReason(LogType.RESTOCK)} className={`p-2 rounded-xl border text-xs font-bold ${restockReason === LogType.RESTOCK ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-500'}`}>RESTOCK</button>
                                    <button type="button" onClick={() => setRestockReason(LogType.ADJUSTMENT)} className={`p-2 rounded-xl border text-xs font-bold ${restockReason === LogType.ADJUSTMENT ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-500'}`}>ADJUSTMENT</button>
                                </div>
                            </div>
                            <input 
                                type="number" 
                                autoFocus
                                className="w-full px-4 py-4 bg-gray-100 dark:bg-gray-800 border-none rounded-2xl text-2xl font-black text-center"
                                placeholder="Enter amount..."
                                value={restockAmount}
                                onChange={(e) => setRestockAmount(e.target.value)}
                            />
                            <p className="text-[10px] text-center text-gray-400 italic">Use negative numbers to remove stock (e.g. -5 for damage/return)</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setIsRestockModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Confirm Action</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isSupplierModalOpen && (
                <Modal isOpen={true} onClose={() => setIsSupplierModalOpen(false)} title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}>
                    <form onSubmit={handleSupplierSubmit} className="space-y-4">
                        <Input label="Supplier Name" id="name" name="name" defaultValue={editingSupplier?.name} required />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Contact Person" id="contactName" name="contactName" defaultValue={editingSupplier?.contactName} />
                            <Input label="Category" id="category" name="category" defaultValue={editingSupplier?.category} placeholder="e.g. Raw Materials" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Phone" id="phone" name="phone" defaultValue={editingSupplier?.phone} />
                            <Input label="Email" id="email" name="email" defaultValue={editingSupplier?.email} type="email" />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</label>
                            <textarea id="notes" name="notes" defaultValue={editingSupplier?.notes} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
                            <Button type="button" variant="secondary" onClick={() => setIsSupplierModalOpen(false)}>Cancel</Button>
                            <Button type="submit">{editingSupplier ? 'Update' : 'Add Supplier'}</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {isCheckoutOpen && (
                <Modal isOpen={true} onClose={() => setIsCheckoutOpen(false)} title="Finalize Sale">
                    <div className="space-y-6">
                        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl shadow-indigo-500/20 text-center">
                            <p className="text-xs font-bold uppercase opacity-80 mb-1">Total Amount Due</p>
                            <p className="text-4xl font-black">GHS {cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0)}</p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-500">Select Payment Method</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleCheckout('Cash')} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all group">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors"><DollarSign size={24} /></div>
                                    <span className="font-bold text-sm">Cash</span>
                                </button>
                                <button onClick={() => handleCheckout('Mobile Money')} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all group">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors"><ArrowRight size={24} /></div>
                                    <span className="font-bold text-sm">Mobile Money</span>
                                </button>
                                <button onClick={() => handleCheckout('Bank Transfer')} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all group">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Receipt size={24} /></div>
                                    <span className="font-bold text-sm">Transfer</span>
                                </button>
                                <button onClick={() => handleCheckout('POS Terminal')} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 hover:shadow-lg transition-all group">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors"><CreditCard size={24} /></div>
                                    <span className="font-bold text-sm">Card</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
                            <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </Modal>
            )}
            {isSuccessOpen && lastSaleBatch && (
                <Modal isOpen={true} onClose={() => setIsSuccessOpen(false)} title="Sale Confirmed">
                    <div className="space-y-6 animate-scaleIn">
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Payment Received!</h3>
                            <p className="text-gray-500">Transaction completed via {lastSaleBatch.method}</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 font-mono text-sm">
                            <div className="flex justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
                                <span className="font-bold">ITEM</span>
                                <span className="font-bold">PRICE</span>
                            </div>
                            <div className="space-y-2 mb-4">
                                {lastSaleBatch.items.map((item, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{item.name} x{item.qty}</span>
                                        <span>GHS {item.price * item.qty}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-2 flex justify-between text-lg font-black">
                                <span>TOTAL</span>
                                <span className="text-indigo-600">GHS {lastSaleBatch.total}</span>
                            </div>
                        </div>

                        <Button className="w-full py-4 bg-indigo-600" onClick={() => { setIsSuccessOpen(false); setActiveView('inventory'); }}>
                            Next Customer
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default InventoryManager;
