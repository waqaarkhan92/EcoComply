# Confidence Score Components

This directory contains all 8 confidence score visualization components as specified in the design system.

## Components

1. **ConfidenceScoreBadge** - Badge display with color coding
2. **ConfidenceScoreProgressRing** - Circular progress ring visualization
3. **ConfidenceScoreTooltip** - Detailed tooltip with recommendations
4. **ConfidenceScoreAlertBanner** - Alert banner for low confidence items
5. **ConfidenceScoreInlineIndicator** - Compact inline indicator
6. **ConfidenceScoreDistributionChart** - Distribution histogram/scatter chart
7. **ConfidenceScoreHeatmap** - Multi-dimensional heatmap visualization
8. **ConfidenceScoreComparisonView** - Before/after comparison view

## Dependencies

### Required

The `ConfidenceScoreDistributionChart` component requires the `recharts` library:

```bash
npm install recharts
# or
yarn add recharts
```

All other components use only standard React and Tailwind CSS (no external dependencies).

## Usage Examples

See individual component files for detailed prop interfaces and usage examples.

## Color Coding

- **High Confidence (85-100%)**: Green (#10b981)
- **Medium Confidence (70-84%)**: Amber (#f59e0b)
- **Low Confidence (<70%)**: Red (#ef4444)

