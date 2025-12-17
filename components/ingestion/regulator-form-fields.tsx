'use client';

import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Info } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type Regulator = 'EA' | 'SEPA' | 'NRW' | 'NIEA' | 'EPA';

export interface RegulatorFormData {
  regulator: Regulator;
  // EA fields
  eaPermitNumber?: string;
  ccsBanding?: string;
  // NRW fields
  nrwPermitNumber?: string;
  welshLanguageRequired?: boolean;
  conditionTextWelsh?: string;
  // SEPA fields
  sepaRegistrationNumber?: string;
  ppcPermitNumber?: string;
  casStatus?: string;
  scottishRegion?: string;
  // NIEA fields
  nieaReference?: string;
  irishGridReference?: string;
  nieaCouncil?: string;
}

interface RegulatorFormFieldsProps {
  regulator: Regulator;
  values: Partial<RegulatorFormData>;
  onChange: (values: Partial<RegulatorFormData>) => void;
  errors?: Partial<Record<keyof RegulatorFormData, string>>;
}

// =============================================================================
// OPTIONS
// =============================================================================

const REGULATOR_OPTIONS: SelectOption[] = [
  { value: 'EA', label: 'Environment Agency (England)' },
  { value: 'NRW', label: 'Natural Resources Wales' },
  { value: 'SEPA', label: 'Scottish Environment Protection Agency' },
  { value: 'NIEA', label: 'Northern Ireland Environment Agency' },
  { value: 'EPA', label: 'Environmental Protection Agency (Ireland)' },
];

const CCS_BANDING_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select CCS Banding' },
  { value: 'A', label: 'Band A - Major installations' },
  { value: 'B', label: 'Band B - Medium installations' },
  { value: 'C', label: 'Band C - Minor installations' },
  { value: 'D', label: 'Band D - Very minor installations' },
];

const CAS_STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select CAS Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const SCOTTISH_REGION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select Region' },
  { value: 'HIGHLANDS_AND_ISLANDS', label: 'Highlands and Islands' },
  { value: 'NORTH_EAST', label: 'North East' },
  { value: 'FORTH', label: 'Forth' },
  { value: 'SOUTH_EAST', label: 'South East' },
  { value: 'WEST', label: 'West' },
  { value: 'SOUTH_WEST', label: 'South West' },
];

