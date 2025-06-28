import React, { createContext, useContext, useState, useEffect } from 'react';
import { Document, DocumentType } from '../types';
import { databaseService } from '../services/databaseService';

interface DocumentContextType {
  documents: Document[];
  documentTypes: DocumentType[];
  addDocument: (document: Omit<Document, 'id' | 'timestamp'>) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  finalizeDocument: (id: string, userId: string) => void;
  refreshDocuments: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Built-in templates that serve as defaults
const defaultDocumentTypes: DocumentType[] = [
  {
    id: 'earned_leave',
    name: 'Earned Leave Letter',
    category: 'Leave',
    template: [
      { 
        id: 'rcNo', 
        label: 'R c No.', 
        type: 'text', 
        required: true,
        validation: '^[A-Z0-9]+/[0-9]{1,4}/[0-9]{4}$'
      },
      { 
        id: 'hodNo', 
        label: 'H.O.D No.', 
        type: 'text', 
        required: true,
        validation: '^[0-9]{1,4}/[0-9]{4}$'
      },
      { 
        id: 'serviceNo', 
        label: 'PC No. or HC No or ARSI No', 
        type: 'text', 
        required: false,
        validation: '^(PC-|HC|ARSI)[0-9]{1,4}$'
      },
      { 
        id: 'name', 
        label: 'Name', 
        type: 'text', 
        required: true,
        validation: '^[A-Za-z\\s\\.]+$'
      },
      { 
        id: 'date', 
        label: 'Date', 
        type: 'date', 
        required: true 
      },
      { 
        id: 'numberOfDays', 
        label: 'Number of Days', 
        type: 'number', 
        required: true 
      },
      { 
        id: 'leaveFromDate', 
        label: 'Leave From Date', 
        type: 'date', 
        required: true 
      },
      { 
        id: 'leaveToDate', 
        label: 'Leave To Date', 
        type: 'date', 
        required: true 
      },
      { 
        id: 'leaveReason', 
        label: 'Leave Reason', 
        type: 'textarea', 
        required: true 
      }
    ],
    validationRules: [
      {
        field: 'rcNo',
        rule: 'format',
        message: 'R c No. must be in format: Section Code/Serial Number/Year (e.g., B4/149/2020)'
      },
      {
        field: 'hodNo',
        rule: 'format', 
        message: 'H.O.D No. must be in format: Serial Number/Year (e.g., 72/2020)'
      },
      {
        field: 'serviceNo',
        rule: 'conditional_required',
        message: 'Service number is required for PC, HC, or ARSI designations'
      },
      {
        field: 'name',
        rule: 'format',
        message: 'Name must contain only alphabets, spaces, and periods'
      },
      {
        field: 'numberOfDays',
        rule: 'range',
        message: 'Number of days must be between 1 and 365'
      },
      {
        field: 'leaveToDate',
        rule: 'date_after',
        message: 'Leave To Date must be after Leave From Date'
      }
    ]
  },
  {
    id: 'medical_leave',
    name: 'Medical Leave Letter',
    category: 'Leave',
    template: [
      { 
        id: 'name', 
        label: 'Name', 
        type: 'text', 
        required: true,
        validation: '^[A-Za-z\\s\\.]+$'
      },
      { 
        id: 'dateOfSubmission', 
        label: 'Date of Submission', 
        type: 'date', 
        required: true 
      },
      { 
        id: 'coyBelongsTo', 
        label: 'Coy Belongs to', 
        type: 'text', 
        required: true,
        validation: '^[A-Za-z0-9\\s]+$'
      },
      { 
        id: 'rank', 
        label: 'Rank', 
        type: 'select', 
        required: true,
        options: ['PC', 'HC', 'SI', 'ASI', 'Inspector', 'DSP', 'SP', 'DIG', 'IG', 'ADGP', 'DGP']
      },
      { 
        id: 'leaveReason', 
        label: 'Leave Reason', 
        type: 'textarea', 
        required: true 
      },
      { 
        id: 'phoneNumber', 
        label: 'Phone Number', 
        type: 'text', 
        required: true,
        validation: '^[6-9][0-9]{9}$'
      },
      { 
        id: 'unitAndDistrict', 
        label: 'Unit and District', 
        type: 'text', 
        required: true,
        validation: '^[A-Za-z0-9\\s\\.,]+$'
      }
    ],
    validationRules: [
      {
        field: 'name',
        rule: 'format',
        message: 'Name should contain only alphabets, periods (.) and spaces. No digits or special characters.'
      },
      {
        field: 'coyBelongsTo',
        rule: 'format',
        message: 'Company field should clearly indicate the unit/company affiliation (e.g., A Coy, B Coy, HQ Coy)'
      },
      {
        field: 'phoneNumber',
        rule: 'format',
        message: 'Must be a valid 10-digit Indian mobile number starting with 6-9'
      },
      {
        field: 'unitAndDistrict',
        rule: 'format',
        message: 'Must include both unit name and valid district name (e.g., 5th Bn. APSP, Vizianagaram)'
      },
      {
        field: 'leaveReason',
        rule: 'required',
        message: 'Leave reason must be a descriptive sentence explaining the medical purpose'
      }
    ]
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

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  // Load documents and templates from database on mount
  useEffect(() => {
    refreshDocuments();
    refreshTemplates();
  }, []);

  const refreshDocuments = async () => {
    try {
      const storedDocuments = await databaseService.getAllDocuments();
      // Convert stored documents to context format
      const contextDocuments: Document[] = storedDocuments.map(stored => ({
        id: stored.id,
        type: stored.type,
        templateVersion: stored.templateVersion,
        tags: stored.tags,
        fields: stored.fields,
        ocrRawText: stored.ocrRawText,
        imageUrl: stored.imageUrl,
        createdBy: stored.createdBy,
        timestamp: stored.timestamp,
        location: stored.location,
        status: stored.status,
        finalizedBy: stored.finalizedBy,
        finalizedOn: stored.finalizedOn,
        confidence: stored.confidence,
        metadata: stored.metadata
      }));
      setDocuments(contextDocuments);
    } catch (error) {
      console.error('Failed to load documents from database:', error);
    }
  };

  const refreshTemplates = async () => {
    try {
      // Get all templates from database (includes both built-in and custom)
      const allStoredTemplates = await databaseService.getAllTemplates();
      
      // Create a map of stored templates by ID for quick lookup
      const storedTemplatesMap = new Map(allStoredTemplates.map(t => [t.id, t]));
      
      // Start with an empty array
      const finalTemplates: DocumentType[] = [];
      
      // For each default template, check if there's a stored version
      for (const defaultTemplate of defaultDocumentTypes) {
        const storedVersion = storedTemplatesMap.get(defaultTemplate.id);
        if (storedVersion) {
          // Use the stored version (which may be modified)
          finalTemplates.push(storedVersion);
          // Remove from map so we don't add it again
          storedTemplatesMap.delete(defaultTemplate.id);
        } else {
          // Use the default version
          finalTemplates.push(defaultTemplate);
        }
      }
      
      // Add any remaining custom templates that don't override built-ins
      for (const customTemplate of storedTemplatesMap.values()) {
        finalTemplates.push(customTemplate);
      }
      
      console.log('Loaded templates:', finalTemplates.length, 'total');
      setDocumentTypes(finalTemplates);
    } catch (error) {
      console.error('Failed to load templates from database:', error);
      // Fallback to default templates if database fails
      setDocumentTypes(defaultDocumentTypes);
    }
  };

  const addDocument = (document: Omit<Document, 'id' | 'timestamp'>) => {
    const newDocument: Document = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setDocuments(prev => [...prev, newDocument]);
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      // Update in database
      await databaseService.updateDocument(id, updates as any);
      
      // Update in context
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, ...updates } : doc
      ));
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      // Delete from database
      await databaseService.deleteDocument(id);
      
      // Remove from context
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const finalizeDocument = (id: string, userId: string) => {
    updateDocument(id, {
      status: 'finalized',
      finalizedBy: userId,
      finalizedOn: new Date().toISOString()
    });
  };

  return (
    <DocumentContext.Provider value={{
      documents,
      documentTypes,
      addDocument,
      updateDocument,
      deleteDocument,
      finalizeDocument,
      refreshDocuments,
      refreshTemplates
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}