import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToDocx } from './exportService';
import { Packer, Document } from 'docx';
import saveAs from 'file-saver';
import type { AiReport, Entrepreneur } from '../types';

vi.mock('docx', () => {
  const Document = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });
  const Paragraph = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });
  const TextRun = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });
  const Table = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });
  const TableCell = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });
  const TableRow = vi.fn().mockImplementation(function (this: any, props: any) { this.props = props; });

  return {
    Packer: {
      toBlob: vi.fn().mockResolvedValue(new Blob(['mock'])),
    },
    Document,
    Paragraph,
    TextRun,
    Table,
    TableCell,
    TableRow,
    WidthType: { PERCENTAGE: 'percentage' },
    AlignmentType: { CENTER: 'center' },
    HeadingLevel: { HEADING_1: 'Heading 1', HEADING_2: 'Heading 2', HEADING_3: 'Heading 3' },
  };
});

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

describe('exportService - exportToDocx', () => {
  const mockEntrepreneur: Entrepreneur = {
    id: '1',
    name: 'John Doe',
    businessName: 'Doe Inc',
    contact: '1234567890',
    startDate: '2024-01-01',
    preferredPaymentType: 'Mobile Money' as any,
  };

  const period = '2024-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate and save a docx report without an income statement', async () => {
    const mockReport: AiReport = {
      reportTitle: 'Test Report',
      executiveSummary: 'This is a test summary',
      period: '2024-01',
      kpis: {
        grossMargin: '10%',
        ebitdaMargin: '5%',
        netMargin: '2%',
        burnRate: '1000',
        runwayMonths: '12',
      },
      balanceSheet: {
        assets: [],
        liabilities: [],
        equity: [],
        totalAssets: '0',
        totalLiabilitiesAndEquity: '0',
      },
      cashFlowStatement: {
        operating: [],
        investing: [],
        financing: [],
        netCashChange: '0',
        closingCash: '0',
      },
      forecast: {
        projectedRevenue: '0',
        projectedOpEx: '0',
        assumptions: [],
      },
      strategicRecommendations: [],
      incomeStatement: undefined as any,
    };

    await exportToDocx(mockReport, mockEntrepreneur, period);

    expect(Document).toHaveBeenCalled();
    expect(Packer.toBlob).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Report_Doe_Inc_2024-01.docx');
  });

  it('should generate and save a docx report with an income statement', async () => {
    const mockReport: AiReport = {
      reportTitle: 'Test Report',
      executiveSummary: 'This is a test summary',
      period: '2024-01',
      kpis: {
        grossMargin: '10%',
        ebitdaMargin: '5%',
        netMargin: '2%',
        burnRate: '1000',
        runwayMonths: '12',
      },
      balanceSheet: {
        assets: [],
        liabilities: [],
        equity: [],
        totalAssets: '0',
        totalLiabilitiesAndEquity: '0',
      },
      cashFlowStatement: {
        operating: [],
        investing: [],
        financing: [],
        netCashChange: '0',
        closingCash: '0',
      },
      forecast: {
        projectedRevenue: '0',
        projectedOpEx: '0',
        assumptions: [],
      },
      strategicRecommendations: [
        { priority: 'high', recommendation: 'Do something' }
      ],
      incomeStatement: {
        revenue: [{ label: 'Sales', amount: '100' }],
        expenses: [{ label: 'Rent', amount: '50' }],
        taxProvision: '10',
        netIncome: '40',
      },
    };

    await exportToDocx(mockReport, mockEntrepreneur, period);

    expect(Document).toHaveBeenCalled();
    expect(Packer.toBlob).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Report_Doe_Inc_2024-01.docx');
  });
});
