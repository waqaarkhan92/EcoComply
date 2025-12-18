/**
 * File Validation Utilities
 *
 * Provides magic byte validation to prevent MIME type spoofing attacks.
 * Checks that file signatures match declared MIME types.
 */

// Magic byte signatures for supported file types
const FILE_SIGNATURES = {
  PDF: {
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
  },
  PNG: {
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG header
    mimeType: 'image/png',
    extensions: ['.png'],
  },
  JPEG: {
    signature: [0xFF, 0xD8, 0xFF], // JPEG header
    mimeType: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
  },
  DOC: {
    signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // MS Office compound file
    mimeType: 'application/msword',
    extensions: ['.doc'],
  },
  DOCX: {
    signature: [0x50, 0x4B, 0x03, 0x04], // ZIP archive (DOCX is a ZIP)
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['.docx'],
  },
} as const;

export interface FileValidationResult {
  isValid: boolean;
  detectedType?: string;
  declaredType: string;
  error?: string;
}

/**
 * Validates file magic bytes against declared MIME type
 *
 * @param buffer - File buffer (first 512 bytes is sufficient)
 * @param declaredMimeType - MIME type declared by the client
 * @param fileName - File name with extension
 * @returns Validation result
 */
export async function validateFileMagicBytes(
  buffer: ArrayBuffer,
  declaredMimeType: string,
  fileName: string
): Promise<FileValidationResult> {
  const bytes = new Uint8Array(buffer.slice(0, 512)); // Only need first 512 bytes
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

  // Detect actual file type from magic bytes
  let detectedType: string | undefined;

  for (const [type, config] of Object.entries(FILE_SIGNATURES)) {
    if (matchesSignature(bytes, config.signature)) {
      detectedType = config.mimeType;

      // Special handling for DOCX (it's a ZIP, so check further)
      if (type === 'DOCX' && extension === '.docx') {
        detectedType = config.mimeType;
        break;
      }

      // For other types, break on first match
      if (type !== 'DOCX') {
        break;
      }
    }
  }

  // If we couldn't detect the type
  if (!detectedType) {
    return {
      isValid: false,
      declaredType: declaredMimeType,
      error: 'Could not verify file type from file signature',
    };
  }

  // Check if detected type matches declared type
  if (detectedType !== declaredMimeType) {
    return {
      isValid: false,
      detectedType,
      declaredType: declaredMimeType,
      error: `File signature indicates ${detectedType}, but declared type is ${declaredMimeType}`,
    };
  }

  // Validate extension matches detected type
  const expectedExtensions = Object.values(FILE_SIGNATURES)
    .find(config => config.mimeType === detectedType)
    ?.extensions || [];

  if (!(expectedExtensions as readonly string[]).includes(extension)) {
    return {
      isValid: false,
      detectedType,
      declaredType: declaredMimeType,
      error: `File extension ${extension} does not match detected type ${detectedType}`,
    };
  }

  return {
    isValid: true,
    detectedType,
    declaredType: declaredMimeType,
  };
}

/**
 * Checks if byte array starts with the given signature
 */
function matchesSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get allowed MIME types for validation
 */
export function getAllowedMimeTypes(): string[] {
  return Array.from(new Set(Object.values(FILE_SIGNATURES).map(config => config.mimeType)));
}

/**
 * Get allowed file extensions for validation
 */
export function getAllowedExtensions(): string[] {
  return Array.from(new Set(Object.values(FILE_SIGNATURES).flatMap(config => config.extensions)));
}
