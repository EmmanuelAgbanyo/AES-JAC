
import { PaymentMethod, PaidStatus, TransactionType } from './constants';

export enum Role {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  STAFF = 'Staff',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  assignedEntrepreneurIds?: string[];
}

export interface Entrepreneur {
  id: string;
  name: string;
  contact: string;
  businessName: string;
  startDate: string;
  preferredPaymentType: PaymentMethod;
  bio?: string;
  goals?: Goal[];
  assignedStaffId?: string;
  pin?: string;
}

export interface Client {
  id: string;
  entrepreneurId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  lastTransactionDate?: string;
  dateOfBirth?: string;
  totalRevenue?: number;
}

export interface InventoryItem {
  id: string;
  entrepreneurId: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  cost: number;
  category?: string;
  lowStockThreshold?: number;
  imageUrl?: string;
  expiryDate?: string;
  location?: string;
  minStockLevel?: number;
  lastRestockDate?: string;
  supplierId?: string; // Linked to Supplier
  dateStocked: string; // ISO Date
  totalRevenue: number;
  totalUnitsSold: number;
  brand?: string;
  manufacturer?: string;
  status: 'active' | 'archived' | 'discontinued';
}

export enum LogType {
    RESTOCK = 'RESTOCK',
    SALE = 'SALE',
    SALE_REVERSAL = 'SALE_REVERSAL',
    ADJUSTMENT = 'ADJUSTMENT',
    EXPIRED = 'EXPIRED',
    DAMAGE = 'DAMAGE',
    RETURN = 'RETURN',
    INTERNAL_USE = 'INTERNAL_USE',
    WASTAGE = 'WASTAGE'
}

export interface InventoryLog {
    id: string;
    itemId: string;
    entrepreneurId: string;
    timestamp: string;
    type: LogType;
    quantityChange: number;
    reason: string;
    performedBy: string;
}

export interface Supplier {
    id: string;
    entrepreneurId: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    notes?: string;
}

export type CurrentUser =
  | { type: 'system', user: User }
  | { type: 'entrepreneur', user: Entrepreneur };


export interface Transaction {
  id: string;
  entrepreneurId: string;
  type: TransactionType;
  date: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidStatus?: PaidStatus;
  customerName?: string;
  productServiceCategory?: string;
  inventoryItemId?: string;
  quantitySold?: number;
}

export type PartialTransaction = Partial<Omit<Transaction, 'id' | 'entrepreneurId' | 'amount'>> & { amount?: string | number };

export interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  receivablesSummary: {
    total: number;
    count: number;
  };
  transactionCount: {
    income: number;
    expense: number;
  };
  incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
  fullPaymentRate: number;
  collectionRate: number;
  totalBilled: number;
  topSellingItems: Array<{ category: string; amount: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; income: number; expenses: number }>;
  topCustomers: Array<{ name: string; totalRevenue: number; transactionCount: number }>;
  averageTransactionValue: number;
  dayOfWeekAnalysis: Array<{ day: string; income: number; count: number }>;
  customerConcentration: { top3Percentage: number; riskLevel: 'Low' | 'Medium' | 'High' };
  liquidity: { currentRatio: number; quickRatio: number; cashRatio: number; workingCapital: number };
  cfoMetrics: {
    dupont: {
      roe: number;
      netProfitMargin: number;
      assetTurnover: number;
      equityMultiplier: number;
    };
    breakEven: {
      breakEvenRevenue: number;
      marginOfSafety: number;
    };
    workingCapitalCycle: {
      daysSalesOwing: number;
      daysPayableOutstanding: number;
      cashConversionCycle: number;
    };
    creditReadiness: {
      dscr: number;
      quickRatio: number;
      impliedValuation: number;
    };
  };
}

export interface AiReportLineItem {
  label: string;
  amount: string;
  isTotal?: boolean;
  isNegative?: boolean;
  indent?: number;
}

export interface AiReport {
  reportTitle: string;
  executiveSummary: string;
  period: string;
  kpis: {
    grossMargin: string;
    ebitdaMargin: string;
    netMargin: string;
    burnRate: string;
    runwayMonths: string;
  };
  incomeStatement: {
    revenue: AiReportLineItem[];
    expenses: AiReportLineItem[];
    taxProvision: string;
    netIncome: string;
  };
  balanceSheet: {
    assets: AiReportLineItem[];
    liabilities: AiReportLineItem[];
    equity: AiReportLineItem[];
    totalAssets: string;
    totalLiabilitiesAndEquity: string;
  };
  cashFlowStatement: {
    operating: AiReportLineItem[];
    investing: AiReportLineItem[];
    financing: AiReportLineItem[];
    netCashChange: string;
    closingCash: string;
  };
  forecast: {
    projectedRevenue: string;
    projectedOpEx: string;
    assumptions: string[];
  };
  strategicRecommendations: Array<{ recommendation: string; priority: 'high' | 'medium' | 'low' }>;

  // Visualizations & Intelligence
  visualizations?: {
    monthlyTrends: { month: string; income: number; expenses: number }[];
    incomeDistribution: { name: string; value: number; color: string }[];
    expenseDistribution: { name: string; value: number; color: string }[];
    dayOfWeekTrends: { day: string; value: number }[];
  };
  topCustomers?: { name: string; totalRevenue: number; transactionCount: number }[];
  customerConcentration?: { top3Percentage: number; riskLevel: 'Low' | 'Medium' | 'High' };
  financialPosition?: {
    currentRatio: number;
    quickRatio: number;
    workingCapital: number;
  };

  // Compatibility fields
  keyMetrics?: any[];
  detailedAnalysis?: any[];

  // Advanced CFO Commentary
  advancedCfoCommentary?: {
    dupontAnalysis: string;
    breakEvenAnalysis: string;
    efficiencyMetrics: string;
  };

  // Venture & Credit Pitch
  venturePitch?: {
    investmentThesis: string;
    theAskAndUseOfFunds: string;
    riskMitigation: string;
  };
}

export enum GoalType {
  REVENUE_TARGET = 'Revenue Target',
  PROFIT_TARGET = 'Profit Target',
  EXPENSE_REDUCTION = 'Expense Reduction',
  CUSTOM = 'Custom Milestone',
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  targetValue: number;
  targetDate: string;
  description?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'Article' | 'Video' | 'Template';
  url: string;
  tags: string[];
}

export interface SuggestedDocument {
  documentName: string;
  description: string;
  contractType: string;
}

export interface SuggestedResource {
  title: string;
  reason: string;
}

export interface GrowthPlan {
  executiveSummary: string;
  strategicRecommendations: {
    title: string;
    recommendation: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
  suggestedDocuments: SuggestedDocument[];
  suggestedResources?: SuggestedResource[];
}

export interface ContractData {
  title: string;
  clauses: { title: string; content: string; }[];
}

export interface DashboardInsight {
  type: 'milestone' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  icon: '🎉' | '⚠️' | '💡' | '📉';
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}
