import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('posting_history')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, drafts: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
