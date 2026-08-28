New-Item -ItemType Directory -Force -Path "src/app/api/publish"
@'
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const xClient = new TwitterApi({
  appKey: process.env.X_API_KEY || '',
  appSecret: process.env.X_API_SECRET || '',
  accessToken: process.env.X_ACCESS_TOKEN || '',
  accessSecret: process.env.X_ACCESS_SECRET || '',
}).v2;

export async function POST(request: Request) {
  try {
    const { id, approvedText } = await request.json();

    // 1. Tweet the approved text live to X
    const tweetResponse = await xClient.tweet(approvedText);

    // 2. Update entry status in Supabase Pro
    await supabase
      .from('posting_history')
      .update({ generated_text: approvedText, status: 'success', tweet_id: tweetResponse.data.id })
      .eq('id', id);

    return NextResponse.json({ success: true, tweetId: tweetResponse.data.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
'@ | Set-Content -Path "src/app/api/publish/route.ts"
