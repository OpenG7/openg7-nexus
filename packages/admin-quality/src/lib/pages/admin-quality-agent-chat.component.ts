import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { ADMIN_QUALITY_MATRIX_PORT } from '../admin-quality.tokens';
import type {
  AdminQualityChatContext,
  AdminQualityChatEvent,
  AdminQualityChatMessage,
} from '../data-access/admin-quality-matrix.service';

interface ChatDisplayMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly streaming?: boolean;
}

@Component({
  selector: 'og7-admin-quality-agent-chat',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="og7-agent-chat flex flex-col gap-2 min-h-0 h-full">
      <!-- messages -->
      <div
        #messagesContainer
        class="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 px-1 py-1"
        style="max-height: 480px;"
      >
        @if (displayMessages().length === 0) {
          <div class="flex flex-col items-center gap-3 py-8 text-center">
            <div class="text-2xl opacity-60">✦</div>
            <div class="text-xs text-slate-500 max-w-xs leading-relaxed">
              Posez une question sur la matrice qualité. L'agent peut analyser les besoins et proposer des améliorations.
            </div>
            <div class="flex flex-col gap-1.5 w-full max-w-xs mt-1">
              @for (suggestion of starterSuggestions; track suggestion) {
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-sky-300 transition-colors text-left"
                  [disabled]="pending()"
                  (click)="sendSuggestion(suggestion)"
                >{{ suggestion }}</button>
              }
            </div>
          </div>
        }
        @for (msg of displayMessages(); track $index) {
          <div class="flex gap-2" [class.flex-row-reverse]="msg.role === 'user'">
            @if (msg.role === 'assistant') {
              <div
                class="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-[9px] font-bold text-violet-600"
              >✦</div>
            }
            <div
              class="rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap"
              [class.bg-sky-600]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.rounded-tr-sm]="msg.role === 'user'"
              [class.bg-white]="msg.role === 'assistant'"
              [class.border]="msg.role === 'assistant'"
              [class.border-slate-200]="msg.role === 'assistant'"
              [class.text-slate-800]="msg.role === 'assistant'"
              [class.rounded-tl-sm]="msg.role === 'assistant'"
            >
              {{ msg.content }}
              @if (msg.streaming) {
                <span
                  class="inline-block w-1 h-3 bg-violet-400 ml-0.5 animate-pulse rounded-sm"
                ></span>
              }
            </div>
          </div>
        }
        @if (createdProposalCount() > 0) {
          <div
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700"
          >
            <span class="font-semibold">✓</span>
            <span
              >{{ createdProposalCount() }} proposition(s) créée(s) — visible dans l'onglet Propositions</span
            >
          </div>
        }
      </div>

      @if (error()) {
        <div class="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {{ error() }}
        </div>
      }

      <!-- input row -->
      <div class="flex gap-2 pt-1">
        <textarea
          #inputEl
          class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 min-h-10 max-h-32"
          rows="2"
          placeholder="Votre message..."
          [disabled]="pending()"
          (input)="onInputChange($event)"
          (keydown)="onKeydown($event)"
        ></textarea>
        <button
          type="button"
          class="self-end px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          [disabled]="pending() || !canSend()"
          (click)="send()"
        >
          @if (pending()) {
            <span class="inline-block animate-spin">↻</span>
          } @else {
            Envoyer
          }
        </button>
      </div>
    </div>
  `,
})
export class AdminQualityAgentChatComponent {
  private readonly matrixPort = inject(ADMIN_QUALITY_MATRIX_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private activeSubscription: Subscription | null = null;

  readonly context = input<AdminQualityChatContext | null>(null);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLTextAreaElement>;

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly createdProposalCount = signal(0);
  protected readonly inputText = signal('');

  private readonly messages = signal<readonly AdminQualityChatMessage[]>([]);
  private readonly streamingContent = signal<string | null>(null);

  protected readonly displayMessages = computed<readonly ChatDisplayMessage[]>(() => {
    const msgs = this.messages();
    const streaming = this.streamingContent();
    if (streaming !== null) {
      return [...msgs, { role: 'assistant', content: streaming, streaming: true }];
    }
    return msgs;
  });

  protected readonly canSend = computed(() => this.inputText().trim().length > 0);

  readonly starterSuggestions: readonly string[] = [
    'Quels besoins ont les écarts les plus importants ?',
    'Quelles prochaines actions suggères-tu pour les besoins en proof-gap ?',
    'Y a-t-il des besoins qui nécessitent un travail produit en premier ?',
  ];

  protected onInputChange(event: Event): void {
    this.inputText.set((event.target as HTMLTextAreaElement).value);
  }

  protected sendSuggestion(text: string): void {
    if (this.inputEl) {
      this.inputEl.nativeElement.value = text;
    }
    this.inputText.set(text);
    this.send();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSend() && !this.pending()) {
        this.send();
      }
    }
  }

  protected send(): void {
    const text = this.inputText().trim();
    if (!text || this.pending()) {
      return;
    }

    this.activeSubscription?.unsubscribe();
    this.inputText.set('');
    if (this.inputEl) {
      this.inputEl.nativeElement.value = '';
    }
    this.error.set(null);
    this.createdProposalCount.set(0);

    const userMessage: AdminQualityChatMessage = { role: 'user', content: text };
    this.messages.update((msgs) => [...msgs, userMessage]);
    this.streamingContent.set('');
    this.pending.set(true);

    const allMessages = this.messages();
    const ctx = this.context() ?? undefined;

    this.activeSubscription = this.matrixPort
      .chatWithAgent(allMessages, ctx)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: AdminQualityChatEvent) => this.handleEvent(event),
        error: (err: unknown) => {
          this.streamingContent.set(null);
          this.pending.set(false);
          this.error.set(err instanceof Error ? err.message : 'Une erreur est survenue.');
        },
        complete: () => this.finalizeStreaming(),
      });
  }

  private handleEvent(event: AdminQualityChatEvent): void {
    switch (event.type) {
      case 'text':
        if (typeof event.content === 'string') {
          this.streamingContent.update((prev) => (prev ?? '') + event.content);
          this.scrollToBottom();
        }
        break;
      case 'proposal-created':
        this.createdProposalCount.update((n) => n + 1);
        break;
      case 'error':
        this.error.set(event.message ?? 'Une erreur est survenue.');
        break;
    }
  }

  private finalizeStreaming(): void {
    const streamed = this.streamingContent();
    if (streamed !== null && streamed.trim().length > 0) {
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: streamed },
      ]);
    }
    this.streamingContent.set(null);
    this.pending.set(false);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
