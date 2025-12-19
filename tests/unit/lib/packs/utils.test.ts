/**
 * Pack Utils Unit Tests
 * Tests for modular pack generation utilities
 */

import {
  COLORS,
  CCS_BAND_COLORS,
  PACK_TYPE_COLORS,
  getPackTypeName,
  getPackTypeBadgeColor,
  getCCSBandColor,
  getRAGColor,
  getStatusColor,
  getTrendIcon,
  formatDate,
  formatCurrency,
  formatPercentage,
  truncateText,
  getExpectedSections,
  generateBoardRecommendations,
  getFirstYearModeAdjustments,
} from '@/lib/packs/utils';
import type { PackData } from '@/lib/packs/types';

describe('Pack Utils', () => {
  // ========================================================================
  // COLOR CONSTANTS
  // ========================================================================
  describe('Color Constants', () => {
    it('should define standard colors', () => {
      expect(COLORS.RED).toBe('#DC2626');
      expect(COLORS.AMBER).toBe('#F59E0B');
      expect(COLORS.GREEN).toBe('#16A34A');
      expect(COLORS.BLUE).toBe('#2563EB');
      expect(COLORS.WHITE).toBe('#FFFFFF');
      expect(COLORS.BLACK).toBe('#1F2937');
    });

    it('should define CCS band colors', () => {
      expect(CCS_BAND_COLORS.A).toBe('#16A34A');
      expect(CCS_BAND_COLORS.F).toBe('#991B1B');
    });

    it('should define pack type colors', () => {
      expect(PACK_TYPE_COLORS.AUDIT_PACK).toBe(COLORS.BLUE);
      expect(PACK_TYPE_COLORS.REGULATOR_INSPECTION).toBe(COLORS.GREEN);
    });
  });

  // ========================================================================
  // PACK TYPE HELPERS
  // ========================================================================
  describe('getPackTypeName', () => {
    it('should return correct name for AUDIT_PACK', () => {
      expect(getPackTypeName('AUDIT_PACK')).toBe('Internal Audit Pack');
    });

    it('should return correct name for REGULATOR_INSPECTION', () => {
      expect(getPackTypeName('REGULATOR_INSPECTION')).toBe('Regulator Inspection Pack');
    });

    it('should return correct name for TENDER_CLIENT_ASSURANCE', () => {
      expect(getPackTypeName('TENDER_CLIENT_ASSURANCE')).toBe('Client Assurance Pack');
    });

    it('should return correct name for BOARD_MULTI_SITE_RISK', () => {
      expect(getPackTypeName('BOARD_MULTI_SITE_RISK')).toBe('Board Risk Report');
    });

    it('should return correct name for INSURER_BROKER', () => {
      expect(getPackTypeName('INSURER_BROKER')).toBe('Insurance Pack');
    });

    it('should return default for unknown pack type', () => {
      expect(getPackTypeName('UNKNOWN')).toBe('Compliance Pack');
    });
  });

  describe('getPackTypeBadgeColor', () => {
    it('should return correct color for known pack types', () => {
      expect(getPackTypeBadgeColor('AUDIT_PACK')).toBe(COLORS.BLUE);
      expect(getPackTypeBadgeColor('REGULATOR_INSPECTION')).toBe(COLORS.GREEN);
    });

    it('should return default color for unknown pack type', () => {
      expect(getPackTypeBadgeColor('UNKNOWN')).toBe(COLORS.BLUE);
    });
  });

  describe('getCCSBandColor', () => {
    it('should return correct color for each CCS band', () => {
      expect(getCCSBandColor('A')).toBe('#16A34A');
      expect(getCCSBandColor('B')).toBe('#84CC16');
      expect(getCCSBandColor('C')).toBe('#F59E0B');
      expect(getCCSBandColor('D')).toBe('#F97316');
      expect(getCCSBandColor('E')).toBe('#EF4444');
      expect(getCCSBandColor('F')).toBe('#991B1B');
    });

    it('should handle lowercase bands', () => {
      expect(getCCSBandColor('a')).toBe('#16A34A');
    });

    it('should return gray for null or unknown band', () => {
      expect(getCCSBandColor(null)).toBe(COLORS.GRAY);
      expect(getCCSBandColor('X')).toBe(COLORS.GRAY);
    });
  });

  // ========================================================================
  // COMPLIANCE STATUS HELPERS
  // ========================================================================
  describe('getRAGColor', () => {
    it('should return correct RAG colors', () => {
      expect(getRAGColor('RED')).toBe(COLORS.RED);
      expect(getRAGColor('AMBER')).toBe(COLORS.AMBER);
      expect(getRAGColor('GREEN')).toBe(COLORS.GREEN);
    });
  });

  describe('getStatusColor', () => {
    it('should return green for completed/compliant statuses', () => {
      expect(getStatusColor('COMPLETED')).toBe(COLORS.GREEN);
      expect(getStatusColor('COMPLIANT')).toBe(COLORS.GREEN);
      expect(getStatusColor('GREEN')).toBe(COLORS.GREEN);
    });

    it('should return red for overdue/breached statuses', () => {
      expect(getStatusColor('OVERDUE')).toBe(COLORS.RED);
      expect(getStatusColor('BREACHED')).toBe(COLORS.RED);
      expect(getStatusColor('RED')).toBe(COLORS.RED);
    });

    it('should return amber for pending/in_progress statuses', () => {
      expect(getStatusColor('PENDING')).toBe(COLORS.AMBER);
      expect(getStatusColor('IN_PROGRESS')).toBe(COLORS.AMBER);
      expect(getStatusColor('AMBER')).toBe(COLORS.AMBER);
    });

    it('should return gray for unknown statuses', () => {
      expect(getStatusColor('UNKNOWN')).toBe(COLORS.GRAY);
    });

    it('should handle case insensitivity', () => {
      expect(getStatusColor('completed')).toBe(COLORS.GREEN);
      expect(getStatusColor('Overdue')).toBe(COLORS.RED);
    });
  });

  describe('getTrendIcon', () => {
    it('should return correct trend icons', () => {
      expect(getTrendIcon('IMPROVING')).toBe('↑');
      expect(getTrendIcon('DECLINING')).toBe('↓');
      expect(getTrendIcon('STABLE')).toBe('→');
    });
  });

  // ========================================================================
  // FORMATTING HELPERS
  // ========================================================================
  describe('formatDate', () => {
    it('should format date in long format by default', () => {
      const date = new Date('2024-06-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('15');
      expect(formatted).toContain('June');
      expect(formatted).toContain('2024');
    });

    it('should format date in short format', () => {
      const date = new Date('2024-06-15');
      const formatted = formatDate(date, 'short');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should handle undefined date', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
    });

    it('should handle date string', () => {
      const formatted = formatDate('2024-06-15');
      expect(formatted).toContain('15');
      expect(formatted).toContain('June');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in GBP', () => {
      expect(formatCurrency(1000)).toMatch(/£1,000/);
      expect(formatCurrency(1234567)).toMatch(/£1,234,567/);
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toMatch(/£0/);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(75.567)).toBe('75.6%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(75.567, 2)).toBe('75.57%');
      expect(formatPercentage(75, 0)).toBe('75%');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very lo...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(truncateText(null as any, 10)).toBe('');
      expect(truncateText(undefined as any, 10)).toBe('');
    });
  });

  // ========================================================================
  // EXPECTED SECTIONS
  // ========================================================================
  describe('getExpectedSections', () => {
    const mockPackData: Partial<PackData> = {
      company: { id: '1', name: 'Test Co' },
      site: { id: '1', name: 'Test Site' },
      obligations: [],
      evidence: [],
      incidents: [],
      permits: [],
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
    };

    it('should return sections for AUDIT_PACK', () => {
      const sections = getExpectedSections('AUDIT_PACK', mockPackData as PackData);
      expect(sections.length).toBeGreaterThan(3);
      expect(sections[0].title).toBe('Cover Page');
      expect(sections.some(s => s.title === 'Pack Provenance')).toBe(true);
    });

    it('should return sections for REGULATOR_INSPECTION', () => {
      const sections = getExpectedSections('REGULATOR_INSPECTION', mockPackData as PackData);
      expect(sections.some(s => s.title === 'Permit Conditions')).toBe(true);
      expect(sections.some(s => s.title === 'CCS Assessment')).toBe(true);
    });

    it('should return sections for BOARD_MULTI_SITE_RISK', () => {
      const sections = getExpectedSections('BOARD_MULTI_SITE_RISK', mockPackData as PackData);
      expect(sections.some(s => s.title === 'Multi-Site Risk Matrix')).toBe(true);
      expect(sections.some(s => s.title === 'Board Recommendations')).toBe(true);
    });

    it('should return sections for TENDER_CLIENT_ASSURANCE', () => {
      const sections = getExpectedSections('TENDER_CLIENT_ASSURANCE', mockPackData as PackData);
      expect(sections.some(s => s.title === 'Permit Status')).toBe(true);
      expect(sections.some(s => s.title === 'Certifications')).toBe(true);
    });

    it('should return sections for INSURER_BROKER', () => {
      const sections = getExpectedSections('INSURER_BROKER', mockPackData as PackData);
      expect(sections.some(s => s.title === 'Risk Overview')).toBe(true);
      expect(sections.some(s => s.title === 'Incident History')).toBe(true);
    });

    it('should have incrementing page numbers', () => {
      const sections = getExpectedSections('AUDIT_PACK', mockPackData as PackData);
      for (let i = 1; i < sections.length; i++) {
        expect(sections[i].page).toBeGreaterThanOrEqual(sections[i - 1].page);
      }
    });
  });

  // ========================================================================
  // BOARD RECOMMENDATIONS
  // ========================================================================
  describe('generateBoardRecommendations', () => {
    it('should generate recommendation for overdue obligations', () => {
      const packData: Partial<PackData> = {
        obligations: [
          { id: '1', status: 'OVERDUE' },
          { id: '2', status: 'COMPLETED' },
        ],
        incidents: [],
        ccsAssessment: null,
      };

      const recommendations = generateBoardRecommendations(packData as PackData);
      expect(recommendations.some(r => r.includes('overdue'))).toBe(true);
    });

    it('should generate recommendation for low evidence coverage', () => {
      const packData: Partial<PackData> = {
        obligations: [
          { id: '1', status: 'PENDING', evidence_count: 0 },
          { id: '2', status: 'PENDING', evidence_count: 0 },
          { id: '3', status: 'PENDING', evidence_count: 0 },
          { id: '4', status: 'PENDING', evidence_count: 0 },
          { id: '5', status: 'PENDING', evidence_count: 1 },
        ],
        incidents: [],
        ccsAssessment: null,
      };

      const recommendations = generateBoardRecommendations(packData as PackData);
      expect(recommendations.some(r => r.includes('evidence'))).toBe(true);
    });

    it('should generate recommendation for poor CCS band', () => {
      const packData: Partial<PackData> = {
        obligations: [{ id: '1', status: 'COMPLETED', evidence_count: 1 }],
        incidents: [],
        ccsAssessment: { id: '1', compliance_band: 'E', assessment_year: 2024 },
      };

      const recommendations = generateBoardRecommendations(packData as PackData);
      expect(recommendations.some(r => r.includes('CCS') || r.includes('band'))).toBe(true);
    });

    it('should return default recommendation when no issues', () => {
      const packData: Partial<PackData> = {
        obligations: [
          { id: '1', status: 'COMPLETED', evidence_count: 1 },
          { id: '2', status: 'COMPLETED', evidence_count: 1 },
        ],
        incidents: [],
        ccsAssessment: { id: '1', compliance_band: 'A', assessment_year: 2024 },
      };

      const recommendations = generateBoardRecommendations(packData as PackData);
      expect(recommendations.some(r => r.includes('Maintain'))).toBe(true);
    });
  });

  // ========================================================================
  // FIRST YEAR MODE
  // ========================================================================
  describe('getFirstYearModeAdjustments', () => {
    it('should return limited data flags for first year mode', () => {
      const packData: Partial<PackData> = {
        company: { id: '1', name: 'Test', adoption_mode: 'FIRST_YEAR' },
        obligations: [],
        evidence: [],
        incidents: [],
        permits: [],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      };

      const adjustments = getFirstYearModeAdjustments(packData as PackData);
      expect(adjustments.showHistoricalData).toBe(false);
      expect(adjustments.showTrends).toBe(false);
      expect(adjustments.showCCSHistory).toBe(false);
      expect(adjustments.message).toBeDefined();
    });

    it('should return limited data flags for migration mode', () => {
      const packData: Partial<PackData> = {
        company: { id: '1', name: 'Test', adoption_mode: 'MIGRATION' },
        obligations: [],
        evidence: [],
        incidents: [],
        permits: [],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      };

      const adjustments = getFirstYearModeAdjustments(packData as PackData);
      expect(adjustments.showHistoricalData).toBe(false);
    });

    it('should return full data flags for established companies', () => {
      const packData: Partial<PackData> = {
        company: { id: '1', name: 'Test', adoption_mode: 'ESTABLISHED' },
        obligations: [],
        evidence: [],
        incidents: [],
        permits: [],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      };

      const adjustments = getFirstYearModeAdjustments(packData as PackData);
      expect(adjustments.showHistoricalData).toBe(true);
      expect(adjustments.showTrends).toBe(true);
      expect(adjustments.showCCSHistory).toBe(true);
    });
  });
});
