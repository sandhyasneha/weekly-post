import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

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
      .limit(2);

    const contextPast = recentPosts ? JSON.stringify(recentPosts) : "None";

    const systemPrompt = `You are a professional social media manager agent for NexplanIT. 
    Your job is to write a highly compelling, short micro-post for X (under 245 characters) promoting one of our two core SaaS tools.
    
    PRODUCT 1: nexplan.io
    - Focus: AI-driven, PMP-compliant Project Management and agile automation tool for IT infrastructure PMs. 
    - Key hook: Automates task generation from scope uploads. Built completely using Claude.
    
    PRODUCT 2: arch.nexplan.io
    - Focus: An AI Cloud Architect that instantly generates Terraform code, cloud architecture blueprints, and security audits for greenfield and brownfield setups.
    - Key hook: Operates like an autonomous cloud architect. Built completely using Claude.

    RULES:
    1. Alternate focus depending on history: ${contextPast}. If the last post targeted nexplan.io, focus on arch.nexplan.io this week, and vice versa.
    2. Explicitly mention the target product URL.
    3. Make it punchy, practical, and highly relevant to developers or PMs.
    4. Output ONLY the raw post text string. Do not include quotes or intros.`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: "Generate this week's unique product promo post draft." }],
    });

    const firstBlock = completion.content[0];
    const postContent = firstBlock && firstBlock.type === 'text' ? firstBlock.text.trim() : '';
    
    if (!postContent) throw new Error("Claude generated an empty post.");

    // Removed 'target_product' to bypass the missing column error
    const { data, error } = await supabase.from('posting_history').insert([
      { 
        platform: 'X', 
        generated_text: postContent, 
        status: 'pending_review'
      }
    ]).select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Failed to insert draft into Supabase.");

    return NextResponse.json({ success: true, status: 'draft_saved', id: data[0].id, text: postContent });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
