/**
 * Diff Service
 * Computes differences between versions of entities
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 8
 */

export interface DiffResult {
  field: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue: any;
  newValue: any;
}

export interface TextDiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface TextDiffResult {
  hunks: TextDiffHunk[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

export interface TextDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: TextDiffLine[];
}

/**
 * Compute diff between two objects
 */
export function computeObjectDiff(oldObj: any, newObj: any): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  for (const key of allKeys) {
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    if (oldValue === undefined && newValue !== undefined) {
      results.push({ field: key, type: 'added', oldValue: null, newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      results.push({ field: key, type: 'removed', oldValue, newValue: null });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      results.push({ field: key, type: 'modified', oldValue, newValue });
    }
    // Skip unchanged fields
  }

  return results;
}

/**
 * Compute line-by-line diff between two text strings
 * Uses a simple LCS-based algorithm
 */
export function computeTextDiff(oldText: string, newText: string): TextDiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Compute LCS (Longest Common Subsequence) for line matching
  const lcs = computeLCS(oldLines, newLines);

  const diffLines: TextDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (
      lcsIndex < lcs.length &&
      oldIndex < oldLines.length &&
      newIndex < newLines.length &&
      oldLines[oldIndex] === lcs[lcsIndex] &&
      newLines[newIndex] === lcs[lcsIndex]
    ) {
      // Unchanged line
      diffLines.push({
        type: 'unchanged',
        content: oldLines[oldIndex],
        lineNumber: newIndex + 1,
      });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (
      oldIndex < oldLines.length &&
      (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])
    ) {
      // Removed line
      diffLines.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber: oldIndex + 1,
      });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      // Added line
      diffLines.push({
        type: 'added',
        content: newLines[newIndex],
        lineNumber: newIndex + 1,
      });
      newIndex++;
    }
  }

  // Group into hunks (context around changes)
  const hunks = groupIntoHunks(diffLines, oldLines.length, newLines.length);

  const stats = {
    added: diffLines.filter(l => l.type === 'added').length,
    removed: diffLines.filter(l => l.type === 'removed').length,
    unchanged: diffLines.filter(l => l.type === 'unchanged').length,
  };

  return { hunks, stats };
}

/**
 * Compute LCS (Longest Common Subsequence)
 */
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;

  // Create DP table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Group diff lines into hunks with context
 */
function groupIntoHunks(
  lines: TextDiffLine[],
  oldLineCount: number,
  newLineCount: number,
  contextLines: number = 3
): TextDiffHunk[] {
  if (lines.length === 0) {
    return [];
  }

  // Find changed line indices
  const changedIndices: number[] = [];
  lines.forEach((line, index) => {
    if (line.type !== 'unchanged') {
      changedIndices.push(index);
    }
  });

  if (changedIndices.length === 0) {
    return [];
  }

  const hunks: TextDiffHunk[] = [];
  let hunkStart = Math.max(0, changedIndices[0] - contextLines);
  let hunkEnd = Math.min(lines.length - 1, changedIndices[0] + contextLines);

  for (let i = 1; i < changedIndices.length; i++) {
    const nextChangeStart = changedIndices[i] - contextLines;
    const nextChangeEnd = changedIndices[i] + contextLines;

    if (nextChangeStart <= hunkEnd + 1) {
      // Merge with current hunk
      hunkEnd = Math.min(lines.length - 1, nextChangeEnd);
    } else {
      // Create new hunk
      hunks.push(createHunk(lines, hunkStart, hunkEnd));
      hunkStart = Math.max(0, nextChangeStart);
      hunkEnd = Math.min(lines.length - 1, nextChangeEnd);
    }
  }

  // Add final hunk
  hunks.push(createHunk(lines, hunkStart, hunkEnd));

  return hunks;
}

function createHunk(lines: TextDiffLine[], start: number, end: number): TextDiffHunk {
  const hunkLines = lines.slice(start, end + 1);
  const oldLines = hunkLines.filter(l => l.type !== 'added').length;
  const newLines = hunkLines.filter(l => l.type !== 'removed').length;

  // Calculate old/new start lines
  let oldStart = 1;
  let newStart = 1;

  for (let i = 0; i < start; i++) {
    if (lines[i].type !== 'added') oldStart++;
    if (lines[i].type !== 'removed') newStart++;
  }

  return {
    oldStart,
    oldLines,
    newStart,
    newLines,
    lines: hunkLines,
  };
}

/**
 * Format diff as unified diff string
 */
export function formatUnifiedDiff(
  diff: TextDiffResult,
  oldFileName: string = 'old',
  newFileName: string = 'new'
): string {
  const lines: string[] = [];

  lines.push(`--- ${oldFileName}`);
  lines.push(`+++ ${newFileName}`);

  for (const hunk of diff.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);

    for (const line of hunk.lines) {
      if (line.type === 'added') {
        lines.push(`+${line.content}`);
      } else if (line.type === 'removed') {
        lines.push(`-${line.content}`);
      } else {
        lines.push(` ${line.content}`);
      }
    }
  }

  return lines.join('\n');
}
