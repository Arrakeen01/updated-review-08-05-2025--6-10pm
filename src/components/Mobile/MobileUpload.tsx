import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Upload, Camera, CheckCircle, AlertTriangle, FileText, Clock } from 'lucide-react';
import { qrUploadService } from '../../services/qrUploadService';

export function MobileUpload() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  // Get session ID from URL params or query string
  const getSessionId = (): string | null => {
    if (sessionId) return sessionId;
    
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('session');
  };

  const currentSessionId = getSessionId();

  useEffect(() => {
    if (currentSessionId) {
      // Validate session
      const isValid = qrUploadService.validateSession(currentSessionId);
      setSessionValid(isValid);
      
      if (isValid) {
        loadUploadHistory();
      }
    } else {
      setSessionValid(false);
    }
  }, [currentSessionId]);

  const loadUploadHistory = async () => {
    if (!currentSessionId) return;
    
    try {
      const uploads = await qrUploadService.getSessionUploads(currentSessionId);
      setUploadHistory(uploads);
    } catch (error) {
      console.error('Failed to load upload history:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    setFiles(selectedFiles);
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!files || files.length === 0) {
      setUploadStatus('error');
      setUploadMessage('Please select a file to upload');
      return;
    }

    if (!currentSessionId) {
      setUploadStatus('error');
      setUploadMessage('Invalid session. Please scan the QR code again.');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');
    
    try {
      const file = files[0];
      
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and PDF files are allowed');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const result = await qrUploadService.uploadFile(currentSessionId, file);
      
      setUploadStatus('success');
      setUploadMessage(`File "${result.fileName}" uploaded successfully!`);
      
      // Clear form
      setFiles(null);
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload upload history
      loadUploadHistory();
      
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Validating session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 w-full max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Session</h1>
          <p className="text-gray-600 mb-4">
            This upload session has expired or is invalid. Please scan the QR code again.
          </p>
          <div className="text-sm text-gray-500">
            Session ID: {currentSessionId || 'Not provided'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center mb-4">
            <Camera className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-gray-900">Document Upload</h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload documents securely via SPARK system
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800">
              <strong>Session ID:</strong> {currentSessionId?.substring(0, 20)}...
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select Document
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JPEG, PNG, PDF (Max: 10MB)
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading || !files}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {uploadMessage && (
            <div className={`mt-4 p-3 rounded-md ${
              uploadStatus === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {uploadStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                )}
                <span className={`text-sm ${
                  uploadStatus === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadMessage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Upload History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload History</h2>
          
          {uploadHistory.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No uploads yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadHistory.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{upload.file_name}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(upload.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    upload.processed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {upload.processed ? 'Processed' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Take clear photos of documents</li>
            <li>• Ensure all text is readable</li>
            <li>• Include stamps and signatures</li>
            <li>• Files will be processed automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}