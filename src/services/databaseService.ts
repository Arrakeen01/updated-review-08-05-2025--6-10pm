import Dexie, { Table } from 'dexie';
import { Document, DocumentType } from '../types';
import { securityService } from './securityService';
import { supabaseService } from './supabaseService';

export interface StoredDocument extends Document {
  documentData?: string; // Base64 encoded document data
  extractedImages?: ExtractedImage[];
  processingMetadata?: ProcessingMetadata;
}

export interface ExtractedImage {
  id: string;
  type: 'logo' | 'stamp' | 'signature' | 'photo' | 'diagram';
  base64Data: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  description?: string;
}

export interface ProcessingMetadata {
  layoutAnalysis: LayoutElement[];
  tableData: TableData[];
  documentClassification: DocumentClassification;
  qualityMetrics: QualityMetrics;
}

export interface LayoutElement {
  type: 'header' | 'footer' | 'title' | 'text' | 'table' | 'figure' | 'list';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  content: string;
  tokens?: TokenInfo[];
}

export interface TokenInfo {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  entityType?: string;
}

export interface TableData {
  id: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rows: TableRow[];
  headers: string[];
  confidence: number;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rowSpan?: number;
  colSpan?: number;
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
  subType?: string;
  language: string;
  orientation: 'portrait' | 'landscape';
}

export interface QualityMetrics {
  overallQuality: number;
  textClarity: number;
  imageQuality: number;
  layoutComplexity: number;
  ocrConfidence: number;
}

class SparkDatabase extends Dexie {
  documents!: Table<StoredDocument>;
  templates!: Table<DocumentType>;
  auditLogs!: Table<any>;
  users!: Table<any>;

  constructor() {
    super('SparkDatabase');
    
    this.version(1).stores({
      documents: '++id, type.id, createdBy, timestamp, status, location, confidence, [type.id+status], [createdBy+timestamp]',
      templates: '++id, name, category, [category+name]',
      auditLogs: '++id, userId, action, resource, timestamp, [userId+timestamp], [action+timestamp]',
      users: '++id, username, role, station, createdAt'
    });

    // Add hooks for audit logging
    this.documents.hook('creating', (primKey, obj, trans) => {
      securityService.logAction(
        obj.createdBy,
        'document_created',
        'document',
        obj.id,
        { 
          documentType: obj.type.name,
          confidence: obj.confidence,
          location: obj.location
        }
      );
    });

    this.documents.hook('updating', (modifications, primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'document_updated',
        'document',
        obj.id,
        { 
          modifications: Object.keys(modifications),
          documentType: obj.type.name
        }
      );
    });

    this.documents.hook('deleting', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'document_deleted',
        'document',
        obj.id,
        { 
          documentType: obj.type.name,
          originalLocation: obj.location
        }
      );
    });

    this.templates.hook('creating', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_created',
        'template',
        obj.id,
        { 
          templateName: obj.name,
          category: obj.category,
          fieldsCount: obj.template.length
        }
      );
    });

    this.templates.hook('updating', (modifications, primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_updated',
        'template',
        obj.id,
        { 
          modifications: Object.keys(modifications),
          templateName: obj.name
        }
      );
    });

    this.templates.hook('deleting', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_deleted',
        'template',
        obj.id,
        { 
          templateName: obj.name,
          category: obj.category
        }
      );
    });
  }
}

class DatabaseService {
  private db: SparkDatabase;
  private useSupabase: boolean = false; // Disabled Supabase storage
  private syncInProgress: boolean = false;

  constructor() {
    this.db = new SparkDatabase();
    // Removed Supabase initialization
  }

  private async initializeSupabaseSync() {
    // Disabled Supabase sync
    console.log('Supabase sync disabled - using IndexedDB only');
  }

  private async syncExistingDataToSupabase(): Promise<void> {
    // Disabled Supabase sync
    console.log('Supabase sync disabled - using IndexedDB only');
  }

