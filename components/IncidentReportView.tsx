'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IncidentRecordKind, IncidentReport } from '@/lib/incident-report';

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

function reportToMarkdown(report: IncidentReport) {
  const lines = [
    `# ${report.title}`,
    '',
    report.summary,
    '',
    `Customer impact: ${report.customerImpact}`,
    '',
    '## Timeline',
    ...report.timeline.map(
      (event) =>
        `- ${event.time} · ${event.speaker === 'commander' ? 'Incident Commander' : 'Team'}: ${event.text}`,
    ),
    '',
    '## Record',
    ...report.items.map(
      (item) =>
        `- [${item.kind}] ${item.text}${item.owner ? ` (owner: ${item.owner})` : ''}`,
    ),
    '',
    '## Contradictions',
    ...(report.contradictions.length
      ? report.contradictions.map((item) => `- ${item}`)
      : ['- None flagged']),
    '',
    '## Unresolved risks',
    ...(report.unresolvedRisks.length
      ? report.unresolvedRisks.map((item) => `- ${item}`)
      : ['- None flagged']),
    '',
    '## Unconfirmed assumptions',
    ...(report.unconfirmedAssumptions.length
      ? report.unconfirmedAssumptions.map((item) => `- ${item}`)
      : ['- None flagged']),
    '',
    '## Next actions',
    ...(report.nextActions.length
      ? report.nextActions.map(
          (item) => `- ${item.text}${item.owner ? ` (owner: ${item.owner})` : ''}`,
        )
      : ['- None captured']),
  ];
  return lines.join('\n');
}

export function IncidentReportView({
  report,
  isLoading,
  error,
  onStartAnother,
}: {
  report: IncidentReport | null;
  isLoading: boolean;
  error: string | null;
  onStartAnother: () => void;
}) {
  const groups = useMemo(() => {
    if (!report) return [];
    return (Object.keys(labels) as IncidentRecordKind[]).map((kind) => ({
      kind,
      label: labels[kind],
      items: report.items.filter((item) => item.kind === kind),
    }));
  }, [report]);

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report));
    } catch (error) {
      console.error('Failed to copy incident report:', error);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Post-call record
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {report?.title ?? 'Incident closeout'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Organized from the live transcript. This is an audit-ready record of
            human reasoning, not an automatic root-cause diagnosis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!report}
          >
            Copy report
          </Button>
          <Button size="sm" onClick={onStartAnother}>
            Start another incident room
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Building the incident report from the meeting transcript...
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-16">
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {report && (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-border bg-card/40 p-4 md:col-span-2">
                  <h2 className="text-sm font-semibold text-foreground">Summary</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground">{report.summary}</p>
                </article>
                <article className="rounded-2xl border border-border bg-card/40 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Customer impact</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {report.customerImpact}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Source: {report.source === 'llm' ? 'Sarvam closeout' : 'Transcript heuristic'}
                  </p>
                </article>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-2xl border border-border bg-card/40 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Live timeline</h2>
                  <div className="mt-3 space-y-3">
                    {report.timeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No transcript turns were captured during this room.
                      </p>
                    ) : (
                      report.timeline.map((event, index) => (
                        <div
                          key={`${event.time}-${index}`}
                          className="border-l border-border pl-3"
                        >
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {event.time} ·{' '}
                            {event.speaker === 'commander'
                              ? 'Incident Commander'
                              : 'Team'}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-foreground">
                            {event.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <div className="space-y-4">
                  {groups.map(({ kind, label, items }) => {
                    if (items.length === 0) return null;
                    const Icon = iconFor[kind];
                    return (
                      <article
                        key={kind}
                        className="rounded-2xl border border-border bg-card/40 p-4"
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {label}
                          <span className="text-muted-foreground">{items.length}</span>
                        </div>
                        <div className="space-y-2">
                          {items.map((item, index) => (
                            <p
                              key={`${kind}-${index}`}
                              className="text-sm leading-5 text-foreground"
                            >
                              {item.text}
                              {item.owner ? (
                                <span className="block text-[11px] text-muted-foreground">
                                  Owner: {item.owner}
                                </span>
                              ) : null}
                            </p>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-border bg-card/40 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Contradictions</h2>
                  <ul className="mt-2 space-y-2 text-sm leading-5 text-foreground">
                    {(report.contradictions.length
                      ? report.contradictions
                      : ['None flagged from this transcript.']
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-border bg-card/40 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Unresolved risks</h2>
                  <ul className="mt-2 space-y-2 text-sm leading-5 text-foreground">
                    {(report.unresolvedRisks.length
                      ? report.unresolvedRisks
                      : ['None flagged from this transcript.']
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-border bg-card/40 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Next actions</h2>
                  <ul className="mt-2 space-y-2 text-sm leading-5 text-foreground">
                    {(report.nextActions.length
                      ? report.nextActions.map(
                          (item) =>
                            `${item.text}${item.owner ? ` — ${item.owner}` : ''}`,
                        )
                      : ['None captured.']
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
