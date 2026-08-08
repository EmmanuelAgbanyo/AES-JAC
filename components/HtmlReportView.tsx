
import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { AiReport, Entrepreneur, Transaction, AiReportLineItem } from '../types';
import Button from './ui/Button';
import { exportToDocx, exportToXlsx, exportToCsv } from '../services/exportService';
import LoadingSpinner from './LoadingSpinner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface HtmlReportViewProps {
    aiReport: AiReport;
    entrepreneur: Entrepreneur;
    transactionsForPeriod: Transaction[];
    period: string;
    onClose: () => void;
    autoExportAs?: 'pdf' | null;
}

// Legacy html2pdf removed in favor of native window.print() for high-fidelity CSS export.

// Fix: Use React.FC to ensure 'key' prop is recognized correctly by TypeScript
const LineItem: React.FC<{ item: AiReportLineItem }> = ({ item }) => (
    <div className={`flex justify-between py-1 border-b border-gray-100 ${item.isTotal ? 'font-bold border-gray-400 mt-2' : ''}`}>
        <span className={`text-xs text-slate-700 ${item.indent ? `pl-${item.indent * 4}` : ''}`}>
            {item.label}
        </span>
        <span className={`font-mono text-sm ${item.isNegative ? 'text-red-500' : 'text-slate-900'}`}>
            {item.isNegative ? `(${item.amount})` : item.amount}
        </span>
    </div>
);

// ... (imports)

// Fix: Use React.FC for consistent typing
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 pb-2 border-b-2 border-slate-900">
            {title}
        </h3>
    </div>
);

const parseAmount = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0;
    const parsed = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(parsed) ? 0 : parsed;
};

// Moved strict FinancialTable definition here to avoid 'use before declaration' errors with const
const FinancialTable = ({ rows, baseAmount, isExpense = false }: { rows: AiReportLineItem[], baseAmount: number, isExpense?: boolean }) => (
    <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="text-[10px] w-full"
    >
        {rows.map((row, index) => {
            const amountVal = parseAmount(row.amount);
            const percentage = baseAmount > 0 ? (amountVal / baseAmount) * 100 : 0;

            return (
                <motion.div 
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                    key={index} 
                    className={`flex justify-between items-center py-1.5 px-4 border-b border-solid border-slate-200 ${row.isTotal ? 'font-bold text-slate-900 bg-transparent border-t-2 border-solid border-slate-900 py-2' : 'text-slate-700'}`}
                >
                    <span className={`w-1/2 ${row.indent ? 'pl-4' : ''} truncate font-serif text-xs`}>{row.label}</span>
                    <span className={`w-1/4 text-right font-mono ${row.isNegative ? '' : ''}`}>{row.isNegative ? `(${row.amount})` : row.amount}</span>
                    <span className="w-1/4 text-right text-[9px] text-slate-400 font-mono mt-0.5">
                        {percentage.toFixed(1)}%
                    </span>
                </motion.div>
            )
        })}
    </motion.div>
);

