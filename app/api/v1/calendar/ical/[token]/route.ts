/**
 * iCal Feed API
 * GET /api/v1/calendar/ical/[token] - Get iCal feed by token
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 7
 *
 * Note: This endpoint does NOT require authentication - it uses token-based access
 * to allow calendar apps to subscribe without login.
 */

import { NextRequest, NextResponse } from 'next/server';
import { icalService } from '@/lib/services/ical-service';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const { token } = params;

  try {
    // Validate token
    const validation = await icalService.validateToken(token);

    if (!validation.valid) {
      return new NextResponse('Invalid or expired calendar token', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    let icalContent: string;

    if (validation.tokenType === 'USER' && validation.userId) {
      icalContent = await icalService.generateUserFeed(
        validation.companyId!,
        validation.userId
      );
    } else if (validation.tokenType === 'SITE' && validation.siteId) {
      icalContent = await icalService.generateSiteFeed(
        validation.companyId!,
        validation.siteId
      );
    } else {
      return new NextResponse('Invalid token configuration', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ecocomply-deadlines.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating iCal feed:', error);
    return new NextResponse('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
