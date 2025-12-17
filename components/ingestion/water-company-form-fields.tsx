'use client';

import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info, Calculator } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type WaterCompany =
  | 'THAMES_WATER'
  | 'SEVERN_TRENT'
  | 'UNITED_UTILITIES'
  | 'ANGLIAN_WATER'
  | 'YORKSHIRE_WATER'
  | 'NORTHUMBRIAN_WATER'
  | 'SOUTHERN_WATER'
  | 'SOUTH_WEST_WATER'
  | 'WESSEX_WATER'
  | 'DWR_CYMRU'
  | 'SCOTTISH_WATER';

export interface MogdenFormulaValues {
  os: number | null; // Settled COD of effluent (mg/l)
  ot: number | null; // Standard settled COD (mg/l)
  ss: number | null; // Suspended solids of effluent (mg/l)
  st: number | null; // Standard suspended solids (mg/l)
  v: number | null;  // Volume charge (p/m3)
  b: number | null;  // Biological charge (p/m3)
  s: number | null;  // Sludge charge (p/m3)
  r: number | null;  // Reception charge (p/m3)
}

export interface WaterCompanyFormData {
  waterCompany: WaterCompany;
  consentReference?: string;
  // Thames Water Mogden formula
  mogdenValues?: MogdenFormulaValues;
  hasMogdenFormula?: boolean;
  // Welsh Water (Dwr Cymru)
  welshLanguageRequired?: boolean;
  conditionTextWelsh?: string;
  // Scottish Water
  scottishRegion?: string;
  // Common fields
  dischargePoint?: string;
  maxDailyVolume?: number;
  samplingFrequency?: string;
}

interface WaterCompanyFormFieldsProps {
  waterCompany: WaterCompany;
  values: Partial<WaterCompanyFormData>;
  onChange: (values: Partial<WaterCompanyFormData>) => void;
  errors?: Partial<Record<string, string>>;
}

// =============================================================================
// OPTIONS
// =============================================================================

const WATER_COMPANY_OPTIONS: SelectOption[] = [
  { value: 'THAMES_WATER', label: 'Thames Water' },
  { value: 'SEVERN_TRENT', label: 'Severn Trent Water' },
  { value: 'UNITED_UTILITIES', label: 'United Utilities' },
  { value: 'ANGLIAN_WATER', label: 'Anglian Water' },
  { value: 'YORKSHIRE_WATER', label: 'Yorkshire Water' },
  { value: 'NORTHUMBRIAN_WATER', label: 'Northumbrian Water' },
  { value: 'SOUTHERN_WATER', label: 'Southern Water' },
  { value: 'SOUTH_WEST_WATER', label: 'South West Water' },
  { value: 'WESSEX_WATER', label: 'Wessex Water' },
  { value: 'DWR_CYMRU', label: 'Dwr Cymru Welsh Water' },
  { value: 'SCOTTISH_WATER', label: 'Scottish Water' },
];

const SCOTTISH_REGION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select Region' },
  { value: 'HIGHLANDS_AND_ISLANDS', label: 'Highlands and Islands' },
  { value: 'NORTH_EAST', label: 'North East' },
  { value: 'CENTRAL', label: 'Central' },
  { value: 'SOUTH_EAST', label: 'South East' },
  { value: 'SOUTH_WEST', label: 'South West' },
];