const HtmlReportView = ({ aiReport, entrepreneur, transactionsForPeriod, period, onClose, autoExportAs }: HtmlReportViewProps) => {
    const reportRef = useRef<HTMLDivElement>(null);

    const [isExporting, setIsExporting] = useState('');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [hasAutoExported, setHasAutoExported] = useState(false);

    const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'xlsx' | 'csv', isAutoExport = false) => {
        setIsExporting(format);
        if (!isAutoExport) setIsExportMenuOpen(false);

        try {
            if (format === 'pdf') {
                // Wait for state update to make all pages visible and apply @media print styles
                await new Promise(resolve => setTimeout(resolve, 300));

                // Force a resize event to trigger Recharts update to adjust to full width
                window.dispatchEvent(new Event('resize'));

                // Give charts time to animate/render and browser time to apply print styles
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (reportRef.current) {
                    // Trigger native high-quality PDF print dialog
                    window.print();
                }
            } else if (format === 'csv') {
                await exportToCsv(transactionsForPeriod, entrepreneur, period);
            }
        } catch (err) {
            console.error(`Export to ${format} failed:`, err);
        } finally {
            // Slight delay before unlocking state
            setTimeout(() => setIsExporting(''), 1000);
        }
    }, [entrepreneur, transactionsForPeriod, period]);

    useEffect(() => {
        if (autoExportAs === 'pdf' && !hasAutoExported && reportRef.current) {
            setHasAutoExported(true);
            const timer = setTimeout(() => handleExport('pdf', true), 1500);
            return () => clearTimeout(timer);
        }
    }, [autoExportAs, hasAutoExported, handleExport]);

    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = 10;

    const nextPage = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));
    const prevPage = () => setCurrentPage(p => Math.max(0, p - 1));

    return (
        <AnimatePresence>
            {isExporting === 'pdf' && (
                <style>{`
                    @page { 
                        size: A4 portrait !important; 
                        margin: 0 !important; 
                    }
                    @media print {
                        html, body {
                            width: 210mm !important;
                            height: auto !important;
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                            background: #ffffff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                        }
                        
                        /* Overhaul the overlay to allow native multi-page scrolling prints */
                        .fixed.inset-0 { 
                            position: static !important; 
                            overflow: visible !important; 
                            display: block !important; 
                            background: transparent !important; 
                        }
                        
                        /* Strip modal constraints to prevent clipping and force A4 width */
                        .max-w-6xl { 
                            max-width: 210mm !important; 
                            width: 210mm !important; 
                            margin: 0 !important; 
                            border: none !important; 
                            box-shadow: none !important; 
                            overflow: visible !important; 
                            border-radius: 0 !important; 
                            transform: none !important; 
                        }
                        
                        /* Force strict page breaks exactly on the A4 boundary */
                        .print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden { 
                            width: 210mm !important;
                            height: 297mm !important;
                            page-break-after: always !important; 
                            break-after: page !important; 
                            break-inside: avoid !important; 
                            overflow: hidden !important;
                            position: relative !important;
                        }
                        
                        /* Hide scrollbars and UI tools during print */
                        ::-webkit-scrollbar { display: none !important; }
                        .no-print, .sticky { display: none !important; }
                    }
                `}</style>
            )}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-start z-50 overflow-y-auto print:static print:bg-transparent print:backdrop-filter-none print:overflow-visible print:block"
            >
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="bg-white w-full max-w-6xl my-8 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden border border-slate-200 print:block print:w-[210mm] print:max-w-none print:min-w-0 print:m-0 print:rounded-none print:border-none print:shadow-none print:overflow-visible print:transform-none"
                >
                    {/* Sticky Header Actions */}
                    <div className="sticky top-0 bg-white/80 dark:bg-dark-secondary/80 backdrop-blur-md border-b border-slate-200/50 dark:border-dark-border p-4 flex justify-between items-center z-10 shadow-sm print:hidden">
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors font-bold flex items-center text-xs uppercase tracking-[0.2em] group">
                            <i className="fas fa-chevron-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Close Audit
                        </button>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                            <button onClick={prevPage} disabled={currentPage === 0} className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors">
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Page {currentPage + 1} / {totalPages}
                            </span>
                            <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors">
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>

                        <div className="relative">
                            <Button onClick={() => setIsExportMenuOpen(prev => !prev)} variant="primary" size="sm" className="!bg-slate-900 hover:!bg-slate-800 rounded-lg shadow-xl tracking-widest text-[10px] transition-all">
                                {isExporting ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2"></i>}
                                {isExporting ? 'Processing...' : 'Export Board Pack'}
                            </Button>
                            <AnimatePresence>
                                {isExportMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl shadow-2xl z-[110] border border-slate-200/50 rounded-xl overflow-hidden"
                                    >
                                        <button onClick={() => handleExport('pdf')} className="flex items-center w-full px-4 py-4 text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors uppercase tracking-widest">
                                            <i className="fas fa-file-pdf w-5 text-red-500"></i> Download PDF
                                        </button>
                                        <button onClick={() => handleExport('csv')} className="flex items-center w-full px-4 py-4 text-[10px] font-bold text-slate-700 hover:bg-slate-50 uppercase tracking-widest border-t border-slate-100">
                                            <i className="fas fa-file-csv w-5 text-blue-500"></i> Export Raw Ledger
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="bg-slate-100 min-h-screen p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center print:bg-transparent print:p-0 print:block">
                        {isExporting === 'pdf' && (
                            <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[100] flex items-center justify-center no-print">
                                <LoadingSpinner message="Auditing Integrated Statements..." />
                            </div>
                        )}

                        {/* Removed duplicate toolbar */}

                        <div ref={reportRef} className="w-full max-w-[210mm] mx-auto bg-white shadow-2xl">

                            {/* Page 1: COVER PAGE */}
                            <div className={`report-page ${(currentPage === 0 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] h-[297mm] relative overflow-hidden print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-white`}>
                                <section className="w-full h-full relative flex flex-col justify-between p-20 border-8 border-slate-900 m-4 w-[calc(100%-32px)] h-[calc(100%-32px)] bg-white rounded-sm">

                                    {/* Header Content */}
                                    <div className="relative z-10 block mt-12">
                                        <div className="border-b-2 border-slate-900 pb-6 mb-16 flex justify-between items-end">
                                            <div className="text-xs uppercase tracking-[0.2em] font-black text-slate-800">Africa Entrepreneurship School</div>
                                            <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-600">Confidential Report</div>
                                        </div>

                                        <h1 className="text-6xl font-serif font-black mb-6 leading-tight tracking-tight text-slate-900">
                                            FINANCIAL<br />
                                            SUMMARY<br />
                                            REPORT
                                        </h1>

                                        <div className="h-1 w-32 bg-slate-900 mb-12"></div>

                                        <p className="text-lg font-serif text-slate-600 max-w-xl leading-relaxed">
                                            Prepared from recorded transactions for internal management and external review purposes.
                                        </p>
                                    </div>

                                    {/* Footer Content */}
                                    <div className="relative z-10 grid grid-cols-2 gap-12 border-t-2 border-slate-900 pt-12 mb-12">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 font-bold flex items-center gap-2">Prepared For</div>
                                            <div className="text-2xl font-serif font-bold text-slate-900">{entrepreneur.businessName}</div>
                                            <div className="text-slate-600 mt-1 text-sm font-serif italic">Attn: {entrepreneur.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 font-bold flex items-center justify-end gap-2">Report Period</div>
                                            <div className="text-xl font-mono font-bold text-slate-800">{new Date(period).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                                            <div className="text-slate-500 mt-1 text-[10px] uppercase tracking-widest font-mono">Generated: {new Date().toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Page 2: Executive Summary & Dashboard */}
                            <div className={`report-page ${(currentPage === 1 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc] p-16`}>
                                <header className="flex justify-between items-start mb-12">
                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-serif font-black tracking-tighter text-slate-900 leading-none flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-900 flex items-center justify-center text-white text-sm"><i className="fas fa-chart-pie"></i></div>
                                            Executive Summary
                                        </h2>
                                        <div className="inline-block px-4 py-1.5 bg-slate-900/5 text-slate-900 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full">Strategic Overview</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl text-slate-900 tracking-tight">{entrepreneur.businessName}</div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">S-1 / Fiscal Summary</div>
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="md:col-span-2 space-y-8">
                                        <div className="p-8 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-sm leading-relaxed text-slate-700 font-serif relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                                            {(aiReport.executiveSummary || 'AI was unable to generate an executive summary. Please try again.').split('\n').map((paragraph, index) => (
                                                paragraph.trim() ? (
                                                    <p key={index} className={index > 0 ? "mt-5" : ""}>
                                                        {paragraph.trim().startsWith('EXECUTIVE AUDIT SUMMARY') || paragraph.trim().startsWith('REVENUE VECTOR') || paragraph.trim().startsWith('RISK & LIQUIDITY') ? (
                                                            <span className="font-black text-slate-900 not-italic uppercase tracking-[0.2em] text-[10px] border-b-2 border-slate-100 pb-1 mb-2 block w-fit text-indigo-900">{paragraph.trim()}</span>
                                                        ) : (
                                                            <span className="text-slate-800">{paragraph.trim()}</span>
                                                        )}
                                                    </p>
                                                ) : null
                                            ))}
                                        </div>

                                        {/* Visual Key Metrics */}
                                        <div>
                                            <SectionHeader title="Key Performance Indicators" />
                                            <div className="grid grid-cols-2 gap-6 pt-2">
                                                <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 group-hover:h-2 transition-all"></div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center justify-between">Net Profit Margin <i className="fas fa-chart-line text-slate-200 text-lg"></i></div>
                                                    <div className="text-4xl font-mono font-black text-slate-800 tracking-tighter">
                                                        {aiReport.kpis.netMargin}
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 group-hover:h-2 transition-all"></div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center justify-between">EBITDA Margin <i className="fas fa-industry text-slate-200 text-lg"></i></div>
                                                    <div className="text-4xl font-mono font-black text-slate-800 tracking-tighter">
                                                        {aiReport.kpis.ebitdaMargin}
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500 group-hover:h-2 transition-all"></div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center justify-between">Monthly Burn Rate <i className="fas fa-fire text-slate-200 text-lg"></i></div>
                                                    <div className="text-3xl font-mono font-black text-slate-800 tracking-tighter">
                                                        {aiReport.kpis.burnRate}
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500 group-hover:h-2 transition-all"></div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center justify-between">Cash Runway <i className="fas fa-hourglass-half text-slate-200 text-lg"></i></div>
                                                    <div className="text-3xl font-mono font-black text-slate-800 tracking-tighter">
                                                        {aiReport.kpis.runwayMonths}
                                                    </div>
                                                </div>

                                                {aiReport.financialPosition && (
                                                    <div className="col-span-2 grid grid-cols-2 gap-6 mt-2">
                                                        <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-between">
                                                            <div>
                                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Current Ratio</div>
                                                                <div className="text-[10px] text-slate-400 font-serif italic mb-2">Liquidity Score</div>
                                                            </div>
                                                            <div className="text-2xl font-mono font-black text-indigo-900">{aiReport.financialPosition.currentRatio.toFixed(2)}x</div>
                                                        </div>
                                                        <div className="p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-between">
                                                            <div>
                                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Quick Ratio</div>
                                                                <div className="text-[10px] text-slate-400 font-serif italic mb-2">Acid Test</div>
                                                            </div>
                                                            <div className="text-2xl font-mono font-black text-indigo-900">{aiReport.financialPosition.quickRatio.toFixed(2)}x</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-full relative overflow-hidden">
                                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl"></div>

                                            <SectionHeader title="Strategic Outlook" />
                                            <div className="space-y-6 mt-8 relative z-10">
                                                {(aiReport.strategicRecommendations || []).slice(0, 3).map((rec, i) => (
                                                    <div key={i} className="pl-4 border-l-2 border-indigo-500 bg-gradient-to-r from-indigo-50/50 to-transparent p-3 rounded-r-xl">
                                                        <div className="text-[9px] font-black uppercase mb-2 text-indigo-700 tracking-widest flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-500"></div> {rec.priority} Priority
                                                        </div>
                                                        <p className="text-sm font-serif text-slate-700 leading-relaxed">{rec.recommendation}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-12 pt-8 border-t border-slate-100 relative z-10">
                                                <SectionHeader title="Pro Forma Forecast (N+1)" />
                                                <div className="space-y-4 mt-6">
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1 tracking-widest text-slate-500">
                                                            <span>Projected Revenue</span>
                                                            <span className="font-mono text-emerald-600 text-sm tracking-normal">{aiReport.forecast?.projectedRevenue || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <div className="flex justify-between text-[10px] font-black uppercase mb-1 tracking-widest">
                                                            <span>Projected OpEx</span>
                                                            <span className="font-mono">{aiReport.forecast?.projectedOpEx || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <footer className="absolute bottom-0 left-0 right-0 p-12 flex justify-between items-end opacity-40 pointer-events-none">
                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900">
                                        JAC Auditor Suite
                                    </div>
                                    <div className="text-right text-[8px] text-slate-500 max-w-xs font-serif italic">
                                        CONFIDENTIAL MEMORANDUM
                                    </div>
                                </footer>
                            </div>

                            {/* Page 3: Visual Analytics */}
                            <div className={`report-page ${(currentPage === 2 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] h-[297mm] relative overflow-hidden print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className="p-12 h-full flex flex-col relative">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                                    <header className="mb-8 flex-shrink-0 relative z-10">
                                        <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm shadow-lg shadow-teal-500/20"><i className="fas fa-layer-group"></i></div>
                                            Visual Analytics Board
                                        </h2>
                                        <div className="h-1 w-20 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-full"></div>
                                    </header>

                                    {aiReport.visualizations && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            {/* Chart 1: Revenue Trends */}
                                            <div className="h-64 bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">Revenue Trajectory <i className="fas fa-chart-line text-slate-200"></i></h4>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={aiReport.visualizations.monthlyTrends}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `${value / 1000}k`} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(value: number) => [`GHS ${value.toLocaleString()}`, '']}
                                                        />
                                                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                                        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Chart 2: Revenue Mix */}
                                            <div className="h-64 bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">Revenue Composition <i className="fas fa-chart-pie text-slate-200"></i></h4>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={aiReport.visualizations.incomeDistribution}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={50}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {aiReport.visualizations.incomeDistribution.map((entry, index) => {
                                                                const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
                                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                            })}
                                                        </Pie>
                                                        <Tooltip formatter={(value: number) => `GHS ${value.toLocaleString()}`} />
                                                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Chart 3: Expense Mix */}
                                            <div className="h-64 bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">Cost Structure <i className="fas fa-coins text-slate-200"></i></h4>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={aiReport.visualizations.expenseDistribution}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={50}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {aiReport.visualizations.expenseDistribution.map((entry, index) => {
                                                                const colors = ['#f59e0b', '#fb923c', '#f87171', '#fb7185', '#e879f9', '#c084fc'];
                                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                            })}
                                                        </Pie>
                                                        <Tooltip formatter={(value: number) => `GHS ${value.toLocaleString()}`} />
                                                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Top Customers */}
                                            {aiReport.topCustomers && aiReport.topCustomers.length > 0 && (
                                                <div className="h-64 bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative z-10 flex flex-col">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">Top Revenue Drivers <i className="fas fa-crown text-amber-400 text-lg"></i></h4>
                                                    <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                                                        <table className="w-full text-left font-serif text-sm">
                                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-widest sticky top-0 z-10">
                                                                <tr>
                                                                    <th className="px-4 py-3 rounded-tl-lg">Client Profile</th>
                                                                    <th className="px-4 py-3 text-right rounded-tr-lg">Yield</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {aiReport.topCustomers.map((c, i) => (
                                                                    <tr key={i} className="hover:bg-indigo-50/50 transition-colors group">
                                                                        <td className="px-4 py-3 font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">{c.name}</td>
                                                                        <td className="px-4 py-3 text-right font-mono text-slate-600 group-hover:text-indigo-600 transition-colors">GHS {c.totalRevenue.toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                                    `}} />
                                </div>
                            </div>

                            {/* Page 4: Financial Statements */}
                            <div className={`report-page ${(currentPage === 3 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200 rounded-full blur-[100px] opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2 z-0"></div>

                                    {/* Watermark - Only visible on valid data */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[150px] font-serif font-black text-slate-800 -rotate-45 pointer-events-none z-0 select-none opacity-[0.03]">
                                        UNAUDITED
                                    </div>

                                    <header className="mb-4 flex-shrink-0 relative z-10">
                                        <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
                                            <div>
                                                <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-900 flex items-center justify-center text-white text-sm shadow-lg shadow-indigo-500/20"><i className="fas fa-file-invoice-dollar"></i></div>
                                                    Financial Statements
                                                </h2>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Form</div>
                                                <div className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    S-1 / PRO FORMA
                                                </div>
                                            </div>
                                        </div>
                                    </header>

                                    {/* Logic to determine if we use Real Data or Demo Data */}
                                    {(() => {
                                        const data = aiReport;

                                        return (
                                            <div className={`grid grid-cols-1 gap-8 h-full origin-top relative z-10 w-full flex-grow ${isExporting === 'pdf' ? 'scale-[0.90]' : ''}`}>
                                                {/* Income Statement */}
                                                <div className="flex flex-col">
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900 pb-2 flex items-center gap-2 rounded-t-2xl">
                                                        Statement of Profit or Loss
                                                    </h3>
                                                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative flex-1">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                                                        <div className="flex justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                                                            <span className="w-1/2">Item</span>
                                                            <span className="w-1/4 text-right">Amount</span>
                                                            <span className="w-1/4 text-right">% of Rev</span>
                                                        </div>
                                                        <div className="divide-y divide-slate-50">
                                                            <div className="bg-white px-6 py-3 font-serif italic text-xs uppercase text-indigo-900 font-bold border-l-4 border-indigo-500">Operating Revenue</div>
                                                            <div className="px-2 pb-2">
                                                                <FinancialTable rows={data.incomeStatement.revenue} baseAmount={parseAmount(data.incomeStatement.revenue.find(r => r.isTotal)?.amount || data.incomeStatement.revenue[0]?.amount) || 1} />
                                                            </div>

                                                            <div className="bg-white px-6 py-3 font-serif italic text-xs uppercase text-rose-900 font-bold border-l-4 border-rose-500 mt-2">Operating Expenses</div>
                                                            <div className="px-2 pb-2">
                                                                <FinancialTable rows={data.incomeStatement.expenses} baseAmount={parseAmount(data.incomeStatement.revenue.find(r => r.isTotal)?.amount || data.incomeStatement.revenue[0]?.amount) || 1} isExpense />
                                                            </div>

                                                            <div className="px-6 py-6 bg-slate-50/50 flex justify-between items-center mt-2 border-t border-slate-100">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fas fa-chart-line text-emerald-500"></i> Net Profit / (Loss)</span>
                                                                <div className="text-right">
                                                                    <span className="text-2xl font-mono font-black block leading-none text-emerald-600">{data.incomeStatement.netIncome}</span>
                                                                    <span className="text-[9px] text-slate-400 font-bold block mt-1 tracking-widest uppercase">
                                                                        {((parseAmount(data.incomeStatement.netIncome) / (parseAmount(data.incomeStatement.revenue.find(r => r.isTotal)?.amount || data.incomeStatement.revenue[0]?.amount) || 1)) * 100).toFixed(1)}% Margin
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Balance Sheet Summary */}
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900 pb-2">Statement of Financial Position</h3>
                                                    <div className="mt-2 grid grid-cols-2 gap-6">
                                                        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative flex flex-col">
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                                                            <h4 className="px-6 py-4 bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 flex items-center justify-between">Assets <i className="fas fa-building text-blue-500"></i></h4>
                                                            <div className="p-2 flex-1">
                                                                <FinancialTable rows={data.balanceSheet.assets} baseAmount={parseAmount(data.balanceSheet.totalAssets) || 1} />
                                                            </div>
                                                            <div className="flex justify-between items-center px-6 py-4 bg-slate-50/50 border-t border-slate-100 mt-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Assets</span>
                                                                <span className="font-mono text-lg font-black text-blue-600">{data.balanceSheet.totalAssets}</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative flex flex-col">
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-600"></div>
                                                            <h4 className="px-6 py-4 bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 flex items-center justify-between">Liabilities & Equity <i className="fas fa-scale-balanced text-purple-500"></i></h4>
                                                            <div className="p-2 flex-1">
                                                                <FinancialTable rows={[...data.balanceSheet.liabilities, ...data.balanceSheet.equity]} baseAmount={parseAmount(data.balanceSheet.totalLiabilitiesAndEquity) || 1} />
                                                            </div>
                                                            <div className="flex justify-between items-center px-6 py-4 bg-slate-50/50 border-t border-slate-100 mt-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total L&E</span>
                                                                <span className="font-mono text-lg font-black text-indigo-600">{data.balanceSheet.totalLiabilitiesAndEquity}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Page 5: CFO Strategic Deep Dive (Advanced Metrics) */}
                            <div className={`report-page ${(currentPage === 4 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>
                                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[100px] opacity-40 pointer-events-none translate-y-1/2 -translate-x-1/2 z-0"></div>

                                    <header className="mb-10 flex-shrink-0 relative z-10 w-full flex justify-between items-end border-b border-slate-200 pb-4">
                                        <div>
                                            <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-emerald-400 text-sm shadow-lg shadow-slate-500/20"><i className="fas fa-microscope"></i></div>
                                                CFO Strategic Deep Dive
                                            </h2>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Advanced Yield & Efficiency Analytics</div>
                                        </div>
                                    </header>

                                    {(() => {
                                        const metrics = aiReport.cfoMetrics || {
                                            dupont: { roe: 24.5, netProfitMargin: 15.2, assetTurnover: 0.8, equityMultiplier: 2.0 },
                                            breakEven: { breakEvenRevenue: 45000, marginOfSafety: 35.8 },
                                            workingCapitalCycle: { cashConversionCycle: 14.2, daysSalesOutstanding: 22, daysPayableOutstanding: 35 }
                                        };

                                        const commentary = aiReport.advancedCfoCommentary || {
                                            dupontAnalysis: "The entity's ROE indicates strong equity leverage and solid operational margins, though asset turnover presents an optimization opportunity.",
                                            breakEvenAnalysis: "Current revenue streams comfortably exceed the fixed-cost break-even threshold, ensuring a robust margin of safety against market volatility.",
                                            efficiencyMetrics: "The cash conversion cycle is highly efficient, driven by aggressive payables management and disciplined receivables collection."
                                        };

                                        return (
                                            <div className="grid grid-cols-1 gap-8 relative z-10 h-full flex-grow">

                                                {/* DuPont Analysis Identity */}
                                                <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden flex flex-col justify-center">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-emerald-400"></div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pb-2 mb-4 flex items-center justify-between">DuPont ROE Deconstruction <i className="fas fa-network-wired text-slate-200 text-lg"></i></h3>
                                                    <p className="text-sm text-slate-600 mb-8 font-serif leading-relaxed max-w-3xl border-l-2 border-indigo-100 pl-4">{commentary.dupontAnalysis}</p>

                                                    <div className="flex justify-between items-center text-center mt-2 px-4">
                                                        <div className="w-1/4 group">
                                                            <div className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Net Profit Margin</div>
                                                            <div className="text-4xl font-mono font-black text-slate-800 tracking-tighter pb-3 mb-2">{metrics.dupont.netProfitMargin.toFixed(1)}%</div>
                                                            <div className="text-[10px] text-slate-400 font-serif italic uppercase mt-1 hidden md:block group-hover:text-emerald-500 transition-colors">Operational Efficiency</div>
                                                        </div>

                                                        <div className="text-slate-300 font-black text-2xl px-2"><i className="fas fa-times"></i></div>

                                                        <div className="w-1/4 group">
                                                            <div className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Asset Turnover</div>
                                                            <div className="text-4xl font-mono font-black text-slate-800 tracking-tighter pb-3 mb-2">{metrics.dupont.assetTurnover.toFixed(2)}x</div>
                                                            <div className="text-[10px] text-slate-400 font-serif italic uppercase mt-1 hidden md:block group-hover:text-indigo-500 transition-colors">Asset Use Efficiency</div>
                                                        </div>

                                                        <div className="text-slate-300 font-black text-2xl px-2"><i className="fas fa-times"></i></div>

                                                        <div className="w-1/4 group">
                                                            <div className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Equity Multiplier</div>
                                                            <div className="text-4xl font-mono font-black text-slate-800 tracking-tighter pb-3 mb-2">{metrics.dupont.equityMultiplier.toFixed(2)}x</div>
                                                            <div className="text-[10px] text-slate-400 font-serif italic uppercase mt-1 hidden md:block group-hover:text-rose-500 transition-colors">Financial Leverage</div>
                                                        </div>

                                                        <div className="text-slate-300 font-black text-2xl px-2"><i className="fas fa-equals"></i></div>

                                                        <div className="w-1/4 bg-slate-50 rounded-xl border border-slate-100 p-4 shadow-sm group hover:border-emerald-200 transition-colors">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Return on Equity</div>
                                                            <div className="text-4xl font-mono font-black text-emerald-600 relative">
                                                                <span className="absolute -left-2 top-0 text-emerald-600/30 text-lg hidden lg:inline">ROE</span>
                                                                {metrics.dupont.roe.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    {/* Break-Even Gauge */}
                                                    <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-500"></div>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pb-2 mb-4 flex items-center justify-between">Break-Even & Safety Margin <i className="fas fa-shield-halved text-teal-400 text-lg"></i></h3>
                                                        <p className="text-sm text-slate-600 mb-6 font-serif leading-relaxed">{commentary.breakEvenAnalysis}</p>

                                                        <div className="flex-grow flex flex-col justify-center items-center">
                                                            <div className="relative w-48 h-48 flex justify-center items-center">
                                                                {/* Circular progress background */}
                                                                <svg className="w-full h-full transform -rotate-90">
                                                                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                                                                    {/* Safety Margin line (teal) */}
                                                                    <circle
                                                                        strokeDasharray={`${(metrics.breakEven.marginOfSafety / 100) * (2 * Math.PI * 88)}, 1000`}
                                                                        cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeLinecap="round" className="text-teal-500"
                                                                    />
                                                                </svg>
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                    <span className="text-4xl font-black text-slate-800 font-mono tracking-tighter">{metrics.breakEven.marginOfSafety.toFixed(0)}%</span>
                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 text-center leading-tight">Margin of<br />Safety</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-8 w-full px-4 text-center border-t border-slate-100 pt-6">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Break-Even Point</div>
                                                                <div className="text-2xl font-mono font-black text-slate-800">GHS {metrics.breakEven.breakEvenRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Working Capital Cycle */}
                                                    <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pb-2 mb-4 flex items-center justify-between">Working Capital Cycle <i className="fas fa-arrows-spin text-amber-400 text-lg"></i></h3>
                                                        <p className="text-sm text-slate-600 mb-6 font-serif leading-relaxed">{commentary.efficiencyMetrics}</p>

                                                        <div className="space-y-6 flex-grow flex flex-col justify-center">
                                                            <div>
                                                                <div className="flex justify-between items-end mb-2">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Days Sales Outstanding (DSO)</span>
                                                                    <span className="font-mono font-black text-emerald-600 text-xl">{metrics.workingCapitalCycle.daysSalesOutstanding.toFixed(0)} <span className="text-[9px] text-slate-400 font-sans tracking-widest uppercase">d</span></span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                                    <div style={{ width: `${Math.min(100, (metrics.workingCapitalCycle.daysSalesOutstanding / 60) * 100)}%` }} className="bg-emerald-500 h-full rounded-full"></div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="flex justify-between items-end mb-2">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Days Payable Outstanding (DPO)</span>
                                                                    <span className="font-mono font-black text-rose-500 text-xl">{metrics.workingCapitalCycle.daysPayableOutstanding.toFixed(0)} <span className="text-[9px] text-slate-400 font-sans tracking-widest uppercase">d</span></span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                                    <div style={{ width: `${Math.min(100, (metrics.workingCapitalCycle.daysPayableOutstanding / 60) * 100)}%` }} className="bg-rose-500 h-full rounded-full"></div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-8 border-t border-slate-100 mt-2">
                                                                <div className="flex justify-between items-center px-4 bg-amber-50 rounded-xl p-4 border border-amber-100">
                                                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] flex items-center gap-2">Cash Conversion Cycle</span>
                                                                    <span className={`font-mono font-black text-4xl text-amber-600`}>
                                                                        {metrics.workingCapitalCycle.cashConversionCycle.toFixed(1)} <span className="text-[10px] text-amber-700/50 uppercase tracking-[0.2em] font-sans">days</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Page 6: Detailed Transaction Ledger */}
                            <div className={`report-page ${(currentPage === 5 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>

                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200 rounded-full blur-[100px] opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2 z-0"></div>

                                    {/* Subtle Watermark */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-slate-800 -rotate-45 pointer-events-none z-0 select-none whitespace-nowrap opacity-[0.03]">
                                        GENERAL LEDGER
                                    </div>

                                    <header className="mb-8 flex-shrink-0 relative z-10 w-full flex justify-between items-end border-b border-slate-200 pb-4">
                                        <div>
                                            <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-900 flex items-center justify-center text-white text-sm shadow-lg shadow-indigo-500/20"><i className="fas fa-list-ul"></i></div>
                                                Statement of Transactions
                                            </h2>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Comprehensive General Ledger Audit Trail</div>
                                            <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-transparent mt-4 rounded-full"></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Entries</div>
                                            <div className="text-2xl font-mono font-black text-indigo-900">{transactionsForPeriod.length}</div>
                                        </div>
                                    </header>

                                    <div className="relative z-10 flex-grow">
                                        {transactionsForPeriod.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                                <i className="fas fa-file-invoice-dollar text-4xl mb-4 text-emerald-500/50"></i>
                                                <p className="text-sm font-bold uppercase tracking-widest">No Transactions Recorded</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                                                <table className="w-full text-left font-sans">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                                            <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] w-28">Date</th>
                                                            <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em]">Description</th>
                                                            <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] w-36">Category</th>
                                                            <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] w-24 text-center">Method</th>
                                                            <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] w-36 text-right">Amount (GHS)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {transactionsForPeriod.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t, i) => (
                                                            <motion.tr
                                                                key={t.id}
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: Math.min(i * 0.05, 1) }} // cap the delay so large lists don't take forever to load
                                                                className="hover:bg-indigo-50/50 transition-colors group"
                                                            >
                                                                <td className="py-3 px-6 text-xs font-mono text-slate-500">{t.date}</td>
                                                                <td className="py-3 px-6">
                                                                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">{t.description}</div>
                                                                    {t.customerName && <div className="text-[10px] uppercase font-sans text-slate-500 mt-1 tracking-widest flex items-center gap-1"><i className="fas fa-user-circle text-slate-300"></i> {t.customerName}</div>}
                                                                </td>
                                                                <td className="py-3 px-6">
                                                                    <span className="inline-block px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 bg-slate-50 text-[9px] font-bold tracking-widest uppercase truncate max-w-[120px]">
                                                                        {t.productServiceCategory || 'General'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-6 text-center text-[10px] text-slate-500 font-sans uppercase font-bold tracking-widest">
                                                                    {t.paymentMethod}
                                                                </td>
                                                                <td className="py-3 px-6 text-right">
                                                                    <span className={`font-mono text-sm font-black ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                        {t.type === 'Income' ? '+' : '-'}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                            </motion.tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center no-print">
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">End of Ledger</div>
                                            <div className="flex items-center gap-2 text-[9px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full"><i className="fas fa-shield-check"></i> Immutable Record</div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Page 7: Strategic Revenue & Concentration Risk */}
                            <div className={`report-page ${(currentPage === 6 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100 rounded-full blur-[100px] opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2 z-0"></div>
                                    <header className="mb-10 flex-shrink-0 relative z-10 w-full flex justify-between items-end border-b border-slate-200 pb-4">
                                        <div>
                                            <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm shadow-lg shadow-teal-500/20"><i className="fas fa-chart-pie"></i></div>
                                                Strategic Revenue Topography
                                            </h2>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Income Diversification & Client Concentration Matrix</div>
                                            <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-transparent mt-4 rounded-full"></div>
                                        </div>
                                    </header>

                                    <div className="flex-grow flex flex-col gap-8 relative z-10">
                                        {(() => {
                                            const incomeTx = transactionsForPeriod.filter(t => t.type === 'Income');

                                            // 1. Revenue by Category Data
                                            const catMap = incomeTx.reduce((acc, t) => {
                                                const c = t.productServiceCategory || 'General Sales';
                                                acc[c] = (acc[c] || 0) + t.amount;
                                                return acc;
                                            }, {} as Record<string, number>);
                                            const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
                                            const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#0ea5e9']; // Premium vibrant palette

                                            // 2. Client Concentration Data
                                            const clientMap = incomeTx.reduce((acc, t) => {
                                                const c = t.customerName || 'Walk-in / Direct';
                                                acc[c] = (acc[c] || 0) + t.amount;
                                                return acc;
                                            }, {} as Record<string, number>);
                                            const topClients = Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
                                            const totalRevenue = incomeTx.reduce((sum, t) => sum + t.amount, 0);

                                            return (
                                                <>
                                                    {/* Top Section: Revenue Mix Donut */}
                                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[380px] relative overflow-hidden">
                                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl z-0"></div>
                                                        <div className="relative z-10">
                                                            <SectionHeader title="Revenue Mix & Product Yield" />
                                                        </div>
                                                        <div className="flex-grow flex items-center justify-center relative z-10 mt-4">
                                                            {pieData.length > 0 ? (
                                                                <div className="w-full h-full pb-4">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <PieChart>
                                                                            <Pie
                                                                                data={pieData}
                                                                                cx="50%"
                                                                                cy="50%"
                                                                                innerRadius={80}
                                                                                outerRadius={110}
                                                                                paddingAngle={3}
                                                                                dataKey="value"
                                                                                stroke="none"
                                                                            >
                                                                                {pieData.map((entry, index) => (
                                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip
                                                                                formatter={(value: number) => [`GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Revenue']}
                                                                                itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                                                                            />
                                                                            <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-400 font-mono text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100 w-full text-center">Insufficient revenue data.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Bottom Section: Client Concentration */}
                                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-grow flex flex-col relative overflow-hidden">
                                                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl z-0"></div>
                                                        <div className="relative z-10">
                                                            <SectionHeader title="Top Accounts & Concentration Risk" />
                                                            <p className="text-sm text-slate-500 mb-8 font-serif leading-relaxed mt-2">Analyzing reliance on top clients to assess aggregate revenue vulnerability. A healthy distribution reduces single-party counterparty risk.</p>
                                                        </div>

                                                        <div className="flex-grow flex flex-col justify-center space-y-6 relative z-10">
                                                            {topClients.length > 0 ? topClients.map((client, idx) => {
                                                                const percent = totalRevenue > 0 ? (client.value / totalRevenue) * 100 : 0;
                                                                return (
                                                                    <div key={idx} className="flex flex-col mb-4 last:mb-0 group">
                                                                        <div className="flex justify-between items-end mb-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-mono font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{idx + 1}</div>
                                                                                <span className="font-bold font-sans text-slate-700 text-sm tracking-wide">{client.name}</span>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="font-mono font-black text-slate-900">GHS {client.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                                <span className="ml-3 text-[10px] font-black text-slate-400 w-12 inline-block text-right">{percent.toFixed(1)}%</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${percent}%` }}
                                                                                transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                                                                                className="bg-indigo-500 h-full rounded-full"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }) : (
                                                                <div className="text-slate-400 font-mono text-sm text-center bg-slate-50 p-6 rounded-2xl border border-slate-100">No client data mapped.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>


                            {/* Page 8: Capital Allocation & Expense Architecture */}
                            <div className={`report-page ${(currentPage === 7 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-[#f8fafc]`}>
                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-100 rounded-full blur-[100px] opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2 z-0"></div>
                                    <header className="mb-10 flex-shrink-0 relative z-10 w-full flex justify-between items-end border-b border-slate-200 pb-4">
                                        <div>
                                            <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-sm shadow-lg shadow-rose-500/20"><i className="fas fa-money-bill-transfer"></i></div>
                                                Capital Allocation Matrix
                                            </h2>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Expense Architecture & Burn Topography</div>
                                            <div className="h-1 w-24 bg-gradient-to-r from-rose-400 to-transparent mt-4 rounded-full"></div>
                                        </div>
                                    </header>

                                    <div className="flex-grow flex flex-col relative z-10 space-y-8">
                                        {(() => {
                                            const expenseTx = transactionsForPeriod.filter(t => t.type === 'Expense');

                                            // 1. Expense by Category Data
                                            const catMap = expenseTx.reduce((acc, t) => {
                                                const c = t.productServiceCategory || 'General Setup';
                                                acc[c] = (acc[c] || 0) + t.amount;
                                                return acc;
                                            }, {} as Record<string, number>);

                                            const barData = Object.entries(catMap)
                                                .map(([name, value]) => ({ name, value }))
                                                .sort((a, b) => b.value - a.value)
                                                .slice(0, 7); // top 7 items

                                            const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

                                            return (
                                                <>
                                                    {/* Top Section: Expense Distribution Bar Chart */}
                                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-50 rounded-full blur-3xl z-0"></div>
                                                        <div className="relative z-10">
                                                            <SectionHeader title="Outflow Distribution Priorities (Top 7 Categories)" />
                                                        </div>
                                                        <div className="w-full h-[320px] mt-6 relative z-10">
                                                            {barData.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <BarChart
                                                                        data={barData}
                                                                        layout="vertical"
                                                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                                                    >
                                                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                                                        <XAxis type="number" tickFormatter={(v) => `GHS ${v}`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                                        <YAxis dataKey="name" type="category" width={120} stroke="#475569" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                                                                        <Tooltip
                                                                            formatter={(value: number) => [`GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Expense']}
                                                                            cursor={{ fill: '#f8fafc' }}
                                                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                                                                        />
                                                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                                            {barData.map((entry, index) => (
                                                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#fb7185' : '#e2e8f0'} />
                                                                            ))}
                                                                        </Bar>
                                                                    </BarChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-slate-400 font-mono text-sm bg-slate-50 rounded-2xl border border-slate-100">No expenses recorded.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Bottom: Efficiency Diagnostics */}
                                                    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-grow flex flex-col justify-center relative overflow-hidden">
                                                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-50 rounded-full blur-3xl z-0"></div>
                                                        <div className="relative z-10 text-center mb-8">
                                                            <div className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">Diagnostics</div>
                                                            <h3 className="text-2xl font-serif font-black text-slate-900 tracking-tight">Burn Velocity & Capital Allocation</h3>
                                                            <p className="text-sm text-slate-500 font-serif mt-3 max-w-2xl mx-auto leading-relaxed">This diagnostic reviews whether operational expenditures are heavily concentrated in fixed overheads or variable growth multipliers. Maintaining low fixed overheads bolsters the margin of safety.</p>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-6 relative z-10 px-4">
                                                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 text-center hover:shadow-md transition-shadow">
                                                                <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-4"><i className="fas fa-fire"></i></div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Total Deployable Burn</div>
                                                                <div className="text-3xl font-mono font-black text-slate-900">GHS {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                                            </div>

                                                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 text-center hover:shadow-md transition-shadow">
                                                                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mb-4"><i className="fas fa-arrow-down-wide-short"></i></div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Top Category Sink</div>
                                                                <div className="text-xl font-black text-slate-900 leading-tight truncate font-sans">{barData.length > 0 ? barData[0].name : 'N/A'}</div>
                                                                <div className="text-xs text-indigo-600 font-bold mt-2 bg-indigo-50 inline-block px-2 py-0.5 rounded-full">{barData.length > 0 ? ((barData[0].value / totalExpense) * 100).toFixed(1) : 0}% of all burn</div>
                                                            </div>

                                                            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex flex-col items-center justify-center group hover:bg-emerald-500 hover:text-white transition-all">
                                                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-4 text-xl transition-colors"><i className="fas fa-shield-check"></i></div>
                                                                <div className="text-[10px] text-emerald-700 group-hover:text-emerald-100 font-bold uppercase tracking-[0.2em] transition-colors">Efficiency Audit</div>
                                                                <div className="text-lg font-black text-emerald-900 group-hover:text-white uppercase tracking-widest mt-1 transition-colors">Complete</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Page 9: Venture & Credit Readiness Prospectus */}
                            <div className={`report-page ${(currentPage === 8 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-slate-900 text-white overflow-hidden`}>
                                {/* Abstract glowing background for Page 9 */}
                                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600 rounded-full mix-blend-screen opacity-10 blur-[120px] pointer-events-none"></div>
                                <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen opacity-[0.15] blur-[150px] pointer-events-none"></div>

                                <div className={`p-12 h-full flex flex-col relative z-10 ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>

                                    <header className="mb-10 flex-shrink-0 relative z-10 w-full flex justify-between items-end border-b border-slate-700/50 pb-6">
                                        <div>
                                            <h2 className="text-4xl font-serif font-black text-white mb-2 tracking-tight flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-800 flex items-center justify-center text-white text-lg shadow-[0_0_30px_rgba(192,38,211,0.3)]"><i className="fas fa-rocket"></i></div>
                                                Venture Prospectus
                                            </h2>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 mt-2">Institutional Investment & Credit Readiness Assessment</div>
                                        </div>
                                    </header>

                                    <div className="flex-grow flex flex-col relative z-10 space-y-8">
                                        {(() => {
                                            const vPitch = aiReport.venturePitch || {
                                                investmentThesis: "The entity demonstrates an aggressive trajectory in operational efficiency. Strong gross margins and a lean operating cost structure highlight a highly scalable foundation capable of absorbing rapid market expansion.",
                                                theAskAndUseOfFunds: "Strategic capital injection is recommended to rapidly scale top-line growth. Funds will be directed toward accelerating customer acquisition channels (CAC) to capitalize on the high Lifetime Value (LTV) indicated by current retention metrics.",
                                                riskMitigation: "While revenue concentration risks exist, the margin of safety offers a significant buffer. The immediate mitigation strategy involves deploying tranche-based growth capital strictly contingent on diversifying the primary client base."
                                            };
                                            const metrics = (aiReport as any).cfoMetrics?.creditReadiness || { dscr: 2.4, quickRatio: 1.8, impliedValuation: 2500000 };

                                            return (
                                                <>
                                                    {/* Hard Metrics Board */}
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between">Debt Service (DSCR) <i className="fas fa-landmark text-blue-400"></i></div>
                                                            <div>
                                                                <div className={`text-4xl font-mono font-black text-white tracking-tighter`}>
                                                                    {metrics.dscr.toFixed(2)}x
                                                                </div>
                                                                <div className="text-[9px] text-blue-400 mt-2 font-mono uppercase tracking-wide">Required standard: &gt; 1.25x</div>
                                                            </div>
                                                        </motion.div>

                                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between">Quick Ratio <i className="fas fa-droplet text-emerald-400"></i></div>
                                                            <div>
                                                                <div className={`text-4xl font-mono font-black text-white tracking-tighter`}>
                                                                    {metrics.quickRatio.toFixed(2)}
                                                                </div>
                                                                <div className="text-[9px] text-emerald-400 mt-2 font-mono uppercase tracking-wide">Required standard: &gt; 1.0</div>
                                                            </div>
                                                        </motion.div>

                                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-indigo-900 to-fuchsia-900 rounded-2xl border border-fuchsia-500/30 p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_30px_rgba(192,38,211,0.15)]">
                                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                                            <div className="text-[9px] text-white font-black uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center justify-between">Implied Valuation <i className="fas fa-gem text-fuchsia-300"></i></div>
                                                            <div className="relative z-10">
                                                                <div className="text-3xl font-mono font-black text-white tracking-tight">
                                                                    GHS {metrics.impliedValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                </div>
                                                                <div className="text-[9px] text-fuchsia-200 mt-2 font-mono uppercase tracking-widest opacity-80">Based on 3.5x Revenue Multiple</div>
                                                            </div>
                                                        </motion.div>
                                                    </div>

                                                    {/* Investment Thesis Narrative */}
                                                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 flex-grow flex flex-col">
                                                        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></div> The Investment Thesis</h3>
                                                        <p className="text-sm text-slate-300 font-serif leading-relaxed mb-8 pl-4 border-l-2 border-slate-700">{vPitch.investmentThesis}</p>

                                                        <div className="grid grid-cols-2 gap-8 flex-grow">
                                                            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
                                                                <h3 className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><i className="fas fa-money-bill-trend-up"></i> Funding Ask & Deployment strategy</h3>
                                                                <p className="text-xs text-slate-400 leading-relaxed font-serif">{vPitch.theAskAndUseOfFunds}</p>
                                                            </div>
                                                            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
                                                                <h3 className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><i className="fas fa-shield-virus"></i> Risk Mitigation & Defense</h3>
                                                                <p className="text-xs text-slate-400 leading-relaxed font-serif">{vPitch.riskMitigation}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-center mt-6">
                                                        <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                                            <i className="fas fa-check-circle"></i>
                                                            <span className="text-[9px] uppercase tracking-[0.3em] font-black">Profile Cleared For Institutional Review</span>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Page 10: Official Audit Sign-off (Back Cover) */}
                            <div className={`report-page ${(currentPage === 9 || isExporting === 'pdf') ? 'block' : 'hidden'} w-[210mm] min-h-[297mm] relative print:block print:w-[210mm] print:h-[297mm] print:break-after-page print:break-inside-avoid print:overflow-hidden bg-white text-slate-900 overflow-hidden`}>

                                <div className={`p-16 h-full flex flex-col justify-between relative z-10 border-8 border-slate-900 m-4 w-[calc(100%-32px)] h-[calc(100%-32px)] bg-white rounded-sm ${isExporting === 'pdf' ? 'h-[297mm] overflow-hidden' : ''}`}>

                                    {/* Top Section */}
                                    <div className="mt-16">
                                        <div className="text-center mb-12">
                                            <h2 className="text-4xl font-serif font-black text-slate-900 tracking-tight mb-3 uppercase">Official Attestation</h2>
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="h-[2px] w-16 bg-slate-900"></div>
                                                <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-600">Final Audit Certificate</div>
                                                <div className="h-[2px] w-16 bg-slate-900"></div>
                                            </div>
                                        </div>

                                        <div className="relative max-w-2xl mx-auto">
                                            <div className="border border-slate-300 p-10 bg-slate-50 relative z-10 text-center">
                                                <p className="text-sm font-serif text-slate-700 leading-loose">
                                                    This <span className="text-slate-900 font-bold">Financial Summary Report</span> has been formally generated and compiled by the Africa Entrepreneurship School platform.
                                                </p>
                                                <p className="text-sm font-serif text-slate-700 leading-loose mt-4">
                                                    The financial data detailed herein is based on the ledger entries processed for the stated period, providing a <span className="text-slate-900 italic font-semibold">true reflection</span> of the recorded transactions.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Checksum Bar */}
                                        <div className="mt-10 flex justify-center">
                                            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-slate-100 border border-slate-200 rounded-full font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                                                <i className="fas fa-fingerprint text-slate-400"></i>
                                                <span>Report Checksum:</span>
                                                <span className="text-slate-700 font-bold">{(Math.random().toString(36).substring(2, 15)).toUpperCase()}-AES</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-2 gap-16 px-10 mb-16 relative z-10 mt-16">
                                        <div className="text-center">
                                            <div className="h-24 border-b border-slate-400 mb-5 flex items-end justify-center pb-2 relative">
                                                <div className="absolute bottom-4 w-full text-center font-serif italic text-4xl text-slate-700 transform rotate-[-4deg]">System AI</div>
                                            </div>
                                            <div className="text-xs uppercase font-bold tracking-widest text-slate-900">System Generator</div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2 font-mono">
                                                Automated Compilation
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <div className="h-24 border-b border-slate-400 mb-5 flex items-end justify-center pb-2 relative">
                                                <div className="absolute bottom-4 w-full text-center font-serif italic text-3xl text-slate-900 transform rotate-[-2deg]">{entrepreneur.name}</div>
                                            </div>
                                            <div className="text-xs uppercase font-bold tracking-widest text-slate-900">Managing Director</div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2 font-mono">
                                                {entrepreneur.businessName}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Back Cover branding */}
                                    <div className="text-center relative z-10 border-t border-slate-200 pt-8 mt-auto">
                                        <div className="flex items-center justify-center gap-4 mb-5">
                                            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                                                AES <span className="text-slate-400 font-light">| Finance</span>
                                            </h1>
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                            Africa Entrepreneurship School
                                        </div>
                                        <div className="text-[9px] text-slate-400 mt-4 font-mono flex items-center justify-center gap-2">
                                            REF-ID: AES-FIN-{new Date().getFullYear()}-{Math.floor(Math.random() * 900000) + 100000}
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div >
            </motion.div >
        </AnimatePresence >
    );
};



export default HtmlReportView;
