# PDF Preview Page Parameter Implementation

**Status:** ✅ Complete  
**Date:** 2025-01-28

---

## Implementation Summary

Implemented PDF preview page parameter support in `app/api/v1/documents/[documentId]/preview/route.ts`.

---

## Features

1. **Page Parameter Support**
   - Query parameter: `?page={number}`
   - Default: Returns full document if not specified
   - Validation: Must be positive integer

2. **Page Number Validation**
   - Checks if page number is valid (positive integer)
   - Validates against `document.page_count` if available
   - Validates against actual PDF page count after loading

3. **PDF Page Extraction**
   - Uses `pdf-lib` library to extract specific page
   - Creates new single-page PDF with requested page
   - Returns extracted page as PDF

4. **Error Handling**
   - Returns 422 error for invalid page numbers
   - Falls back to full PDF if extraction fails
   - Validates page count from both database and PDF file

5. **Image Support**
   - Page parameter is ignored for image files
   - Images are treated as single-page documents

---

## Package Required

```bash
npm install pdf-lib
```

---

## API Usage

**Get specific page:**
```
GET /api/v1/documents/{documentId}/preview?page=5
```

**Get full document:**
```
GET /api/v1/documents/{documentId}/preview
```

---

## Response

- **Content-Type:** `application/pdf` (for PDFs) or image MIME type
- **Status:** 200 OK
- **Body:** PDF file (single page or full document)

---

## Error Responses

**422 Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Page number exceeds document page count. Document has 10 page(s)",
    "details": {
      "page": "Document has 10 page(s)"
    }
  }
}
```

---

## Implementation Details

1. Parse page parameter from query string
2. Validate page number format and range
3. Download PDF from Supabase Storage
4. Load PDF using pdf-lib
5. Validate page number against actual page count
6. Extract requested page (0-based indexing: page 1 = index 0)
7. Create new PDF with extracted page
8. Return single-page PDF

**Fallback Behavior:**
- If pdf-lib is not available, returns full PDF with warning log
- If page extraction fails, returns full PDF (graceful degradation)

---

**Last Updated:** 2025-01-28