const SAMPLING_FREQUENCY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select Frequency' },
  { value: 'CONTINUOUS', label: 'Continuous' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function WaterCompanyFormFields({
  waterCompany,
  values,
  onChange,
  errors,
}: WaterCompanyFormFieldsProps) {
  const handleChange = (field: string, value: string | boolean | number | null) => {
    onChange({ ...values, [field]: value });
  };

  const handleMogdenChange = (field: keyof MogdenFormulaValues, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const currentMogden = values.mogdenValues || {
      os: null, ot: null, ss: null, st: null, v: null, b: null, s: null, r: null
    };
    onChange({
      ...values,
      mogdenValues: { ...currentMogden, [field]: numValue }
    });
  };

  const calculateMogdenCharge = (): number | null => {
    const m = values.mogdenValues;
    if (!m || !m.v || !m.b || !m.s || !m.os || !m.ot || !m.ss || !m.st) return null;

    // Mogden Formula: C = R + V + (Ot/Os * B) + (St/Ss * S)
    const bioCost = (m.os / m.ot) * m.b;
    const sludgeCost = (m.ss / m.st) * m.s;
    const r = m.r || 0;

    return r + m.v + bioCost + sludgeCost;
  };

  const mogdenCharge = calculateMogdenCharge();

  return (
    <div className="space-y-6">
      {/* Water Company Selector */}
      <Select
        label="Water Company"
        options={WATER_COMPANY_OPTIONS}
        value={waterCompany}
        onChange={(value) => handleChange('waterCompany', value)}
        error={errors?.waterCompany}
      />

      {/* Company-specific information banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {getWaterCompanyInfo(waterCompany).title}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {getWaterCompanyInfo(waterCompany).description}
            </p>
          </div>
        </div>
      </div>

      {/* Common Trade Effluent Fields */}
      <div className="space-y-4">
        <Input
          label="Trade Effluent Consent Reference"
          placeholder="Enter consent reference number"
          value={values.consentReference || ''}
          onChange={(e) => handleChange('consentReference', e.target.value)}
          error={errors?.consentReference}
        />
        <Input
          label="Discharge Point"
          placeholder="e.g., Manhole MH123"
          value={values.dischargePoint || ''}
          onChange={(e) => handleChange('dischargePoint', e.target.value)}
          error={errors?.dischargePoint}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Max Daily Volume (m3)"
            type="number"
            placeholder="e.g., 100"
            value={values.maxDailyVolume?.toString() || ''}
            onChange={(e) => handleChange('maxDailyVolume', e.target.value ? parseFloat(e.target.value) : null)}
            error={errors?.maxDailyVolume}
          />
          <Select
            label="Sampling Frequency"
            options={SAMPLING_FREQUENCY_OPTIONS}
            value={values.samplingFrequency || ''}
            onChange={(value) => handleChange('samplingFrequency', value)}
            error={errors?.samplingFrequency}
          />
        </div>
      </div>

      {/* Thames Water Mogden Formula */}
      {waterCompany === 'THAMES_WATER' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="hasMogden"
              checked={values.hasMogdenFormula || false}
              onChange={(checked) => handleChange('hasMogdenFormula', checked)}
            />
            <Label htmlFor="hasMogden" className="text-sm text-text-primary cursor-pointer">
              Trade effluent charges use Mogden Formula
            </Label>
          </div>

          {values.hasMogdenFormula && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h4 className="font-medium text-text-primary">Mogden Formula Parameters</h4>
              </div>

              <div className="text-xs text-text-secondary mb-4 p-2 bg-white rounded border">
                Formula: C = R + V + (Os/Ot x B) + (Ss/St x S)
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Os - Settled COD of effluent (mg/l)"
                  type="number"
                  placeholder="e.g., 600"
                  value={values.mogdenValues?.os?.toString() || ''}
                  onChange={(e) => handleMogdenChange('os', e.target.value)}
                />
                <Input
                  label="Ot - Standard settled COD (mg/l)"
                  type="number"
                  placeholder="e.g., 480"
                  value={values.mogdenValues?.ot?.toString() || ''}
                  onChange={(e) => handleMogdenChange('ot', e.target.value)}
                />
                <Input
                  label="Ss - Suspended solids (mg/l)"
                  type="number"
                  placeholder="e.g., 350"
                  value={values.mogdenValues?.ss?.toString() || ''}
                  onChange={(e) => handleMogdenChange('ss', e.target.value)}
                />
                <Input
                  label="St - Standard suspended solids (mg/l)"
                  type="number"
                  placeholder="e.g., 350"
                  value={values.mogdenValues?.st?.toString() || ''}
                  onChange={(e) => handleMogdenChange('st', e.target.value)}
                />
                <Input
                  label="V - Volume charge (p/m3)"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 45.67"
                  value={values.mogdenValues?.v?.toString() || ''}
                  onChange={(e) => handleMogdenChange('v', e.target.value)}
                />
                <Input
                  label="B - Biological charge (p/m3)"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 32.45"
                  value={values.mogdenValues?.b?.toString() || ''}
                  onChange={(e) => handleMogdenChange('b', e.target.value)}
                />
                <Input
                  label="S - Sludge charge (p/m3)"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 28.90"
                  value={values.mogdenValues?.s?.toString() || ''}
                  onChange={(e) => handleMogdenChange('s', e.target.value)}
                />
                <Input
                  label="R - Reception charge (p/m3)"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 15.00"
                  value={values.mogdenValues?.r?.toString() || ''}
                  onChange={(e) => handleMogdenChange('r', e.target.value)}
                />
              </div>

              {mogdenCharge !== null && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    Estimated Charge: {mogdenCharge.toFixed(2)} p/m3
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dwr Cymru Welsh Water */}
      {waterCompany === 'DWR_CYMRU' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="welshLanguage"
              checked={values.welshLanguageRequired || false}
              onChange={(checked) => handleChange('welshLanguageRequired', checked)}
            />
            <Label htmlFor="welshLanguage" className="text-sm text-text-primary cursor-pointer">
              Welsh language conditions present
            </Label>
          </div>

          {values.welshLanguageRequired && (
            <Textarea
              label="Welsh Condition Text (Optional)"
              placeholder="Enter Welsh language condition text..."
              value={values.conditionTextWelsh || ''}
              onChange={(e) => handleChange('conditionTextWelsh', e.target.value)}
              helperText="Original Welsh text from the consent"
            />
          )}
        </div>
      )}

      {/* Scottish Water */}
      {waterCompany === 'SCOTTISH_WATER' && (
        <div className="space-y-4">
          <Select
            label="Scottish Water Region"
            options={SCOTTISH_REGION_OPTIONS}
            value={values.scottishRegion || ''}
            onChange={(value) => handleChange('scottishRegion', value)}
            error={errors?.scottishRegion}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getWaterCompanyInfo(company: WaterCompany): { title: string; description: string } {
  const info: Record<WaterCompany, { title: string; description: string }> = {
    THAMES_WATER: {
      title: 'Thames Water',
      description: 'Uses the Mogden Formula for trade effluent charging. Covers London and Thames Valley.',
    },
    SEVERN_TRENT: {
      title: 'Severn Trent Water',
      description: 'Covers the Midlands region of England.',
    },
    UNITED_UTILITIES: {
      title: 'United Utilities',
      description: 'Covers North West England including Greater Manchester and Liverpool.',
    },
    ANGLIAN_WATER: {
      title: 'Anglian Water',
      description: 'Covers East Anglia and surrounding areas.',
    },
    YORKSHIRE_WATER: {
      title: 'Yorkshire Water',
      description: 'Covers Yorkshire and parts of the North of England.',
    },
    NORTHUMBRIAN_WATER: {
      title: 'Northumbrian Water',
      description: 'Covers North East England including Newcastle and Durham.',
    },
    SOUTHERN_WATER: {
      title: 'Southern Water',
      description: 'Covers Kent, Sussex, Hampshire and Isle of Wight.',
    },
    SOUTH_WEST_WATER: {
      title: 'South West Water',
      description: 'Covers Devon, Cornwall and parts of Dorset and Somerset.',
    },
    WESSEX_WATER: {
      title: 'Wessex Water',
      description: 'Covers Somerset, Dorset, Wiltshire and parts of Gloucestershire.',
    },
    DWR_CYMRU: {
      title: 'Dwr Cymru Welsh Water',
      description: 'Covers Wales and parts of Herefordshire. Supports Welsh language conditions.',
    },
    SCOTTISH_WATER: {
      title: 'Scottish Water',
      description: 'Public water utility serving the whole of Scotland.',
    },
  };

  return info[company];
}

// =============================================================================
// WATER COMPANY SELECTOR
// =============================================================================

interface WaterCompanySelectorProps {
  value: WaterCompany | null;
  onChange: (company: WaterCompany | null) => void;
  className?: string;
}

export function WaterCompanySelector({ value, onChange, className }: WaterCompanySelectorProps) {
  return (
    <div className={className}>
      <Select
        label="Select Water Company"
        options={WATER_COMPANY_OPTIONS}
        value={value || ''}
        onChange={(val) => onChange(val ? val as WaterCompany : null)}
        placeholder="Choose the water company..."
      />
    </div>
  );
}

export { WATER_COMPANY_OPTIONS };
