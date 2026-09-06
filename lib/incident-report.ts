export type IncidentRecordKind =
  | 'fact'
  | 'hypothesis'
  | 'decision'
  | 'action'
  | 'risk';

export type IncidentTranscriptTurn = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};

export type IncidentTimelineEvent = {
  time: string;
  speaker: 'team' | 'commander';
  text: string;
};

export type IncidentClassifiedItem = {
  kind: IncidentRecordKind;
  text: string;
  owner?: string;
  time?: string;
  confirmed?: boolean;
};

export type IncidentReport = {
  title: string;
  summary: string;
  customerImpact: string;
  timeline: IncidentTimelineEvent[];
  items: IncidentClassifiedItem[];
  contradictions: string[];
  unresolvedRisks: string[];
  unconfirmedAssumptions: string[];
  nextActions: { text: string; owner?: string }[];
  source: 'llm' | 'heuristic';
};

const KIND_PATTERNS: Record<IncidentRecordKind, RegExp> = {
  fact: /\b(confirmed|observed|seeing|shows|metrics indicate|is down|is failing|error rate|latency is)\b/i,
  hypothesis:
    /\b(maybe|might|could|likely|suspect|think|hypothesis|possibly)\b/i,
  decision:
    /\b(decided|decision|agreed|we will|let's|lets|rollback|roll back|approved)\b/i,
  action:
    /\b(action item|owner|investigate|check|verify|please|can you|follow up|take a look)\b/i,
  risk: /\b(risk|unknown|unclear|not sure|blocked|impact|customer|regression|unresolved)\b/i,
};

const KIND_ORDER: IncidentRecordKind[] = [
  'fact',
  'hypothesis',
  'decision',
  'action',
  'risk',
];

export function formatIncidentTime(createdAt?: number) {
  if (!createdAt) return 'during call';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

export function extractLiveRecords(
  messages: IncidentTranscriptTurn[],
  agentUID: string,
) {
  const seen = new Set<string>();
  const records: Array<IncidentClassifiedItem & { id: string; createdAt?: number }> =
    [];

  messages
    .filter((message) => String(message.uid) !== agentUID)
    .forEach((message, index) => {
      const text = message.text?.trim();
      if (!text) return;
      const kind = KIND_ORDER.find((key) => KIND_PATTERNS[key].test(text));
      if (!kind) return;
      const fingerprint = `${kind}:${text.toLowerCase()}`;
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      records.push({
        id: String(message.turn_id ?? index),
        kind,
        text,
        createdAt: message.createdAt,
        time: formatIncidentTime(message.createdAt),
      });
    });

  return records.slice(-18).reverse();
}

function classifyText(text: string): IncidentRecordKind | null {
  return KIND_ORDER.find((key) => KIND_PATTERNS[key].test(text)) ?? null;
}

export function buildHeuristicReport(
  messages: IncidentTranscriptTurn[],
  agentUID: string,
): IncidentReport {
  const timeline: IncidentTimelineEvent[] = messages
    .filter((message) => message.text?.trim())
    .map((message) => ({
      time: formatIncidentTime(message.createdAt),
      speaker: String(message.uid) === agentUID ? 'commander' : 'team',
      text: message.text!.trim(),
    }));

  const teamTurns = messages.filter(
    (message) => String(message.uid) !== agentUID && message.text?.trim(),
  );
  const items: IncidentClassifiedItem[] = [];
  const seen = new Set<string>();

  for (const message of teamTurns) {
    const text = message.text!.trim();
    const kind = classifyText(text);
    if (!kind) continue;
    const fingerprint = `${kind}:${text.toLowerCase()}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    items.push({
      kind,
      text,
      time: formatIncidentTime(message.createdAt),
    });
  }

  const unresolvedRisks = items
    .filter((item) => item.kind === 'risk')
    .map((item) => item.text);
  const unconfirmedAssumptions = items
    .filter((item) => item.kind === 'hypothesis')
    .map((item) => item.text);
  const nextActions = items
    .filter((item) => item.kind === 'action' || item.kind === 'decision')
    .map((item) => ({ text: item.text }));

  const facts = items.filter((item) => item.kind === 'fact');
  const summaryParts = [
    facts.length
      ? `Captured ${facts.length} confirmed fact${facts.length === 1 ? '' : 's'}.`
      : 'No confirmed facts were classified from the transcript.',
    unconfirmedAssumptions.length
      ? `${unconfirmedAssumptions.length} assumption${unconfirmedAssumptions.length === 1 ? '' : 's'} remain unconfirmed.`
      : 'No unconfirmed assumptions were flagged.',
    unresolvedRisks.length
      ? `${unresolvedRisks.length} unresolved risk${unresolvedRisks.length === 1 ? '' : 's'} remain open.`
      : 'No open risks were flagged.',
  ];

  return {
    title: 'Incident closeout record',
    summary: summaryParts.join(' '),
    customerImpact:
      items.find((item) => /impact|customer|error rate|latency|down/i.test(item.text))
        ?.text ?? 'Customer impact was not stated as a confirmed fact.',
    timeline,
    items,
    contradictions: [],
    unresolvedRisks,
    unconfirmedAssumptions,
    nextActions,
    source: 'heuristic',
  };
}

export function transcriptToPromptLines(
  messages: IncidentTranscriptTurn[],
  agentUID: string,
) {
  return messages
    .filter((message) => message.text?.trim())
    .slice(-80)
    .map((message, index) => {
      const speaker =
        String(message.uid) === agentUID ? 'Incident Commander' : 'Team';
      const time = formatIncidentTime(message.createdAt);
      const text = message.text!.trim().slice(0, 800);
      return `${index + 1}. [${time}] ${speaker}: ${text}`;
    })
    .join('\n');
}

const emptyReport = (): IncidentReport => ({
  title: 'Incident closeout record',
  summary: 'The call ended with no usable transcript.',
  customerImpact: 'Not stated.',
  timeline: [],
  items: [],
  contradictions: [],
  unresolvedRisks: [],
  unconfirmedAssumptions: [],
  nextActions: [],
  source: 'heuristic',
});

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function asKind(value: unknown): IncidentRecordKind | null {
  return KIND_ORDER.includes(value as IncidentRecordKind)
    ? (value as IncidentRecordKind)
    : null;
}

export function normalizeIncidentReport(
  raw: unknown,
  fallback: IncidentReport,
): IncidentReport {
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Record<string, unknown>;

  const items: IncidentClassifiedItem[] = Array.isArray(data.items)
    ? data.items.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const item = entry as Record<string, unknown>;
        const kind = asKind(item.kind);
        const text = typeof item.text === 'string' ? item.text.trim() : '';
        if (!kind || !text) return [];
        return [
          {
            kind,
            text,
            owner: typeof item.owner === 'string' ? item.owner : undefined,
            time: typeof item.time === 'string' ? item.time : undefined,
            confirmed:
              typeof item.confirmed === 'boolean' ? item.confirmed : undefined,
          },
        ];
      })
    : fallback.items;

  const timeline: IncidentTimelineEvent[] = Array.isArray(data.timeline)
    ? data.timeline.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const event = entry as Record<string, unknown>;
        const text = typeof event.text === 'string' ? event.text.trim() : '';
        if (!text) return [];
        return [
          {
            time: typeof event.time === 'string' ? event.time : 'during call',
            speaker: event.speaker === 'commander' ? 'commander' : 'team',
            text,
          },
        ];
      })
    : fallback.timeline;

  const nextActions = Array.isArray(data.nextActions)
    ? data.nextActions.flatMap((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          return [{ text: entry.trim() }];
        }
        if (!entry || typeof entry !== 'object') return [];
        const action = entry as Record<string, unknown>;
        const text = typeof action.text === 'string' ? action.text.trim() : '';
        if (!text) return [];
        return [
          {
            text,
            owner: typeof action.owner === 'string' ? action.owner : undefined,
          },
        ];
      })
    : fallback.nextActions;

  return {
    title:
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : fallback.title,
    summary:
      typeof data.summary === 'string' && data.summary.trim()
        ? data.summary.trim()
        : fallback.summary,
    customerImpact:
      typeof data.customerImpact === 'string' && data.customerImpact.trim()
        ? data.customerImpact.trim()
        : fallback.customerImpact,
    timeline: timeline.length ? timeline : fallback.timeline,
    items: items.length ? items : fallback.items,
    contradictions: asStringArray(data.contradictions),
    unresolvedRisks: asStringArray(data.unresolvedRisks).length
      ? asStringArray(data.unresolvedRisks)
      : fallback.unresolvedRisks,
    unconfirmedAssumptions: asStringArray(data.unconfirmedAssumptions).length
      ? asStringArray(data.unconfirmedAssumptions)
      : fallback.unconfirmedAssumptions,
    nextActions: nextActions.length ? nextActions : fallback.nextActions,
    source: 'llm',
  };
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Model response did not contain JSON');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export const INCIDENT_REPORT_SYSTEM_PROMPT = `You are the post-call recorder for an Incident Commander. Organize what humans said. Never invent root cause, metrics, owners, or events that are not in the transcript.

Return JSON only with this shape:
{
  "title": "short incident title",
  "summary": "4-8 sentence closeout of what was discussed",
  "customerImpact": "impact as stated, or that it was not stated",
  "timeline": [{"time": "spoken or inferred clock time", "speaker": "team" | "commander", "text": "what was said, condensed"}],
  "items": [{"kind": "fact"|"hypothesis"|"decision"|"action"|"risk", "text": "...", "owner": "optional", "time": "optional", "confirmed": true}],
  "contradictions": ["conflicting claims"],
  "unresolvedRisks": ["open risks"],
  "unconfirmedAssumptions": ["hypotheses still unproven"],
  "nextActions": [{"text": "...", "owner": "optional"}]
}

Rules:
- kind "fact" only for confirmed observations.
- kind "hypothesis" for guesses, theories, and unproven root-cause ideas.
- Mark confirmed false unless the transcript clearly confirms it.
- If information is missing, say so. Do not fill gaps.`;

export function compileIncidentReport(input: {
  messages: IncidentTranscriptTurn[];
  agentUID: string;
  modelText?: string;
}): IncidentReport {
  const fallback =
    input.messages.some((message) => message.text?.trim())
      ? buildHeuristicReport(input.messages, input.agentUID)
      : emptyReport();

  if (!input.modelText) return fallback;

  try {
    return normalizeIncidentReport(parseModelJson(input.modelText), fallback);
  } catch {
    return fallback;
  }
}
