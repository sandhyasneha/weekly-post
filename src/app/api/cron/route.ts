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
    Your job is to write a highly compelling, short micro-post for X (under 240 characters) promoting one of our two core SaaS tools.
    
    PRODUCT 1: nexplan.io
    - Focus: AI-driven, PMP-compliant Project Management and agile automation tool for IT infrastructure PMs. 
    - Key hook: Automates task generation from scope uploads. Built completely using Claude.
    - Mandatory Product Keywords: scope automation, task breakdown, PMO efficiency, IT infrastructure project managers.
    - Relevant Hashtags: #ProjectManagement #PMP #Agile #Scrum #BuiltWithClaude
    
    PRODUCT 2: arch.nexplan.io
    - Focus: An AI Cloud Architect that instantly generates Terraform code, cloud architecture blueprints, and security audits for greenfield and brownfield setups.
    - Key hook: Operates like an autonomous cloud architect. Built completely using Claude.
    - Mandatory Product Keywords: infrastructure as code (IaC), cloud blueprint, Terraform generation, security audit, DevOps automation.
    - Relevant Hashtags: #Terraform #DevOps #AWS #CloudArchitecture #IaC #BuiltWithClaude

    RULES:
    1. Alternate focus depending on history: ${contextPast}. If the last post targeted nexplan.io, focus on arch.nexplan.io this week, and vice versa.
    2. Explicitly mention the target product URL (nexplan.io or arch.nexplan.io).
    3. Naturally blend in at least 2 of the specific product keywords listed above into the post narrative.
    4. Append 2 to 3 relevant hashtags from the product's list at the absolute end of the post.
    5. Stay strictly under 240 characters total so it fits nicely on X.
    6. Output ONLY the raw post text string. Do not include quotes or conversational intro text.`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: "Generate this week's unique product promo post draft with optimized keywords." }],
    });

    const firstBlock = completion.content;
    const postContent = firstBlock && firstBlock.type === 'text' ? firstBlock.text.trim() : '';
    
    if (!postContent) throw new Error("Claude generated an empty post.");

    const { data, error } = await supabase.from('posting_history').insert([
      { 
        platform: 'X', 
        generated_text: postContent, 
        status: 'pending_review'
      }
    ]).select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Failed to insert draft into Supabase.");

    return NextResponse.json({ success: true, status: 'draft_saved', id: data.id, text: postContent });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
