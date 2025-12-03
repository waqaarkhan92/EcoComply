/**
 * Waste Stream Chain of Custody API
 * Returns the complete chain from generation to disposal
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    const { streamId } = await params;

    // Get waste stream
    const { data: wasteStream, error: streamError } = await supabaseAdmin
      .from('waste_streams')
      .select('id, site_id, ewc_code, waste_description, sites(site_name)')
      .eq('id', streamId)
      .single();

    if (streamError || !wasteStream) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Waste stream not found', 404);
    }

    // Check access
    const { data: userSite } = await supabaseAdmin
      .from('user_site_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('site_id', wasteStream.site_id)
      .single();

    if (!userSite) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    // Get all consignment notes
    const { data: consignmentNotes } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, consignment_note_number, consignment_date, carrier_name, carrier_licence_number, destination_site, quantity_m3, quantity_kg, validation_status')
      .eq('waste_stream_id', streamId)
      .order('consignment_date', { ascending: true });

    const chain = [];
    
    chain.push({
      id: 'gen-' + streamId,
      type: 'GENERATION',
      name: (wasteStream.sites as any)?.site_name || 'Generation Site',
      date: consignmentNotes?.[0]?.consignment_date || new Date().toISOString(),
      status: 'VERIFIED',
      details: 'Waste generated at site',
    });

    consignmentNotes?.forEach((note) => {
      chain.push({
        id: 'carrier-' + note.id,
        type: 'CARRIER',
        name: note.carrier_name,
        date: note.consignment_date,
        status: note.validation_status === 'VALIDATED' ? 'VERIFIED' : note.validation_status === 'PENDING' ? 'PENDING' : 'BROKEN',
        details: 'Waste transported by licensed carrier',
        licence_number: note.carrier_licence_number,
        quantity: note.quantity_m3 + ' m³' + (note.quantity_kg ? ' (' + note.quantity_kg + ' kg)' : ''),
      });

      chain.push({
        id: 'dest-' + note.id,
        type: 'DESTINATION',
        name: note.destination_site,
        date: note.consignment_date,
        status: note.validation_status === 'VALIDATED' ? 'VERIFIED' : note.validation_status === 'PENDING' ? 'PENDING' : 'BROKEN',
        details: 'Final destination',
      });
    });

    const hasBreaks = chain.some(node => node.status === 'BROKEN');
    const isComplete = consignmentNotes && consignmentNotes.length > 0 && consignmentNotes.every(n => n.validation_status === 'VALIDATED');

    const chainData = {
      waste_stream_id: streamId,
      ewc_code: wasteStream.ewc_code,
      waste_description: wasteStream.waste_description,
      consignment_note_number: consignmentNotes?.[0]?.consignment_note_number || 'N/A',
      chain,
      is_complete: isComplete,
      has_breaks: hasBreaks,
      validation_status: hasBreaks ? 'BROKEN' : isComplete ? 'VALIDATED' : 'PENDING',
    };

    return successResponse(chainData);
  } catch (error: any) {
    console.error('Chain of custody error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to fetch chain of custody',
      500,
      { error: error.message }
    );
  }
}