  private getBuiltInTemplates(): DocumentType[] {
    return [
      {
        id: 'earned_leave',
        name: 'Earned Leave Letter',
        category: 'Leave',
        template: [
          { id: 'applicantName', label: 'Applicant Name', type: 'text', required: true },
          { id: 'employeeId', label: 'Employee ID', type: 'text', required: true },
          { id: 'department', label: 'Department', type: 'text', required: true },
          { id: 'designation', label: 'Designation', type: 'text', required: true },
          { id: 'leaveType', label: 'Leave Type', type: 'select', required: true, options: ['Earned Leave', 'Annual Leave', 'Vacation Leave'] },
          { id: 'startDate', label: 'Leave Start Date', type: 'date', required: true },
          { id: 'endDate', label: 'Leave End Date', type: 'date', required: true },
          { id: 'duration', label: 'Duration (Days)', type: 'number', required: true },
          { id: 'reason', label: 'Reason for Leave', type: 'textarea', required: true },
          { id: 'supervisorName', label: 'Supervisor Name', type: 'text', required: true },
          { id: 'applicationDate', label: 'Application Date', type: 'date', required: true },
          { id: 'contactNumber', label: 'Contact Number', type: 'text', required: false },
          { id: 'emergencyContact', label: 'Emergency Contact', type: 'text', required: false }
        ],
        validationRules: []
      },
      {
        id: 'medical_leave',
        name: 'Medical Leave Letter',
        category: 'Leave',
        template: [
          { id: 'patientName', label: 'Patient Name', type: 'text', required: true },
          { id: 'employeeId', label: 'Employee ID', type: 'text', required: true },
          { id: 'department', label: 'Department', type: 'text', required: true },
          { id: 'designation', label: 'Designation', type: 'text', required: true },
          { id: 'medicalCondition', label: 'Medical Condition', type: 'textarea', required: true },
          { id: 'doctorName', label: 'Doctor Name', type: 'text', required: true },
          { id: 'hospitalName', label: 'Hospital/Clinic Name', type: 'text', required: true },
          { id: 'leaveStartDate', label: 'Medical Leave Start Date', type: 'date', required: true },
          { id: 'leaveEndDate', label: 'Medical Leave End Date', type: 'date', required: true },
          { id: 'certificateNumber', label: 'Medical Certificate Number', type: 'text', required: false },
          { id: 'treatmentDetails', label: 'Treatment Details', type: 'textarea', required: false },
          { id: 'applicationDate', label: 'Application Date', type: 'date', required: true },
          { id: 'supervisorName', label: 'Supervisor Name', type: 'text', required: true }
        ],
        validationRules: []
      },
      {
        id: 'probation_letter',
        name: 'Probation Letter',
        category: 'Administrative',
        template: [
          { id: 'employeeName', label: 'Employee Name', type: 'text', required: true },
          { id: 'employeeId', label: 'Employee ID', type: 'text', required: true },
          { id: 'position', label: 'Position/Designation', type: 'text', required: true },
          { id: 'department', label: 'Department', type: 'text', required: true },
          { id: 'probationStartDate', label: 'Probation Start Date', type: 'date', required: true },
          { id: 'probationEndDate', label: 'Probation End Date', type: 'date', required: true },
          { id: 'probationPeriod', label: 'Probation Period (Months)', type: 'number', required: true },
          { id: 'evaluationCriteria', label: 'Evaluation Criteria', type: 'textarea', required: true },
          { id: 'supervisorName', label: 'Supervisor Name', type: 'text', required: true },
          { id: 'reviewSchedule', label: 'Review Schedule', type: 'textarea', required: false },
          { id: 'conditions', label: 'Terms and Conditions', type: 'textarea', required: true },
          { id: 'issuanceDate', label: 'Letter Issuance Date', type: 'date', required: true },
          { id: 'hrSignature', label: 'HR Signature', type: 'text', required: true }
        ],
        validationRules: []
      },
      {
        id: 'punishment_letter',
        name: 'Punishment Letter',
        category: 'Disciplinary',
        template: [
          { id: 'officerName', label: 'Officer Name', type: 'text', required: true },
          { id: 'badgeNumber', label: 'Badge Number', type: 'text', required: true },
          { id: 'rank', label: 'Rank', type: 'select', required: true, options: ['Constable', 'Head Constable', 'Sub-Inspector', 'Inspector', 'DSP', 'SP'] },
          { id: 'department', label: 'Department', type: 'text', required: true },
          { id: 'violationType', label: 'Type of Violation', type: 'select', required: true, options: ['Misconduct', 'Negligence of Duty', 'Insubordination', 'Unauthorized Absence', 'Other'] },
          { id: 'incidentDate', label: 'Incident Date', type: 'date', required: true },
          { id: 'incidentDescription', label: 'Incident Description', type: 'textarea', required: true },
          { id: 'punishmentType', label: 'Type of Punishment', type: 'select', required: true, options: ['Warning', 'Suspension', 'Fine', 'Demotion', 'Dismissal'] },
          { id: 'punishmentDuration', label: 'Punishment Duration', type: 'text', required: false },
          { id: 'fineAmount', label: 'Fine Amount (if applicable)', type: 'number', required: false },
          { id: 'issuingAuthority', label: 'Issuing Authority', type: 'text', required: true },
          { id: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
          { id: 'appealRights', label: 'Appeal Rights Information', type: 'textarea', required: true }
        ],
        validationRules: []
      },
      {
        id: 'reward_letter',
        name: 'Reward Letter',
        category: 'Recognition',
        template: [
          { id: 'recipientName', label: 'Recipient Name', type: 'text', required: true },
          { id: 'badgeNumber', label: 'Badge Number', type: 'text', required: true },
          { id: 'rank', label: 'Rank', type: 'select', required: true, options: ['Constable', 'Head Constable', 'Sub-Inspector', 'Inspector', 'DSP', 'SP'] },
          { id: 'department', label: 'Department', type: 'text', required: true },
          { id: 'awardType', label: 'Type of Award', type: 'select', required: true, options: ['Gallantry Award', 'Service Medal', 'Commendation Certificate', 'Excellence Award', 'Bravery Award'] },
          { id: 'achievementDescription', label: 'Achievement Description', type: 'textarea', required: true },
          { id: 'achievementDate', label: 'Achievement Date', type: 'date', required: true },
          { id: 'awardDate', label: 'Award Date', type: 'date', required: true },
          { id: 'issuingAuthority', label: 'Issuing Authority', type: 'text', required: true },
          { id: 'witnessNames', label: 'Witness Names', type: 'textarea', required: false },
          { id: 'monetaryValue', label: 'Monetary Value (if applicable)', type: 'number', required: false },
          { id: 'ceremonyDetails', label: 'Award Ceremony Details', type: 'textarea', required: false },
          { id: 'citation', label: 'Citation', type: 'textarea', required: true }
        ],
        validationRules: []
      }
    ];
  }

  // Document methods
  async saveDocument(document: StoredDocument): Promise<string> {
    try {
      // Encrypt sensitive data before storing
      const encryptedDocument = this.encryptSensitiveFields(document);
      
      // Store in IndexedDB only
      const documentId = String(await this.db.documents.add(encryptedDocument));
      
      console.log(`Document saved with ID: ${documentId}`);
      return documentId;
    } catch (error) {
      console.error('Failed to save document:', error);
      throw new Error('Failed to save document to database');
    }
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    try {
      const document = await this.db.documents.get(id) || null;

      if (!document) return null;
      
      // Decrypt sensitive fields
      return this.decryptSensitiveFields(document);
    } catch (error) {
      console.error('Failed to retrieve document:', error);
      return null;
    }
  }

  async getAllDocuments(): Promise<StoredDocument[]> {
    try {
      const documents = await this.db.documents.orderBy('timestamp').reverse().toArray();
      return documents.map(doc => this.decryptSensitiveFields(doc));
    } catch (error) {
      console.error('Failed to retrieve documents:', error);
      return [];
    }
  }

  async updateDocument(id: string, updates: Partial<StoredDocument>): Promise<boolean> {
    try {
      const encryptedUpdates = this.encryptSensitiveFields(updates as StoredDocument);
      await this.db.documents.update(id, encryptedUpdates);
      return true;
    } catch (error) {
      console.error('Failed to update document:', error);
      return false;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await this.db.documents.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  // Template methods
  async saveTemplate(template: DocumentType): Promise<string> {
    try {
      const templateId = String(await this.db.templates.add(template));
      console.log(`Template saved with ID: ${templateId}`);
      return templateId;
    } catch (error) {
      console.error('Failed to save template to database:', error);
      throw new Error('Failed to save template to database');
    }
  }

  async getTemplate(id: string): Promise<DocumentType | null> {
    try {
      const template = await this.db.templates.get(id) || null;
      return template;
    } catch (error) {
      console.error('Failed to retrieve template from database:', error);
      return null;
    }
  }

  async getAllTemplates(): Promise<DocumentType[]> {
    try {
      const templates = await this.db.templates.orderBy('name').toArray();

      // Always include built-in templates
      const builtInTemplates = this.getBuiltInTemplates();
      const customTemplates = templates.filter(t => !builtInTemplates.some(bt => bt.id === t.id));
      
      return [...builtInTemplates, ...customTemplates];
    } catch (error) {
      console.error('Failed to retrieve templates from database:', error);
      return this.getBuiltInTemplates(); // Return at least built-in templates
    }
  }

  async updateTemplate(id: string, updates: Partial<DocumentType>): Promise<boolean> {
    try {
      await this.db.templates.update(id, updates);
      return true;
    } catch (error) {
      console.error('Failed to update template:', error);
      return false;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await this.db.templates.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }

  async getTemplatesByCategory(category: string): Promise<DocumentType[]> {
    try {
      const allTemplates = await this.getAllTemplates();
      return allTemplates.filter(template => template.category === category);
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      return [];
    }
  }

  // Search and filter methods
  async searchDocuments(query: string, filters?: {
    documentType?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    location?: string;
    minConfidence?: number;
  }): Promise<StoredDocument[]> {
    try {
      const documents = await this.searchDocumentsIndexedDB(query, filters);
      return documents.map(doc => this.decryptSensitiveFields(doc));
    } catch (error) {
      console.error('Failed to search documents:', error);
      return [];
    }
  }

  private async searchDocumentsIndexedDB(query: string, filters?: any): Promise<StoredDocument[]> {
    let collection = this.db.documents.orderBy('timestamp').reverse();

    // Apply filters
    if (filters) {
      if (filters.documentType) {
        collection = collection.filter(doc => doc.type.id === filters.documentType);
      }
      if (filters.status) {
        collection = collection.filter(doc => doc.status === filters.status);
      }
      if (filters.location) {
        collection = collection.filter(doc => doc.location === filters.location);
      }
      if (filters.minConfidence) {
        collection = collection.filter(doc => doc.confidence >= filters.minConfidence!);
      }
      if (filters.dateRange) {
        collection = collection.filter(doc => {
          const docDate = new Date(doc.timestamp);
          const startDate = new Date(filters.dateRange!.start);
          const endDate = new Date(filters.dateRange!.end);
          return docDate >= startDate && docDate <= endDate;
        });
      }
    }

    const documents = await collection.toArray();
    
    // Text search
    const searchResults = documents.filter(doc => {
      if (!query) return true;
      
      const searchText = [
        doc.ocrRawText,
        JSON.stringify(doc.fields),
        doc.type.name,
        doc.location
      ].join(' ').toLowerCase();
      
      return searchText.includes(query.toLowerCase());
    });

    return searchResults;
  }

  async searchTemplates(query: string): Promise<DocumentType[]> {
    try {
      const templates = await this.getAllTemplates();
      
      if (!query) return templates;
      
      return templates.filter(template => 
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.category.toLowerCase().includes(query.toLowerCase()) ||
        template.template.some(field => 
          field.label.toLowerCase().includes(query.toLowerCase())
        )
      );
    } catch (error) {
      console.error('Failed to search templates:', error);
      return [];
    }
  }

  // Statistics and analytics
  async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByStatus: Record<string, number>;
    averageConfidence: number;
    documentsThisMonth: number;
  }> {
    try {
      const documents = await this.getAllDocuments();
      
      const stats = {
        totalDocuments: documents.length,
        documentsByType: {} as Record<string, number>,
        documentsByStatus: {} as Record<string, number>,
        averageConfidence: 0,
        documentsThisMonth: 0
      };

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      documents.forEach(doc => {
        // Count by type
        const typeName = doc.type.name;
        stats.documentsByType[typeName] = (stats.documentsByType[typeName] || 0) + 1;
        
        // Count by status
        stats.documentsByStatus[doc.status] = (stats.documentsByStatus[doc.status] || 0) + 1;
        
        // Count this month
        if (new Date(doc.timestamp) >= thisMonth) {
          stats.documentsThisMonth++;
        }
      });

      // Calculate average confidence
      if (documents.length > 0) {
        stats.averageConfidence = documents.reduce((sum, doc) => sum + doc.confidence, 0) / documents.length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get document statistics:', error);
      return {
        totalDocuments: 0,
        documentsByType: {},
        documentsByStatus: {},
        averageConfidence: 0,
        documentsThisMonth: 0
      };
    }
  }

  async getTemplateStatistics(): Promise<{
    totalTemplates: number;
    templatesByCategory: Record<string, number>;
    averageFieldsPerTemplate: number;
  }> {
    try {
      const templates = await this.getAllTemplates();
      
      const stats = {
        totalTemplates: templates.length,
        templatesByCategory: {} as Record<string, number>,
        averageFieldsPerTemplate: 0
      };

      templates.forEach(template => {
        // Count by category
        stats.templatesByCategory[template.category] = (stats.templatesByCategory[template.category] || 0) + 1;
      });

      // Calculate average fields per template
      if (templates.length > 0) {
        stats.averageFieldsPerTemplate = templates.reduce((sum, template) => sum + template.template.length, 0) / templates.length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get template statistics:', error);
      return {
        totalTemplates: 0,
        templatesByCategory: {},
        averageFieldsPerTemplate: 0
      };
    }
  }

  // Utility methods
  private encryptSensitiveFields(document: StoredDocument): StoredDocument {
    const encrypted = { ...document };
    
    // Encrypt sensitive field values
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(encrypted.fields)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          encrypted.fields[fieldName] = securityService.encrypt(value);
        }
      }
    }

    return encrypted;
  }

  private decryptSensitiveFields(document: StoredDocument): StoredDocument {
    const decrypted = { ...document };
    
    // Decrypt sensitive field values
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(decrypted.fields)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          try {
            decrypted.fields[fieldName] = securityService.decrypt(value);
          } catch (error) {
            // If decryption fails, assume it's not encrypted
            console.warn(`Failed to decrypt field ${fieldName}:`, error);
          }
        }
      }
    }

    return decrypted;
  }

  // Backup and export methods
  async exportDocuments(): Promise<Blob> {
    try {
      const documents = await this.getAllDocuments();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        documents: documents.map(doc => ({
          ...doc,
          // Remove sensitive data from export
          documentData: undefined,
          extractedImages: doc.extractedImages?.map(img => ({
            ...img,
            base64Data: img.type === 'logo' || img.type === 'stamp' ? img.base64Data : undefined
          }))
        }))
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to export documents:', error);
      throw new Error('Failed to export documents');
    }
  }

  async exportTemplates(): Promise<Blob> {
    try {
      const templates = await this.getAllTemplates();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        templates
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to export templates:', error);
      throw new Error('Failed to export templates');
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      await this.db.documents.clear();
      await this.db.templates.clear();
      await this.db.auditLogs.clear();
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw new Error('Failed to clear database');
    }
  }

  // Method to toggle storage backend
  setSupabaseEnabled(enabled: boolean): void {
    this.useSupabase = enabled;
    console.log(`Supabase storage ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSupabaseEnabled(): boolean {
    return this.useSupabase;
  }

  // Manual sync method
  async syncToSupabase(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Supabase sync is disabled' };
  }
}

export const databaseService = new DatabaseService();