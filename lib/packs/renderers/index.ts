/**
 * Pack Renderers Index
 * Exports all pack type renderers and common rendering functions
 */

// Common renderers (cover page, TOC, executive summary, provenance)
export {
  renderCoverPage,
  renderTableOfContents,
  renderExecutiveSummary,
  renderProvenance,
} from './common';

// Pack type-specific renderers
export { renderAuditPack } from './audit-pack';
export { renderRegulatorPack } from './regulator-pack';
export { renderBoardPack } from './board-pack';
export { renderTenderPack } from './tender-pack';
export { renderInsurerPack } from './insurer-pack';
