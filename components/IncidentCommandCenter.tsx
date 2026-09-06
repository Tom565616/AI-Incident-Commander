'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lightbulb } from 'lucide-react';
import {
  extractLiveRecords,
  formatIncidentTime,
  type IncidentRecordKind,
  type IncidentTranscriptTurn,
} from '@/lib/incident-report';

const labels: Record<IncidentRecordKind, string> = {
  fact: 'Confirmed facts',
  hypothesis: 'Assumptions',
  decision: 'Decisions',
  action: 'Action items',
  risk: 'Open risks',
};

const iconFor = {
  fact: CheckCircle2,
  hypothesis: Lightbulb,
  decision: ClipboardCheck,
  action: ClipboardCheck,
  risk: AlertTriangle,
};

export function IncidentCommandCenter({
  messageList,
  agentUID,
}: {
  messageList: IncidentTranscriptTurn[];
  agentUID: string;
}) {
  const records = useMemo(
    () => extractLiveRecords(messageList, agentUID),
    [agentUID, messageList],
  );
  const groups = useMemo(
    () =>
      (Object.keys(labels) as IncidentRecordKind[]).map((kind) => ({
        kind,
        label: labels[kind],
        items: records.filter((record) => record.kind === kind),
      })),
    [records],
  );

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/40"
      aria-label="Live incident record"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Incident record</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Live evidence, not root-cause diagnosis</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Live
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
            As people speak, recognized facts, assumptions, decisions, actions, and risks will appear here.
          </div>
        ) : (
          groups.map(({ kind, label, items }) => {
            if (items.length === 0) return null;
            const Icon = iconFor[kind];
            return (
              <div key={kind}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                  <span className="text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <article key={`${item.kind}-${item.id}`} className="rounded-lg border border-border/80 bg-background/40 p-3">
                      <p className="text-sm leading-5 text-foreground">{item.text}</p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">{formatIncidentTime(item.createdAt)}</p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
