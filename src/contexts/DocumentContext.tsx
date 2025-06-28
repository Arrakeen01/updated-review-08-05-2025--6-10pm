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