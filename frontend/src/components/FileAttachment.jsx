import React, { useState } from 'react';
import { apiService } from '../utils/mockData';
import { Download, File, FileImage, FileText, AlertCircle } from 'lucide-react';

const FileAttachment = ({ statusId, attachment, className = '' }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    } else if (mimetype === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    if (!statusId) {
      setError('Status ID is required for download');
      return;
    }

    setDownloading(true);
    setError(null);
    
    try {
      const response = await apiService.downloadFile(statusId, attachment.filename);
      
      // Create blob from response data
      const blob = new Blob([response.data], { type: attachment.mimetype });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalname || attachment.filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md transition-colors duration-200 ${className}`}>
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 mr-2">
          {getFileIcon(attachment.mimetype)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {attachment.originalname || attachment.filename}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(attachment.size)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center flex-shrink-0 ml-2">
        {error && (
          <div className="flex items-center mr-2">
            <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-xs text-red-500">{error}</span>
          </div>
        )}
        
        <button
          onClick={handleDownload}
          disabled={downloading || !statusId}
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          title={downloading ? 'Downloading...' : 'Download file'}
        >
          <Download className="h-3 w-3 mr-1" />
          {downloading ? '...' : 'Download'}
        </button>
      </div>
    </div>
  );
};

export default FileAttachment;
