import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Upload, Clock, CheckCircle, AlertCircle, Camera, RefreshCw, Eye } from 'lucide-react';
import { qrUploadService } from '../../services/qrUploadService';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zklfntkdyzutyilpppsj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprbGZudGtkeXl1dHlpbHBwcHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwOTQ2MzYsImV4cCI6MjA2NjY3MDYzNn0.CXT7ho3QhJCMZKHvdYxLDUwsKwXConG4cqu76mUM__k';

const supabase = createClient(supabaseUrl, supabaseKey);

export function QRUpload() {
  const { user } = useAuth();
  const [qrSessions, setQrSessions] = useState<Array<{ sessionId: string; qrCodeUrl: string; expiresAt: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUploadedFiles();
    }
    
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [user]);

  const loadUploadedFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to load uploads:', error);
        return;
      }

      setUploadedFiles(data || []);
    } catch (error) {
      console.error('Error loading uploaded files:', error);
    }
  };

  const generateUploadQR = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // Create upload session
      const sessionId = await qrUploadService.createUploadSession(user.id, 24);
      
      // Generate QR code URL pointing to mobile upload interface
      const mobileUploadUrl = `${window.location.origin}/mobile-upload?session=${sessionId}`;
      
      // Generate QR code image
      const qrCodeUrl = await QRCodeGenerator.toDataURL(mobileUploadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff'
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const newQRSession = {
        sessionId,
        qrCodeUrl,
        expiresAt: expiresAt.toISOString()
      };

      setQrSessions(prev => [...prev, newQRSession]);

      // Set up real-time listener for this session
      const channel = qrUploadService.subscribeToSessionUploads(sessionId, (payload) => {
        console.log('New upload detected:', payload);
        loadUploadedFiles(); // Refresh the upload list
      });
      
      setRealtimeChannel(channel);

    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeQRCode = (sessionId: string) => {
    qrUploadService.revokeSession(sessionId);
    setQrSessions(prev => prev.filter(session => session.sessionId !== sessionId));
    
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      setRealtimeChannel(null);
    }
  };

  const refreshUploadedFiles = () => {
    loadUploadedFiles();
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mobile QR Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate QR codes for secure mobile document upload via Supabase
            </p>
          </div>
          <button
            onClick={generateUploadQR}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Generate Upload QR
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">How to use Mobile Upload</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Generate a QR code using the button above</li>
                  <li>Open your mobile camera or QR scanner app</li>
                  <li>Scan the QR code to open the secure upload interface</li>
                  <li>Take photos or select documents from your device</li>
                  <li>Documents will be uploaded to Supabase and processed with Hugging Face AI</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Active QR Sessions */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-medium text-gray-900">Active QR Sessions</h3>
          
          {qrSessions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active QR sessions</p>
              <p className="text-sm text-gray-400">Generate a QR code to enable mobile uploads</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrSessions.map((session) => (
                <div key={session.sessionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium text-gray-900">
                        Document Upload
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isExpired(session.expiresAt) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isExpired(session.expiresAt)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isExpired(session.expiresAt) ? 'Expired' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-3 mb-3">
                    <img
                      src={session.qrCodeUrl}
                      alt="QR Code"
                      className="w-full h-32 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Expires: {new Date(session.expiresAt).toLocaleDateString()} at{' '}
                        {new Date(session.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span>Session ID: {session.sessionId.substring(0, 20)}...</span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `qr-upload-${session.sessionId}.png`;
                        link.href = session.qrCodeUrl;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => revokeQRCode(session.sessionId)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Files */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Mobile Uploads</h3>
            <button
              onClick={refreshUploadedFiles}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </button>
          </div>
          
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No files uploaded yet</p>
              <p className="text-sm text-gray-400">Files uploaded via QR codes will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(file.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      file.processed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {file.processed ? 'Processed' : 'Pending'}
                    </div>
                    <button
                      onClick={() => {
                        const { data } = supabase.storage.from('uploads').getPublicUrl(file.file_path);
                        window.open(data.publicUrl, '_blank');
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}