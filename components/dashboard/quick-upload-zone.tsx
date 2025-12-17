'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickUploadZoneProps {
  /** Optional site ID to pre-select when uploading */
  siteId?: string;
  /** Compact mode - smaller visual footprint */
  compact?: boolean;
  /** Called when files are dropped */
  onFilesDropped?: (files: File[]) => void;
}

export function QuickUploadZone({ siteId, compact = false, onFilesDropped }: QuickUploadZoneProps) {
  const router = useRouter();
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDroppedFiles(acceptedFiles);
      setShowConfirm(true);
      onFilesDropped?.(acceptedFiles);
    }
  }, [onFilesDropped]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true,
  });

  const handleUploadEvidence = () => {
    // Store files in sessionStorage for the upload page to pick up
    if (droppedFiles.length > 0) {
      sessionStorage.setItem('pending_upload_files', JSON.stringify(
        droppedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
      ));
    }
    const url = siteId
      ? `/dashboard/sites/${siteId}/permits/evidence/upload`
      : '/dashboard/evidence/upload';
    router.push(url);
    setShowConfirm(false);
  };

  const handleUploadDocument = () => {
    if (droppedFiles.length > 0) {
      sessionStorage.setItem('pending_upload_files', JSON.stringify(
        droppedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
      ));
    }
    const url = siteId
      ? `/dashboard/sites/${siteId}/permits/documents`
      : '/dashboard/documents/upload';
    router.push(url);
    setShowConfirm(false);
  };

  const cancelUpload = () => {
    setDroppedFiles([]);
    setShowConfirm(false);
  };

  if (compact) {
    return (
      <>
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-4
            transition-colors cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
            ${isDragReject ? 'border-danger bg-danger/5' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3 text-text-secondary">
            <Upload className={`h-5 w-5 ${isDragActive ? 'text-primary' : ''}`} />
            <span className="text-sm">
              {isDragActive ? 'Drop files here...' : 'Drop files to upload'}
            </span>
          </div>
        </div>

        {/* Confirm Modal */}
        <UploadConfirmModal
          isOpen={showConfirm}
          files={droppedFiles}
          onClose={cancelUpload}
          onUploadEvidence={handleUploadEvidence}
          onUploadDocument={handleUploadDocument}
        />
      </>
    );
  }

  return (
    <>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          ${isDragReject ? 'border-danger bg-danger/5' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center text-center">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center mb-4
            ${isDragActive ? 'bg-primary/10' : 'bg-gray-100'}
          `}>
            <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
          </div>

          <h3 className={`text-lg font-semibold mb-1 ${isDragActive ? 'text-primary' : 'text-text-primary'}`}>
            {isDragActive ? 'Drop files here' : 'Quick Upload'}
          </h3>

          <p className="text-sm text-text-secondary mb-4 max-w-sm">
            {isDragActive
              ? 'Release to upload your files'
              : 'Drag and drop evidence or permit documents here, or click to browse'}
          </p>

          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            <span>PDF</span>
            <span>•</span>
            <span>Images</span>
            <span>•</span>
            <span>Word</span>
            <span>•</span>
            <span>Excel</span>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <UploadConfirmModal
        isOpen={showConfirm}
        files={droppedFiles}
        onClose={cancelUpload}
        onUploadEvidence={handleUploadEvidence}
        onUploadDocument={handleUploadDocument}
      />
    </>
  );
}

// Confirmation modal for choosing upload type
function UploadConfirmModal({
  isOpen,
  files,
  onClose,
  onUploadEvidence,
  onUploadDocument,
}: {
  isOpen: boolean;
  files: File[];
  onClose: () => void;
  onUploadEvidence: () => void;
  onUploadDocument: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-text-primary">
                  Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-text-tertiary" />
                </button>
              </div>

              {/* Files Preview */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate text-text-secondary">{file.name}</span>
                      <span className="text-text-tertiary text-xs flex-shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                <p className="text-sm text-text-secondary mb-4">
                  What type of files are you uploading?
                </p>

                <button
                  onClick={onUploadEvidence}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-text-primary">Compliance Evidence</p>
                      <p className="text-xs text-text-secondary">Lab results, photos, reports</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-tertiary group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={onUploadDocument}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-text-primary">Permit Document</p>
                      <p className="text-xs text-text-secondary">Extract obligations automatically</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-tertiary group-hover:text-primary transition-colors" />
                </button>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <Button variant="ghost" onClick={onClose} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
