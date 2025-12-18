/**
 * Slack Integration Module
 * Export all Slack integration components
 */

export { SlackClient, createSlackClient } from './slack-client';
export type { SlackChannel, SlackMessage } from './slack-client';

export {
  notifyDeadlineApproaching,
  notifyDeadlineOverdue,
  notifyComplianceAlert,
  notifyNewEvidence,
  sendCustomMessage,
} from './slack-notifier';

export type {
  SlackConfig,
  Obligation,
  ComplianceAlert,
  Evidence,
} from './slack-notifier';
