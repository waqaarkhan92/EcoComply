/**
 * Pack Types Unit Tests
 * Validates type definitions and interfaces for pack generation
 */

import type {
  PackType,
  PackGenerationJobData,
  WatermarkOptions,
  PackData,
  Obligation,
  Evidence,
  CCSAssessment,
  Incident,
  Permit,
  ComplianceScorecard,
  FinancialImpactData,
  ELVSummaryData,
  ChangeHistoryItem,
  Section,
  PackRecord,
} from '@/lib/packs/types';

describe('Pack Types', () => {
  // ========================================================================
  // PACK TYPE ENUM
  // ========================================================================
  describe('PackType', () => {
    it('should accept valid pack types', () => {
      const validTypes: PackType[] = [
        'AUDIT_PACK',
        'REGULATOR_INSPECTION',
        'TENDER_CLIENT_ASSURANCE',
        'BOARD_MULTI_SITE_RISK',
        'INSURER_BROKER',
      ];

      // TypeScript compilation validates these are valid
      expect(validTypes.length).toBe(5);
    });
  });

  // ========================================================================
  // JOB DATA INTERFACE
  // ========================================================================
  describe('PackGenerationJobData', () => {
    it('should accept valid job data with required fields', () => {
      const jobData: PackGenerationJobData = {
        pack_id: 'test-pack-123',
        pack_type: 'AUDIT_PACK',
        company_id: 'company-456',
      };

      expect(jobData.pack_id).toBeDefined();
      expect(jobData.pack_type).toBeDefined();
      expect(jobData.company_id).toBeDefined();
    });

    it('should accept valid job data with all optional fields', () => {
      const jobData: PackGenerationJobData = {
        pack_id: 'test-pack-123',
        pack_type: 'REGULATOR_INSPECTION',
        company_id: 'company-456',
        site_id: 'site-789',
        document_id: 'doc-001',
        date_range_start: '2024-01-01',
        date_range_end: '2024-12-31',
        filters: {
          status: ['PENDING', 'OVERDUE'],
          category: ['MONITORING', 'REPORTING'],
        },
        watermark: {
          enabled: true,
          text: 'CONFIDENTIAL',
          recipientName: 'John Doe',
        },
      };

      expect(jobData.site_id).toBe('site-789');
      expect(jobData.filters?.status).toContain('PENDING');
      expect(jobData.watermark?.enabled).toBe(true);
    });
  });

  // ========================================================================
  // WATERMARK OPTIONS
  // ========================================================================
  describe('WatermarkOptions', () => {
    it('should accept minimal watermark config', () => {
      const watermark: WatermarkOptions = {
        enabled: false,
      };

      expect(watermark.enabled).toBe(false);
    });

    it('should accept full watermark config', () => {
      const watermark: WatermarkOptions = {
        enabled: true,
        text: 'CONFIDENTIAL',
        recipientName: 'Jane Smith',
        expirationDate: '2024-12-31',
        opacity: 0.15,
        angle: -30,
        fontSize: 40,
        color: '#AAAAAA',
      };

      expect(watermark.opacity).toBe(0.15);
      expect(watermark.angle).toBe(-30);
    });
  });

  // ========================================================================
  // PACK DATA
  // ========================================================================
  describe('PackData', () => {
    it('should accept valid pack data', () => {
      const packData: PackData = {
        company: {
          id: 'company-1',
          name: 'Test Company Ltd',
          company_number: '12345678',
          adoption_mode: 'FIRST_YEAR',
        },
        site: {
          id: 'site-1',
          name: 'Main Factory',
          site_type: 'MANUFACTURING',
          address: '123 Industrial Way',
        },
        obligations: [],
        evidence: [],
        incidents: [],
        permits: [],
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      expect(packData.company?.name).toBe('Test Company Ltd');
      expect(packData.obligations).toEqual([]);
    });

    it('should accept pack data with null company', () => {
      const packData: PackData = {
        company: null,
        obligations: [],
        evidence: [],
        incidents: [],
        permits: [],
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      expect(packData.company).toBeNull();
    });
  });

  // ========================================================================
  // OBLIGATION DATA
  // ========================================================================
  describe('Obligation', () => {
    it('should accept valid obligation', () => {
      const obligation: Obligation = {
        id: 'obl-1',
        original_text: 'Submit quarterly monitoring report',
        obligation_title: 'Quarterly Report',
        obligation_description: 'Submit report to EA',
        deadline_date: '2024-03-31',
        status: 'PENDING',
        category: 'MONITORING',
        confidence_score: 0.95,
        evidence_count: 3,
        sites: {
          id: 'site-1',
          name: 'Main Site',
        },
      };

      expect(obligation.status).toBe('PENDING');
      expect(obligation.evidence_count).toBe(3);
    });
  });

  // ========================================================================
  // EVIDENCE DATA
  // ========================================================================
  describe('Evidence', () => {
    it('should accept valid evidence', () => {
      const evidence: Evidence = {
        id: 'ev-1',
        file_name: 'monitoring_report_q1.pdf',
        file_type: 'application/pdf',
        file_size: 1024000,
        storage_path: '/evidence/2024/monitoring_report_q1.pdf',
        uploaded_at: '2024-01-15T10:30:00Z',
        obligation_id: 'obl-1',
        validation_status: 'VALID',
      };

      expect(evidence.file_name).toBe('monitoring_report_q1.pdf');
      expect(evidence.validation_status).toBe('VALID');
    });
  });

  // ========================================================================
  // CCS ASSESSMENT
  // ========================================================================
  describe('CCSAssessment', () => {
    it('should accept valid CCS assessment', () => {
      const ccs: CCSAssessment = {
        id: 'ccs-1',
        compliance_band: 'B',
        assessment_year: 2024,
        total_points: 15,
        non_compliance_count: 2,
      };

      expect(ccs.compliance_band).toBe('B');
      expect(ccs.assessment_year).toBe(2024);
    });
  });

  // ========================================================================
  // INCIDENT DATA
  // ========================================================================
  describe('Incident', () => {
    it('should accept valid incident', () => {
      const incident: Incident = {
        id: 'inc-1',
        incident_type: 'SPILL',
        description: 'Minor oil spill in bund area',
        severity: 'LOW',
        status: 'CLOSED',
        occurred_at: '2024-02-15T14:30:00Z',
        resolved_at: '2024-02-15T16:00:00Z',
        site_id: 'site-1',
      };

      expect(incident.severity).toBe('LOW');
      expect(incident.status).toBe('CLOSED');
    });
  });

  // ========================================================================
  // PERMIT DATA
  // ========================================================================
  describe('Permit', () => {
    it('should accept valid permit', () => {
      const permit: Permit = {
        id: 'permit-1',
        permit_number: 'EPR/AB1234CD',
        permit_type: 'ENVIRONMENTAL_PERMIT',
        regulator: 'Environment Agency',
        status: 'ACTIVE',
        expiry_date: '2029-12-31',
      };

      expect(permit.permit_number).toBe('EPR/AB1234CD');
      expect(permit.status).toBe('ACTIVE');
    });
  });

  // ========================================================================
  // COMPLIANCE SCORECARD
  // ========================================================================
  describe('ComplianceScorecard', () => {
    it('should accept valid scorecard', () => {
      const scorecard: ComplianceScorecard = {
        score: 85,
        ragStatus: 'GREEN',
        trend: 'IMPROVING',
        topActions: [
          {
            id: 'action-1',
            title: 'Submit Q1 monitoring report',
            deadline: '2024-03-31',
            urgency: 'HIGH',
          },
        ],
        evidenceCoverage: 92.5,
        obligationStats: {
          total: 50,
          completed: 42,
          overdue: 2,
        },
      };

      expect(scorecard.score).toBe(85);
      expect(scorecard.ragStatus).toBe('GREEN');
      expect(scorecard.obligationStats.completed).toBe(42);
    });
  });

  // ========================================================================
  // FINANCIAL IMPACT DATA
  // ========================================================================
  describe('FinancialImpactData', () => {
    it('should accept valid financial impact data', () => {
      const impact: FinancialImpactData = {
        totalFineExposure: 500000,
        fineBreakdown: [
          {
            obligationId: 'obl-1',
            maxFine: 250000,
            regulation: 'Environmental Permitting Regulations 2016',
            likelihood: 'MEDIUM',
          },
        ],
        remediationCost: 75000,
        insuranceRisk: 'MODERATE',
      };

      expect(impact.totalFineExposure).toBe(500000);
      expect(impact.fineBreakdown.length).toBe(1);
    });
  });

  // ========================================================================
  // ELV SUMMARY DATA
  // ========================================================================
  describe('ELVSummaryData', () => {
    it('should accept valid ELV summary', () => {
      const elv: ELVSummaryData = {
        siteId: 'site-1',
        totalParameters: 15,
        parametersWithinLimits: 14,
        parametersExceeded: 1,
        worstParameter: {
          parameterName: 'NOx',
          status: 'WARNING',
          headroomPercent: 5.2,
        },
        recentExceedances: [
          {
            parameterName: 'NOx',
            occurredAt: '2024-02-01T08:00:00Z',
            exceedancePercentage: 3.5,
          },
        ],
      };

      expect(elv.totalParameters).toBe(15);
      expect(elv.worstParameter?.parameterName).toBe('NOx');
    });
  });

  // ========================================================================
  // CHANGE HISTORY
  // ========================================================================
  describe('ChangeHistoryItem', () => {
    it('should accept valid change history item', () => {
      const change: ChangeHistoryItem = {
        id: 'change-1',
        entity_type: 'obligation',
        entity_id: 'obl-1',
        action: 'status_changed',
        changed_by: 'user@example.com',
        changed_at: '2024-02-15T10:30:00Z',
        changes: {
          status: { from: 'PENDING', to: 'COMPLETED' },
        },
      };

      expect(change.action).toBe('status_changed');
      expect(change.changes?.status?.to).toBe('COMPLETED');
    });
  });

  // ========================================================================
  // SECTION
  // ========================================================================
  describe('Section', () => {
    it('should accept valid section', () => {
      const section: Section = {
        title: 'Executive Summary',
        page: 3,
      };

      expect(section.title).toBe('Executive Summary');
      expect(section.page).toBe(3);
    });
  });

  // ========================================================================
  // PACK RECORD
  // ========================================================================
  describe('PackRecord', () => {
    it('should accept valid pack record', () => {
      const pack: PackRecord = {
        id: 'pack-1',
        company_id: 'company-1',
        site_id: 'site-1',
        pack_type: 'AUDIT_PACK',
        title: 'Q1 2024 Audit Pack',
        status: 'COMPLETED',
        storage_path: '/packs/2024/q1_audit_pack.pdf',
        generated_at: '2024-03-31T14:00:00Z',
        generated_by: 'system',
      };

      expect(pack.pack_type).toBe('AUDIT_PACK');
      expect(pack.status).toBe('COMPLETED');
    });
  });
});
