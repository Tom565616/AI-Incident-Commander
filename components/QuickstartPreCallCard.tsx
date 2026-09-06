'use client';

import Image from 'next/image';
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  ClipboardCheck,
  Loader2,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl animate-fade-up flex-col px-5 py-6 text-left sm:px-8 lg:px-10 lg:py-8">
      <header className="flex items-center justify-between border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <Image
            src="/agora-logo-mark.svg"
            alt="Agora"
            width={34}
            height={34}
            className="h-8 w-8 object-contain"
          />
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Nora
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Incident response agent
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.75)]" />
          System ready
        </div>
      </header>

      <main className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-16">
        <section className="max-w-2xl">
          <div className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-8 bg-primary" />
            Voice-first command room
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
            Meet Nora.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Keep the team focused when production gets loud. Speak naturally,
            surface the signal, and leave the room with a clear record.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <AudioLines className="h-4 w-4 text-primary" />
              Live voice
            </span>
            <span className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Structured notes
            </span>
            <span className="inline-flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              Agora RTC
            </span>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-border bg-card/75 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                New room
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Start an incident room
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Bring your team in. Nora listens for facts, decisions,
                actions, and risks as the conversation unfolds.
              </p>
            </div>
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary sm:flex">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            <div className="bg-background/70 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Mode</p>
              <p className="mt-1 text-sm font-medium text-foreground">Live audio</p>
            </div>
            <div className="bg-background/70 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Output</p>
              <p className="mt-1 text-sm font-medium text-foreground">Incident record</p>
            </div>
          </div>

          <Button
            onClick={onStartConversation}
            disabled={isLoading}
            className="mt-6 h-12 w-full rounded-lg border border-primary bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(74,222,128,0.18)] transition-transform hover:-translate-y-0.5 hover:border-primary hover:bg-primary/90 disabled:hover:translate-y-0"
            aria-label={isLoading ? 'Starting incident room' : 'Start incident room'}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening room...
              </>
            ) : (
              <>
                Start incident room
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </Button>
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-border/70 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Human-led response / AI-organized record</span>
        <span className="text-primary/80">Nora by Agora</span>
      </footer>
    </div>
  );
}