const NIEA_COUNCIL_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select Council' },
  { value: 'ANTRIM_AND_NEWTOWNABBEY', label: 'Antrim and Newtownabbey' },
  { value: 'ARMAGH_BANBRIDGE_CRAIGAVON', label: 'Armagh City, Banbridge and Craigavon' },
  { value: 'BELFAST', label: 'Belfast' },
  { value: 'CAUSEWAY_COAST_GLENS', label: 'Causeway Coast and Glens' },
  { value: 'DERRY_STRABANE', label: 'Derry City and Strabane' },
  { value: 'FERMANAGH_OMAGH', label: 'Fermanagh and Omagh' },
  { value: 'LISBURN_CASTLEREAGH', label: 'Lisburn and Castlereagh' },
  { value: 'MID_EAST_ANTRIM', label: 'Mid and East Antrim' },
  { value: 'MID_ULSTER', label: 'Mid Ulster' },
  { value: 'NEWRY_MOURNE_DOWN', label: 'Newry, Mourne and Down' },
  { value: 'NORTH_DOWN_ARDS', label: 'North Down and Ards' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function RegulatorFormFields({
  regulator,
  values,
  onChange,
  errors,
}: RegulatorFormFieldsProps) {
  const handleChange = (field: keyof RegulatorFormData, value: string | boolean) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Regulator Selector */}
      <Select
        label="Regulator"
        options={REGULATOR_OPTIONS}
        value={regulator}
        onChange={(value) => handleChange('regulator', value)}
        error={errors?.regulator}
      />

      {/* Jurisdiction-specific information banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {getRegulatorInfo(regulator).title}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {getRegulatorInfo(regulator).description}
            </p>
          </div>
        </div>
      </div>

      {/* EA-specific fields */}
      {regulator === 'EA' && (
        <div className="space-y-4">
          <Input
            label="EA Permit Number"
            placeholder="e.g., EPR/XX/XXXX/XX/XXX"
            value={values.eaPermitNumber || ''}
            onChange={(e) => handleChange('eaPermitNumber', e.target.value)}
            error={errors?.eaPermitNumber}
            helperText="Format: EPR/XX/XXXX/XX/XXX"
          />
          <Select
            label="CCS Banding"
            options={CCS_BANDING_OPTIONS}
            value={values.ccsBanding || ''}
            onChange={(value) => handleChange('ccsBanding', value)}
            error={errors?.ccsBanding}
            helperText="Compliance Classification Scheme banding level"
          />
        </div>
      )}

      {/* NRW-specific fields */}
      {regulator === 'NRW' && (
        <div className="space-y-4">
          <Input
            label="NRW Permit Number"
            placeholder="e.g., EPR/XX/XXXX/XX/XXX"
            value={values.nrwPermitNumber || ''}
            onChange={(e) => handleChange('nrwPermitNumber', e.target.value)}
            error={errors?.nrwPermitNumber}
            helperText="Format: EPR/XX/XXXX/XX/XXX"
          />
          <Select
            label="CCS Banding"
            options={CCS_BANDING_OPTIONS}
            value={values.ccsBanding || ''}
            onChange={(value) => handleChange('ccsBanding', value)}
            error={errors?.ccsBanding}
            helperText="Compliance Classification Scheme banding level"
          />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="welshLanguage"
                checked={values.welshLanguageRequired || false}
                onChange={(checked) => handleChange('welshLanguageRequired', checked)}
              />
              <Label htmlFor="welshLanguage" className="text-sm text-text-primary cursor-pointer">
                Welsh language support required
              </Label>
            </div>
            <p className="text-xs text-text-secondary ml-7">
              Enable this if the permit contains Welsh language conditions
            </p>
          </div>
          {values.welshLanguageRequired && (
            <Textarea
              label="Welsh Condition Text (Optional)"
              placeholder="Enter Welsh language condition text..."
              value={values.conditionTextWelsh || ''}
              onChange={(e) => handleChange('conditionTextWelsh', e.target.value)}
              helperText="Original Welsh text from the permit"
            />
          )}
        </div>
      )}

      {/* SEPA-specific fields */}
      {regulator === 'SEPA' && (
        <div className="space-y-4">
          <Input
            label="SEPA Registration Number"
            placeholder="e.g., PPC/X/XXXXXX"
            value={values.sepaRegistrationNumber || ''}
            onChange={(e) => handleChange('sepaRegistrationNumber', e.target.value)}
            error={errors?.sepaRegistrationNumber}
            helperText="Format: PPC/X/XXXXXX"
          />
          <Input
            label="PPC Permit Number (Optional)"
            placeholder="Enter PPC permit number"
            value={values.ppcPermitNumber || ''}
            onChange={(e) => handleChange('ppcPermitNumber', e.target.value)}
            error={errors?.ppcPermitNumber}
          />
          <Select
            label="CAS Status"
            options={CAS_STATUS_OPTIONS}
            value={values.casStatus || ''}
            onChange={(value) => handleChange('casStatus', value)}
            error={errors?.casStatus}
            helperText="Compliance Assessment Scheme status"
          />
          <Select
            label="Scottish Region"
            options={SCOTTISH_REGION_OPTIONS}
            value={values.scottishRegion || ''}
            onChange={(value) => handleChange('scottishRegion', value)}
            error={errors?.scottishRegion}
          />
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <p className="text-xs text-warning">
                Scotland uses "Special Waste" terminology instead of "Hazardous Waste"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NIEA-specific fields */}
      {regulator === 'NIEA' && (
        <div className="space-y-4">
          <Input
            label="NIEA Reference"
            placeholder="e.g., X/XXXX/XXXXX"
            value={values.nieaReference || ''}
            onChange={(e) => handleChange('nieaReference', e.target.value)}
            error={errors?.nieaReference}
            helperText="Format: X/XXXX/XXXXX"
          />
          <Input
            label="Irish Grid Reference"
            placeholder="e.g., J123456"
            value={values.irishGridReference || ''}
            onChange={(e) => handleChange('irishGridReference', e.target.value)}
            error={errors?.irishGridReference}
            helperText="Irish Grid Reference format"
          />
          <Select
            label="Council"
            options={NIEA_COUNCIL_OPTIONS}
            value={values.nieaCouncil || ''}
            onChange={(value) => handleChange('nieaCouncil', value)}
            error={errors?.nieaCouncil}
          />
        </div>
      )}

      {/* EPA (Ireland) fields */}
      {regulator === 'EPA' && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-text-secondary">
            EPA (Republic of Ireland) support coming soon. Currently using EA defaults.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRegulatorInfo(regulator: Regulator): { title: string; description: string } {
  const info: Record<Regulator, { title: string; description: string }> = {
    EA: {
      title: 'Environment Agency (England)',
      description: 'Environmental permits regulated under the Environmental Permitting Regulations. Uses CCS banding for compliance classification.',
    },
    NRW: {
      title: 'Natural Resources Wales',
      description: 'Environmental regulator for Wales. Supports Welsh language conditions and uses CCS banding like EA.',
    },
    SEPA: {
      title: 'Scottish Environment Protection Agency',
      description: 'Uses PPC (Pollution Prevention and Control) permits. Uses "Special Waste" terminology and CAS (Compliance Assessment Scheme).',
    },
    NIEA: {
      title: 'Northern Ireland Environment Agency',
      description: 'Environmental permits in Northern Ireland. Uses Irish Grid References for site locations.',
    },
    EPA: {
      title: 'Environmental Protection Agency (Ireland)',
      description: 'Regulator for the Republic of Ireland. Limited support currently available.',
    },
  };

  return info[regulator];
}

// =============================================================================
// REGULATOR SELECTOR
// =============================================================================

interface RegulatorSelectorProps {
  value: Regulator | null;
  onChange: (regulator: Regulator | null) => void;
  className?: string;
}

export function RegulatorSelector({ value, onChange, className }: RegulatorSelectorProps) {
  return (
    <div className={className}>
      <Select
        label="Select Regulator"
        options={REGULATOR_OPTIONS}
        value={value || ''}
        onChange={(val) => onChange(val ? val as Regulator : null)}
        placeholder="Choose the regulatory body..."
      />
    </div>
  );
}

export { REGULATOR_OPTIONS };
