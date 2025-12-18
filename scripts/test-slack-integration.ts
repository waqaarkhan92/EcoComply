/**
 * Test Slack Integration
 * Run: npm run tsx scripts/test-slack-integration.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createSlackClient } from '../lib/integrations/slack/slack-client';
import {
  notifyDeadlineApproaching,
  notifyDeadlineOverdue,
  notifyComplianceAlert,
  notifyNewEvidence,
  SlackConfig,
} from '../lib/integrations/slack/slack-notifier';

async function testSlackIntegration() {
  console.log('Testing Slack Integration...\n');

  // Get token from environment or prompt
  const accessToken = process.env.SLACK_ACCESS_TOKEN || process.argv[2];
  const channelId = process.env.SLACK_TEST_CHANNEL_ID || process.argv[3];

  if (!accessToken) {
    console.error('❌ Error: SLACK_ACCESS_TOKEN not provided');
    console.log('Usage: npm run tsx scripts/test-slack-integration.ts <token> [channel_id]');
    console.log('Or set SLACK_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  const client = createSlackClient(accessToken);

  // Test 1: Verify Token
  console.log('Test 1: Verifying token...');
  const authTest = await client.verifyToken();
  if (authTest.ok) {
    console.log('✅ Token verified');
    console.log(`   Workspace: ${authTest.team}`);
    console.log(`   Bot User: ${authTest.user}`);
  } else {
    console.log(`❌ Token verification failed: ${authTest.error}`);
    process.exit(1);
  }

  // Test 2: Get Channels
  console.log('\nTest 2: Fetching channels...');
  const channels = await client.getChannels();
  console.log(`✅ Found ${channels.length} channels`);
  if (channels.length > 0) {
    console.log('   Available channels:');
    channels.slice(0, 5).forEach((channel) => {
      console.log(`   - ${channel.is_private ? '🔒' : '#'}${channel.name} (${channel.id})`);
    });
    if (channels.length > 5) {
      console.log(`   ... and ${channels.length - 5} more`);
    }
  }

  // If no channel specified, use the first available
  const testChannelId = channelId || channels[0]?.id;

  if (!testChannelId) {
    console.log('\n⚠️  No channel specified and no channels found');
    console.log('Please provide a channel ID or create channels in your workspace');
    process.exit(0);
  }

  const slackConfig: SlackConfig = {
    accessToken,
    defaultChannelId: testChannelId,
  };

  console.log(`\nUsing channel: ${testChannelId}`);

  // Test 3: Send Deadline Approaching Notification
  console.log('\nTest 3: Sending deadline approaching notification...');
  const deadlineResult = await notifyDeadlineApproaching(slackConfig, {
    id: 'test-obligation-1',
    title: 'Submit Annual Environmental Report',
    description: 'Annual compliance report due to EPA',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    assignee_name: 'John Doe',
  });
  if (deadlineResult.ok) {
    console.log('✅ Deadline notification sent');
  } else {
    console.log(`❌ Failed to send deadline notification: ${deadlineResult.error}`);
  }

  // Test 4: Send Overdue Alert
  console.log('\nTest 4: Sending overdue alert...');
  const overdueResult = await notifyDeadlineOverdue(slackConfig, {
    id: 'test-obligation-2',
    title: 'Water Quality Testing Report',
    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'OVERDUE',
    assignee_name: 'Jane Smith',
  });
  if (overdueResult.ok) {
    console.log('✅ Overdue alert sent');
  } else {
    console.log(`❌ Failed to send overdue alert: ${overdueResult.error}`);
  }

  // Test 5: Send Compliance Alert
  console.log('\nTest 5: Sending compliance alert...');
  const alertResult = await notifyComplianceAlert(slackConfig, {
    id: 'test-alert-1',
    title: 'Discharge Limit Exceeded',
    description: 'Wastewater discharge exceeded permitted limits by 15%',
    severity: 'high',
    created_at: new Date().toISOString(),
  });
  if (alertResult.ok) {
    console.log('✅ Compliance alert sent');
  } else {
    console.log(`❌ Failed to send compliance alert: ${alertResult.error}`);
  }

  // Test 6: Send Evidence Upload Notification
  console.log('\nTest 6: Sending evidence upload notification...');
  const evidenceResult = await notifyNewEvidence(slackConfig, {
    id: 'test-evidence-1',
    title: 'Environmental Permit',
    file_name: 'environmental-permit-2025.pdf',
    uploaded_by_name: 'Mike Johnson',
    obligation_title: 'Submit Annual Report',
    created_at: new Date().toISOString(),
  });
  if (evidenceResult.ok) {
    console.log('✅ Evidence notification sent');
  } else {
    console.log(`❌ Failed to send evidence notification: ${evidenceResult.error}`);
  }

  console.log('\n✅ All tests completed!');
  console.log('\nCheck your Slack channel for the test messages.');
}

testSlackIntegration().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
