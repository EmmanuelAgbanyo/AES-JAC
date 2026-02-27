
import { Packer, Document, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import type { AiReport, Transaction, Entrepreneur, ContractData } from '../types';

const formatPeriod = (period: string) => {
    return period.length === 7 
        ? new Date(period + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
        : `Year ${period}`;
}

// --- CSV Export ---
export const exportToCsv = async (transactions: Transaction[], entrepreneur: Entrepreneur, period: string): Promise<void> => {
    const headers = ["Date", "Type", "Description", "Amount (GHS)", "Payment Method", "Paid Status", "Customer Name", "Product/Service Category"];
    
    const rows = transactions.map(t => [
        t.date,
        t.type,
        t.description,
        t.amount.toFixed(2),
        t.paymentMethod,
        t.type === 'Income' ? t.paidStatus : 'N/A',
        t.customerName || '',
        t.productServiceCategory || ''
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(rowArray => {
        const row = rowArray.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Transactions_${entrepreneur.businessName.replace(/\s/g, '_')}_${period}.csv`);
};


// --- XLSX (Excel) Export ---
export const exportToXlsx = async (aiReport: AiReport, transactions: Transaction[], entrepreneur: Entrepreneur, period: string): Promise<void> => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
        ["Report Title", aiReport.reportTitle],
        ["Business", entrepreneur.businessName],
        ["Period", formatPeriod(period)],
        [],
        ["Executive Summary"],
        [aiReport.executiveSummary],
        [],
        ["Key Metrics"],
        ["Metric", "Value", "Insight"]
    ];
    if (aiReport.keyMetrics) {
        aiReport.keyMetrics.forEach(m => summaryData.push([m.metric, m.value, m.insight]));
    }
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Income Statement Sheet
    if (aiReport.incomeStatement) {
        const incomeData = [
            ["Income & Expense Breakdown"],
            ["Item", "Amount"]
        ];
        // Fix: Use revenue and expenses properties instead of steps
        aiReport.incomeStatement.revenue.forEach(item => incomeData.push([item.label, item.amount]));
        aiReport.incomeStatement.expenses.forEach(item => incomeData.push([item.label, item.amount]));
        incomeData.push(["Tax Provision", aiReport.incomeStatement.taxProvision]);
        // Fix: netIncome is a string
        incomeData.push(["Net Income", aiReport.incomeStatement.netIncome]);
        const incomeWs = XLSX.utils.aoa_to_sheet(incomeData);
        XLSX.utils.book_append_sheet(wb, incomeWs, "Income Statement");
    }

    // Raw Transactions Sheet
    const transactionsWs = XLSX.utils.json_to_sheet(transactions);
    XLSX.utils.book_append_sheet(wb, transactionsWs, "Raw Transactions");
    
    XLSX.writeFile(wb, `Report_${entrepreneur.businessName.replace(/\s/g, '_')}_${period}.xlsx`);
};


// --- DOCX (Word) Report Export ---
const createHeading = (text: string) => new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    style: "heading2",
});

const createSubheading = (text: string) => new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    style: "heading3",
});

const createNormalText = (text: string) => new Paragraph({ text });

export const exportToDocx = async (aiReport: AiReport, entrepreneur: Entrepreneur, period: string): Promise<void> => {
    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: "heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 44, bold: true, color: "0033A0" } },
                { id: "heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: "0052CC" } },
                { id: "heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "333333" } },
            ]
        },
        sections: [{
            children: [
                new Paragraph({ text: aiReport.reportTitle, heading: HeadingLevel.HEADING_1 }),
                createNormalText(`For: ${entrepreneur.name} (${entrepreneur.businessName})`),
                createNormalText(`Period: ${formatPeriod(period)}`),
                
                createHeading("Executive Summary"),
                createNormalText(aiReport.executiveSummary),

                createHeading("Key Metrics"),
                ...(aiReport.keyMetrics || []).flatMap(m => [
                    createSubheading(m.metric),
                    new Paragraph({
                        children: [
                            new TextRun({ text: m.value, bold: true, size: 28 }),
                            new TextRun({ text: ` - ${m.insight}`, italics: true })
                        ]
                    })
                ]),
                
                aiReport.incomeStatement ? createHeading("Income Statement") : createNormalText(""),
                aiReport.incomeStatement ? new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [ new TableCell({ children: [new Paragraph("Item")]}), new TableCell({ children: [new Paragraph("Amount")]}) ]}),
                        // Fix: Use revenue and expenses properties instead of steps
                        ...aiReport.incomeStatement.revenue.map(item => new TableRow({ children: [ new TableCell({ children: [new Paragraph(item.label)]}), new TableCell({ children: [new Paragraph(item.amount)]}) ]})),
                        ...aiReport.incomeStatement.expenses.map(item => new TableRow({ children: [ new TableCell({ children: [new Paragraph(item.label)]}), new TableCell({ children: [new Paragraph(item.amount)]}) ]})),
                        new TableRow({ children: [ new TableCell({ children: [new Paragraph("Tax Provision")]}), new TableCell({ children: [new Paragraph(aiReport.incomeStatement.taxProvision)]}) ]}),
                        // Fix: netIncome is a string
                        new TableRow({ children: [ new TableCell({ children: [new Paragraph({children: [new TextRun({text: "Net Income", bold: true})]})]}) , new TableCell({ children: [new Paragraph({children: [new TextRun({text: aiReport.incomeStatement.netIncome, bold: true})]})]}) ]})
                    ]
                }) : createNormalText(""),

                createHeading("Action Plan"),
                 ...aiReport.strategicRecommendations.map(rec => new Paragraph({
                    children: [new TextRun({ text: `[${rec.priority.toUpperCase()}] `, bold: true }), new TextRun(rec.recommendation) ],
                    bullet: { level: 0 }
                }))
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Report_${entrepreneur.businessName.replace(/\s/g, '_')}_${period}.docx`);
};

// --- Contract DOCX Export ---
export const exportContractToDocx = async (contract: ContractData, entrepreneurName: string): Promise<void> => {
    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: "heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: "000000", font: "Calibri" } },
                { id: "heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "000000", font: "Calibri" } },
                { id: "normal", name: "Normal", basedOn: "Normal", quickFormat: true, run: { size: 22, font: "Calibri" } },

            ]
        },
        sections: [{
            children: [
                new Paragraph({ text: contract.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }), // Spacer
                ...contract.clauses.flatMap(clause => [
                    new Paragraph({ text: clause.title, heading: HeadingLevel.HEADING_2 }),
                    ...clause.content.split('\n').map(line => new Paragraph({ text: line, style: "normal" })),
                    new Paragraph({ text: "" }), // Spacer after each clause
                ])
            ]
        }]
    });
    
    const blob = await Packer.toBlob(doc);
    const fileName = `${contract.title.replace(/\s/g, '_')}_for_${entrepreneurName.replace(/\s/g, '_')}.docx`;
    saveAs(blob, fileName);
};
