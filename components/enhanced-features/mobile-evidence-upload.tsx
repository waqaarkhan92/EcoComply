'use client';

/**
 * Mobile Evidence Upload Component
 * Mobile-optimized evidence capture and upload with offline support
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import {
  Camera,
  Upload,
  MapPin,
  Mic,
  MicOff,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  WifiOff,
  RefreshCw,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface MobileEvidenceUploadProps {
  obligationId?: string;
  obligationIds?: string[];
  onSuccess?: (evidence: any) => void;
  onError?: (error: Error) => void;
}

interface UploadQueueItem {
  id: string;
  file: File;
  obligationIds: string[];
  gpsLatitude?: number;
  gpsLongitude?: number;
  captureTimestamp: string;
  description?: string;
  evidenceType?: string;
  voiceNote?: Blob;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  offlineSyncToken: string;
}

const evidenceTypes = [
  { value: 'PHOTO', label: 'Photo', icon: ImageIcon },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: FileText },
  { value: 'INSPECTION', label: 'Inspection Record', icon: FileText },
  { value: 'MEASUREMENT', label: 'Measurement', icon: FileText },
];

export function MobileEvidenceUpload({
  obligationId,
  obligationIds: propObligationIds,
  onSuccess,
  onError,
}: MobileEvidenceUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState('PHOTO');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const obligationIds = propObligationIds || (obligationId ? [obligationId] : []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queued items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('evidence-upload-queue');
    if (stored) {
      try {
        const items = JSON.parse(stored);
        setUploadQueue(items.filter((item: UploadQueueItem) => item.status === 'pending'));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem('evidence-upload-queue', JSON.stringify(uploadQueue));
  }, [uploadQueue]);

  const uploadMutation = useMutation({
    mutationFn: async (item: UploadQueueItem) => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('obligation_ids', JSON.stringify(item.obligationIds));
      formData.append('offline_sync_token', item.offlineSyncToken);

      if (item.gpsLatitude) formData.append('gps_latitude', item.gpsLatitude.toString());
      if (item.gpsLongitude) formData.append('gps_longitude', item.gpsLongitude.toString());
      if (item.captureTimestamp) formData.append('capture_timestamp', item.captureTimestamp);
      if (item.description) formData.append('description', item.description);
      if (item.evidenceType) formData.append('evidence_type', item.evidenceType);
      if (item.voiceNote) formData.append('voice_note', item.voiceNote, 'voice-note.m4a');

      // Add device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: { width: screen.width, height: screen.height },
      };
      formData.append('device_info', JSON.stringify(deviceInfo));

      const response = await fetch('/api/v1/evidence/mobile-upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data, item) => {
      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'success' as const } : i))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all });
      onSuccess?.(data);
      resetForm();
    },
    onError: (error: Error, item) => {
      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error' as const, error: error.message } : i
        )
      );
      onError?.(error);
    },
  });

  const requestGpsLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsLoading(false);
      },
      (error) => {
        setGpsError(error.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Create preview URL
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }

      // Auto-request GPS location
      requestGpsLocation();

      // Set evidence type based on file type
      if (file.type.startsWith('image/')) {
        setEvidenceType('PHOTO');
      } else if (file.type.startsWith('video/')) {
        setEvidenceType('VIDEO');
      } else {
        setEvidenceType('DOCUMENT');
      }
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp4' });
        setVoiceNote(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || obligationIds.length === 0) return;

    const item: UploadQueueItem = {
      id: crypto.randomUUID(),
      file: selectedFile,
      obligationIds,
      gpsLatitude: gpsLocation?.lat,
      gpsLongitude: gpsLocation?.lng,
      captureTimestamp: new Date().toISOString(),
      description: description || undefined,
      evidenceType,
      voiceNote: voiceNote || undefined,
      status: 'pending',
      offlineSyncToken: crypto.randomUUID(),
    };

    if (isOnline) {
      item.status = 'uploading';
      setUploadQueue((prev) => [...prev, item]);
      uploadMutation.mutate(item);
    } else {
      // Queue for later
      setUploadQueue((prev) => [...prev, item]);
      resetForm();
    }
  };

  const retryUpload = (item: UploadQueueItem) => {
    if (!isOnline) return;

    setUploadQueue((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' as const, error: undefined } : i))
    );
    uploadMutation.mutate(item);
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescription('');
    setVoiceNote(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const pendingCount = uploadQueue.filter((i) => i.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Capture Evidence</h3>
          </div>
          {!isOnline && (
            <Badge variant="warning" className="text-orange-600 border-orange-300">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
        {pendingCount > 0 && !isOnline && (
          <p className="text-sm text-orange-600 mt-2">
            {pendingCount} item{pendingCount !== 1 ? 's' : ''} queued for upload when online
          </p>
        )}
      </div>

      {/* Upload Area */}
      <div className="p-4">
        {!selectedFile ? (
          <div className="space-y-4">
            {/* Camera Capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="w-full h-24 border-dashed border-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium">Take Photo/Video</span>
              </div>
            </Button>

            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf,.doc,.docx,.xlsx,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="w-full h-16 border-dashed border-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-sm">Choose from Device</span>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            {previewUrl && (
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {selectedFile.type.startsWith('image/') ? (
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : null}
                <button
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!previewUrl && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="w-8 h-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button onClick={resetForm}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            )}

            {/* GPS Location */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <MapPin className={`w-5 h-5 ${gpsLocation ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                {gpsLoading ? (
                  <span className="text-sm text-gray-500">Getting location...</span>
                ) : gpsLocation ? (
                  <span className="text-sm text-green-600">
                    {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                  </span>
                ) : gpsError ? (
                  <span className="text-sm text-red-500">{gpsError}</span>
                ) : (
                  <span className="text-sm text-gray-500">No location</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={requestGpsLocation}
                disabled={gpsLoading}
              >
                <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Evidence Type Selector */}
            <div className="relative">
              <button
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                onClick={() => setShowTypeSelector(!showTypeSelector)}
              >
                <span className="text-sm font-medium text-gray-700">
                  Type: {evidenceTypes.find((t) => t.value === evidenceType)?.label}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTypeSelector ? 'rotate-180' : ''}`} />
              </button>
              {showTypeSelector && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {evidenceTypes.map((type) => (
                    <button
                      key={type.value}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 ${
                        evidenceType === type.value ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setEvidenceType(type.value);
                        setShowTypeSelector(false);
                      }}
                    >
                      <type.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{type.label}</span>
                      {evidenceType === type.value && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />

            {/* Voice Note */}
            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? 'danger' : 'outline'}
                size="sm"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Add Voice Note
                  </>
                )}
              </Button>
              {voiceNote && (
                <Badge variant="default" className="gap-1">
                  <Mic className="w-3 h-3" />
                  Voice note attached
                  <button onClick={() => setVoiceNote(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>

            {/* Upload Button */}
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={uploadMutation.isPending || obligationIds.length === 0}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 mr-2" />
                  Queue for Upload
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Evidence
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Upload Queue</h4>
            <div className="space-y-2">
              {uploadQueue.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    item.status === 'error' ? 'bg-red-50' :
                    item.status === 'success' ? 'bg-green-50' :
                    item.status === 'uploading' ? 'bg-blue-50' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                    {item.status === 'success' && <Check className="w-4 h-4 text-green-600" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {item.status === 'pending' && <WifiOff className="w-4 h-4 text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                    {item.error && <p className="text-xs text-red-600">{item.error}</p>}
                  </div>
                  {item.status === 'error' && isOnline && (
                    <Button variant="ghost" size="sm" onClick={() => retryUpload(item)}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  {(item.status === 'error' || item.status === 'pending') && (
                    <Button variant="ghost" size="sm" onClick={() => removeFromQueue(item.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {uploadQueue.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{uploadQueue.length - 5} more items
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileEvidenceUpload;
