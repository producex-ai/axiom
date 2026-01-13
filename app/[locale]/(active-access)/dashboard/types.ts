export type RenewalPeriod = "monthly" | "quarterly" | "semi_annually" | "annually";
export type DocumentStatus = "draft" | "published";
export type DocumentType = "compliance" | "company";

export interface Document {
  id: string;
  title: string;
  doc_type: DocumentType;
  status: DocumentStatus;
  module_id: string;
  sub_module_id: string;
  current_version: number;
  updated_at: string;
  published_at: string | null;
  renewal: RenewalPeriod | null;
}

export interface Module {
  module: string;
  moduleName: string;
  totalSubModules: number;
  documentsReady: number;
}

export interface Overview {
  frameworkName: string;
  modules: Module[];
}

export interface DashboardData {
  overview: Overview | null;
  documents: Document[];
}

export interface ComplianceMetrics {
  totalRequired: number;
  totalReady: number;
}

export interface DocumentsByExpiry {
  expiring30Days: number;
  expiring90Days: number;
  overdue: number;
}
