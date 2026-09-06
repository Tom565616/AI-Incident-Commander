import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import {
  compileIncidentReport,
  INCIDENT_REPORT_SYSTEM_PROMPT,
  transcriptToPromptLines,
  type IncidentTranscriptTurn,
} from '@/lib/incident-report';

const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';
const SARVAM_MODEL = 'sarvam-105b-conversations';

function isTranscriptTurn(value: unknown): value is IncidentTranscriptTurn {
  if (!value || typeof value !== 'object') return false;
  const turn = value as Record<string, unknown>;
  return typeof turn.uid === 'number';
}

async function completeSarvamReport(transcript: string): Promise<string | undefined> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey || !transcript.trim()) return undefined;

  const response = await fetch(SARVAM_CHAT_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: INCIDENT_REPORT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Build the incident closeout record from this transcript:\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Sarvam report request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return body.choices?.[0]?.message?.content;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const payload = body as {
      messages?: unknown;
      agentUID?: unknown;
    };

    if (!Array.isArray(payload.messages) || !payload.messages.every(isTranscriptTurn)) {
      return NextResponse.json(
        { error: 'messages must be an array of transcript turns with numeric uid' },
        { status: 400 },
      );
    }

    const messages = payload.messages;
    const agentUID =
      typeof payload.agentUID === 'string' && payload.agentUID
        ? payload.agentUID
        : String(DEFAULT_AGENT_UID);
    const transcript = transcriptToPromptLines(messages, agentUID);

    let modelText: string | undefined;
    try {
      modelText = await completeSarvamReport(transcript);
    } catch (error) {
      console.error('Incident report LLM fallback:', error);
    }

    const report = compileIncidentReport({ messages, agentUID, modelText });
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating incident report:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate incident report',
      },
      { status: 500 },
    );
  }
}
