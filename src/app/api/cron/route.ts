import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const xClient = new TwitterApi({
  appKey: process.env.X_API_KEY || '',
  appSecret: process.env.X_API_SECRET || '',
  accessToken: process.env.X_ACCESS_TOKEN || '',
  accessSecret: process.env.X_ACCESS_SECRET || '',
}).v2;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized access', { status: 401 });
    }

    const { data: recentPosts } = await supabase
      .from('posting_history')
      .select('generated_text')
      .order('created_at', { ascending: false })
      .limit(3);

    const contextPast = recentPosts ? JSON.stringify(recentPosts) : "None";

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system: "You are a professional social media manager agent. Write one micro-post for X that is short, compelling, and under 250 characters. Do not output anything else but the raw post text.",
      messages: [{ 
        role: "user", 
        content: `Generate this week's unique post. Do not talk about these recent topics: ${contextPast}` 
      }],
    });

    const postContent = completion.content[0].type === 'text' ? completion.content[0].text.trim() : '';

    if (!postContent) throw new Error("Claude generated an empty post.");

    const tweetResponse = await xClient.tweet(postContent);

    await supabase.from('posting_history').insert([
      { platform: 'X', generated_text: postContent, status: 'success' }
    ]);

    return NextResponse.json({ success: true, tweetId: tweetResponse.data.id, text: postContent });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
