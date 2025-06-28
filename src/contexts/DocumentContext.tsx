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
  isLoading: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load documents and templates from database on mount
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Wait for database to be ready
      await databaseService.waitForReady();
      
      // Load both documents and templates
      await Promise.all([
        refreshDocuments(),
        refreshTemplates()
      ]);
      
    } catch (error) {
      console.error('Failed to initialize document context:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      console.log(`Loaded ${contextDocuments.length} documents into context`);
    } catch (error) {
      console.error('Failed to load documents from database:', error);
      setDocuments([]);
    }
  };

  const refreshTemplates = async () => {
    try {
      const storedTemplates = await databaseService.getAllTemplates();
      setDocumentTypes(storedTemplates);
      console.log(`Loaded ${storedTemplates.length} templates into context`);
    } catch (error) {
      console.error('Failed to load templates from database:', error);
      setDocumentTypes([]);
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
      refreshTemplates,
      isLoading
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