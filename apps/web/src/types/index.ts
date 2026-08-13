import type {
  AdjustmentScope,
  AdjustmentType,
  EstimateStatus,
  HostingModel,
  Permission,
  UserRole,
} from '@furnix/shared';

export type { AdjustmentScope, AdjustmentType, EstimateStatus, HostingModel, UserRole };

export interface ApiMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: ApiMeta;
  error?: { code: string; details?: unknown };
  timestamp: string;
}

export interface Paged<T> {
  items: T[];
  meta: ApiMeta;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

export interface AuditStamp {
  id: string;
  name: string;
  email: string;
}

export interface ModuleMaster {
  id: string;
  code: string;
  name: string;
  description: string | null;
  cloudSetupFee: string;
  selfHostedSetupFee: string;
  isActive: boolean;
  sequence: number;
  createdBy?: AuditStamp | null;
  updatedBy?: AuditStamp | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SelectableModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  cloudSetupFee: string;
  selfHostedSetupFee: string;
  sequence: number;
}

export interface TermsTemplate {
  id: string;
  title: string;
  contentHtml: string;
  version: string;
  isActive: boolean;
  isDefault: boolean;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  legalName: string;
  brandName: string;
  gstin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  defaultGstPercent: string;
  /** Platform user pricing — charged per user per month, independent of modules. */
  monthlyPricePerUser: string;
  userLineLabel: string;
  defaultValidityDays: number;
  estimateNumberPrefix: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  defaultTermsTemplateId: string | null;
}

export interface EstimateModuleLine {
  id: string;
  moduleId: string | null;
  moduleCode: string;
  moduleName: string;
  moduleDescription: string | null;
  sequence: number;
  /** Present only when the viewer may see internal pricing. */
  cloudSetupFee?: string;
  selfHostedSetupFee?: string;
  overrideOneTimeFee?: string | null;
  isOverridden?: boolean;
  /** Every active module is returned, taken or not. */
  isSelected: boolean;
  /** What it would cost under this hosting model, whether or not it was taken. */
  applicableOneTimeFee: string;
  /** Zero unless isSelected. */
  appliedOneTimeFee: string;
  lineOneTimeAmount: string;
  userCount?: number;
}

export interface EstimateClause {
  id: string;
  sourceTemplateId: string | null;
  title: string;
  contentHtml: string;
  version: string | null;
  sequence: number;
  isCustom: boolean;
}

export interface EstimateListRow {
  id: string;
  estimateNumber: string;
  estimateDate: string;
  validUntil: string;
  status: EstimateStatus;
  clientCompanyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  hostingModel: HostingModel;
  userCount: number;
  userLineLabel: string;
  userRateSnapshot: string;
  userRateOverride: string | null;
  appliedMonthlyPerUser: string;
  userLineMonthlyAmount: string;
  netPayableOneTime: string;
  monthlyRecurringPayable: string;
  version: number;
  createdBy: AuditStamp | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  hasAdjustment?: boolean;
}

export interface Estimate extends EstimateListRow {
  fiscalYear: string;
  billingAddress: string;
  gstin: string | null;
  gstPercent: string;
  notes: string | null;
  termsIntro: string | null;
  modules: EstimateModuleLine[];
  clauses: EstimateClause[];
  taxableOneTime: string;
  taxableRecurring: string;
  gstOneTime: string;
  gstRecurring: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  updatedBy: AuditStamp | null;

  /** Internal — present only for roles holding estimate:adjustment:view. */
  canViewAdjustment: boolean;
  oneTimeSubtotal?: string;
  recurringSubtotal?: string;
  oneTimeAdjustment?: string;
  recurringAdjustment?: string;
  internalAdjustmentType?: AdjustmentType;
  internalAdjustmentValue?: string;
  internalAdjustmentScope?: AdjustmentScope;
  internalAdjustmentNote?: string | null;
}

export interface EstimateActivityEntry {
  id: string;
  action: string;
  message: string;
  meta: Record<string, unknown> | null;
  actor: AuditStamp | null;
  createdAt: string;
}

export interface EstimateRevisionEntry {
  id: string;
  version: number;
  changeSummary: string | null;
  createdBy: AuditStamp | null;
  createdAt: string;
}

export interface EstimateSummary {
  byStatus: { status: EstimateStatus; count: number; oneTimeValue: string; recurringValue: string }[];
  pipelineOneTime: string;
  pipelineMonthly: string;
  expiringWithin7Days: number;
}

/** Payload shared by create and update. */
export interface EstimatePayload {
  /** Per-estimate override of the configured platform user rate. */
  userRateOverride?: number | null;
  estimateDate: string;
  validUntil: string;
  clientCompanyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  billingAddress: string;
  gstin?: string | null;
  hostingModel: HostingModel;
  userCount: number;
  gstPercent: number;
  modules: {
    moduleId: string;
    overrideOneTimeFee?: number | null;
    overrideMonthlyPerUser?: number | null;
    sequence?: number;
    userCount?: number;
  }[];
  clauses: {
    sourceTemplateId?: string | null;
    title: string;
    contentHtml: string;
    version?: string | null;
    sequence: number;
    isCustom: boolean;
  }[];
  notes?: string | null;
  termsIntro?: string | null;
  adjustment?: {
    type: AdjustmentType;
    value: number;
    scope: AdjustmentScope;
    note?: string | null;
  };
}
