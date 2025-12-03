'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Info, AlertCircle } from 'lucide-react';

interface BusinessDayAdjustmentProps {
  siteId: string;
  currentGracePeriod: number;
  onUpdate: (gracePeriod: number, businessDayRules: BusinessDayRules) => void;
}

interface BusinessDayRules {
  exclude_weekends: boolean;
  exclude_holidays: boolean;
  custom_holidays: string[];
  business_hours_start?: string;
  business_hours_end?: string;
}

export default function BusinessDayAdjustment({
  siteId,
  currentGracePeriod,
  onUpdate,
}: BusinessDayAdjustmentProps) {
  const [gracePeriod, setGracePeriod] = useState(currentGracePeriod);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');

  const handleAddHoliday = () => {
    if (newHoliday && !customHolidays.includes(newHoliday)) {
      setCustomHolidays([...customHolidays, newHoliday]);
      setNewHoliday('');
    }
  };

  const handleRemoveHoliday = (holiday: string) => {
    setCustomHolidays(customHolidays.filter(h => h !== holiday));
  };

  const handleSave = () => {
    onUpdate(gracePeriod, {
      exclude_weekends: excludeWeekends,
      exclude_holidays: excludeHolidays,
      custom_holidays: customHolidays,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Day Adjustment</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure how deadlines are calculated based on business days
          </p>
        </div>
        <Calendar className="h-6 w-6 text-gray-400" />
      </div>

      {/* Grace Period */}
      <div>
        <Label htmlFor="grace_period">Grace Period (Days)</Label>
        <div className="mt-2">
          <Input
            id="grace_period"
            type="number"
            min="0"
            value={gracePeriod}
            onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
            className="w-32"
          />
          <p className="text-xs text-gray-500 mt-1">
            Additional days added to calculated deadlines
          </p>
        </div>
      </div>

      {/* Weekend Exclusion */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="exclude_weekends"
          checked={excludeWeekends}
          onChange={(e) => setExcludeWeekends(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="exclude_weekends" className="cursor-pointer">
            Exclude Weekends
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Saturdays and Sundays will not count toward deadline calculations
          </p>
        </div>
      </div>

      {/* Holiday Exclusion */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="exclude_holidays"
          checked={excludeHolidays}
          onChange={(e) => setExcludeHolidays(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="exclude_holidays" className="cursor-pointer">
            Exclude Public Holidays
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            UK public holidays will not count toward deadline calculations
          </p>
        </div>
      </div>

      {/* Custom Holidays */}
      {excludeHolidays && (
        <div>
          <Label>Custom Holidays</Label>
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <Input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                placeholder="Add custom holiday"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddHoliday}
                disabled={!newHoliday}
              >
                Add
              </Button>
            </div>
            {customHolidays.length > 0 && (
              <div className="space-y-1">
                {customHolidays.map((holiday) => (
                  <div
                    key={holiday}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">
                      {new Date(holiday).toLocaleDateString()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHoliday(holiday)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900 mb-1">
              Calculation Preview
            </div>
            <div className="text-xs text-blue-800">
              Example: A 30-day deadline starting on a Friday would be calculated as:
              <br />
              {excludeWeekends
                ? '30 business days (excluding weekends)'
                : '30 calendar days'}
              {excludeHolidays && ' + excluding holidays'}
              {gracePeriod > 0 && ` + ${gracePeriod} grace period days`}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Business Day Settings</Button>
      </div>
    </div>
  );
}

