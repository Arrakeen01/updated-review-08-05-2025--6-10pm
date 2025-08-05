import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zklfntkdyzutyilpppsj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprbGZudGtkeXl1dHlpbHBwcHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwOTQ2MzYsImV4cCI6MjA2NjY3MDYzNn0.CXT7ho3QhJCMZKHvdYxLDUwsKwXConG4cqu76mUM__k';

const supabase = createClient(supabaseUrl, supabaseKey);
import { huggingFaceService } from './huggingFaceService';

interface QRUploadSession {
  id: string;
  sessionId: string;
  expiresAt: string;
  userId: string;
  active: boolean;
}

interface FileUploadResult {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  uploadedAt: string;
}

class QRUploadService {
  private sessions: Map<string, QRUploadSession> = new Map();

  // Create a new upload session
  async createUploadSession(userId: string, expirationHours: number = 24): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const session: QRUploadSession = {
      id: sessionId,
      sessionId,
      expiresAt: expiresAt.toISOString(),
      userId,
      active: true
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  // Validate upload session
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (new Date() > new Date(session.expiresAt)) {
      this.sessions.delete(sessionId);
      return false;
    }

    return session.active;
  }

  // Upload file to Supabase storage and create database record
  async uploadFile(sessionId: string, file: File): Promise<FileUploadResult> {
    if (!this.validateSession(sessionId)) {
      throw new Error('Invalid or expired session');
    }

    try {
      // Create file path
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `uploads/${sessionId}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Insert metadata into database
      const { data: dbData, error: dbError } = await supabase
        .from('uploads')
        .insert([{
          session_id: sessionId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: sessionId
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      const result: FileUploadResult = {
        id: dbData.id,
        fileName: file.name,
        filePath,
        fileUrl: urlData.publicUrl,
        uploadedAt: dbData.created_at
      };

      return result;

    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Process uploaded document with Hugging Face
  async processUploadedDocument(fileId: string, userId: string): Promise<any> {
    try {
      // Get file info from database
      const { data: uploadData, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !uploadData) {
        throw new Error('Upload not found');
      }

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('uploads')
        .download(uploadData.file_path);

      if (downloadError) {
        throw new Error(`File download failed: ${downloadError.message}`);
      }

      // Convert blob to File object
      const file = new File([fileData], uploadData.file_name, {
        type: uploadData.file_type
      });

      // Process with Hugging Face
      const processedResult = await huggingFaceService.processDocument(file, userId);

      // Update upload record with processing results
      const { error: updateError } = await supabase
        .from('uploads')
        .update({
          processed: true,
          processing_metadata: {
            documentType: processedResult.documentType,
            extractedData: processedResult.extractedData,
            confidence: processedResult.confidence,
            processingTime: processedResult.processingTime
          }
        })
        .eq('id', fileId);

      if (updateError) {
        console.error('Failed to update processing metadata:', updateError);
      }

      return processedResult;

    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }

  // Get uploads for a session
  async getSessionUploads(sessionId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get session uploads:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get session uploads error:', error);
      return [];
    }
  }

  // Subscribe to real-time changes for a session
  subscribeToSessionUploads(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel('uploads-listen')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uploads',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Revoke session
  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const qrUploadService = new QRUploadService();
export type { QRUploadSession, FileUploadResult };