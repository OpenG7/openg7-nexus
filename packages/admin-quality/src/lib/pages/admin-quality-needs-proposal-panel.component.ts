import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

import type {
  AdminQualityNeedProposal,
  AdminQualityNeedProposalStatus,
  AdminQualityNeedProposalType,
  AdminQualityNeedProposalsSnapshot,
} from '../data-access/admin-quality-matrix.service';

export interface AdminQualityNeedProposalAction {
  readonly proposalId: string;
  readonly status: 'accepted' | 'rejected';
}

type ProposalFilterStatus = 'all' | 'proposed' | 'accepted' | 'rejected';

interface ProposalDisplayItem {
  readonly proposal: AdminQualityNeedProposal;
  readonly typeLabel: string;
  readonly confidenceLabel: string;
  readonly statusLabel: string;
  readonly statusTone: 'neutral' | 'success' | 'error' | 'muted';
  readonly isActionable: boolean;
  readonly diffLines: readonly string[];
}

function proposalTypeLabel(type: AdminQualityNeedProposalType): string {
  switch (type) {
    case 'add-source-ref':
      return 'Ajouter source';
    case 'create-entry':
      return 'Creer entree';
    case 'mark-stale':
      return 'Marquer obsolete';
  }
}

function proposalConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'Haute';
    case 'medium':
      return 'Moyenne';
    default:
      return 'Basse';
  }
}

function proposalStatusLabel(status: AdminQualityNeedProposalStatus): string {
  switch (status) {
    case 'accepted':
      return 'Acceptee';
    case 'rejected':
      return 'Rejetee';
    case 'superseded':
      return 'Remplacee';
    default:
      return 'Proposee';
  }
}

function proposalStatusTone(
  status: AdminQualityNeedProposalStatus,
): 'neutral' | 'success' | 'error' | 'muted' {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'rejected':
      return 'error';
    case 'superseded':
      return 'muted';
    default:
      return 'neutral';
  }
}

function buildDiffLines(proposal: AdminQualityNeedProposal): string[] {
  const payload = proposal.payload;
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (proposal.type === 'add-source-ref') {
    const ref = payload['sourceRef'] as Record<string, unknown> | null | undefined;
    if (!ref) {
      return [];
    }
    return [
      `+ type: ${ref['type'] ?? '?'}`,
      ref['path'] ? `+ path: ${ref['path']}` : null,
      ref['value'] ? `+ value: ${ref['value']}` : null,
      ref['label'] ? `+ label: ${ref['label']}` : null,
      ref['matchReason'] ? `  matchReason: ${ref['matchReason']}` : null,
    ].filter((line): line is string => line !== null);
  }

  if (proposal.type === 'create-entry') {
    const candidate = payload['candidateEntry'] as Record<string, unknown> | null | undefined;
    if (!candidate) {
      return [];
    }
    return [
      `+ id: ${candidate['id'] ?? '?'}`,
      `+ domain: ${candidate['domain'] ?? '?'}`,
      `+ need: ${candidate['need'] ?? '?'}`,
    ];
  }

  if (proposal.type === 'mark-stale') {
    const current = payload['currentNeed'] as string | null | undefined;
    const action = payload['suggestedAction'] as string | null | undefined;
    return [
      current ? `~ need: ${current}` : null,
      action ? `  action: ${action}` : null,
    ].filter((line): line is string => line !== null);
  }

  return [];
}

@Component({
  selector: 'og7-admin-quality-needs-proposal-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="og7-proposals-panel flex flex-col gap-3 min-h-0">
      <!-- header -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Propositions de besoins
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            {{ totalCount() }} proposition(s) &middot;
            {{ proposedCount() }} a traiter
          </div>
        </div>
        <div class="flex gap-1.5">
          @for (option of filterOptions; track option.value) {
            <button
              type="button"
              class="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              [class.bg-sky-600]="filterStatus() === option.value"
              [class.text-white]="filterStatus() === option.value"
              [class.bg-slate-100]="filterStatus() !== option.value"
              [class.text-slate-600]="filterStatus() !== option.value"
              (click)="filterStatus.set(option.value)"
            >{{ option.label }}</button>
          }
        </div>
      </div>

      <!-- list -->
      <div class="flex flex-col gap-2 overflow-y-auto min-h-0" style="max-height: 420px;">
        @if (snapshot() === null) {
          <div class="text-xs text-slate-400 px-1 py-4 text-center">
            Chargement des propositions...
          </div>
        } @else if (displayItems().length === 0) {
          <div class="text-xs text-slate-400 px-1 py-4 text-center">
            Aucune proposition{{ filterStatus() !== 'all' ? ' dans cette vue' : '' }}.
          </div>
        } @else {
          @for (item of displayItems(); track item.proposal.proposalId) {
            <div
              class="rounded-lg border bg-white"
              [class.border-slate-200]="item.statusTone === 'neutral' || item.statusTone === 'muted'"
              [class.border-emerald-200]="item.statusTone === 'success'"
              [class.border-rose-200]="item.statusTone === 'error'"
              [attr.data-og7]="'proposal-item'"
              [attr.data-og7-id]="item.proposal.proposalId"
              [attr.data-og7-status]="item.proposal.status"
            >
              <!-- proposal header row -->
              <div class="flex items-start gap-2 px-3 pt-2.5 pb-1.5">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-semibold text-slate-800 truncate">
                      {{ item.proposal.title ?? item.proposal.entryId }}
                    </span>
                    <span
                      class="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium"
                      [class.bg-slate-100]="item.statusTone === 'neutral'"
                      [class.text-slate-600]="item.statusTone === 'neutral'"
                      [class.bg-emerald-50]="item.statusTone === 'success'"
                      [class.text-emerald-700]="item.statusTone === 'success'"
                      [class.bg-rose-50]="item.statusTone === 'error'"
                      [class.text-rose-700]="item.statusTone === 'error'"
                      [class.bg-slate-50]="item.statusTone === 'muted'"
                      [class.text-slate-400]="item.statusTone === 'muted'"
                    >{{ item.statusLabel }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span class="text-[10px] text-slate-500">{{ item.typeLabel }}</span>
                    <span class="text-[10px] text-slate-400">&middot;</span>
                    <span class="text-[10px] text-slate-500">{{ item.proposal.entryId }}</span>
                    <span class="text-[10px] text-slate-400">&middot;</span>
                    <span class="text-[10px] text-slate-500">confiance {{ item.confidenceLabel }}</span>
                  </div>
                </div>
                @if (item.isActionable) {
                  <div class="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                      [disabled]="isPending(item.proposal.proposalId)"
                      [attr.data-og7]="'proposal-accept'"
                      [attr.data-og7-id]="item.proposal.proposalId"
                      (click)="onAccept(item.proposal.proposalId)"
                    >Accepter</button>
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40"
                      [disabled]="isPending(item.proposal.proposalId)"
                      [attr.data-og7]="'proposal-reject'"
                      [attr.data-og7-id]="item.proposal.proposalId"
                      (click)="onReject(item.proposal.proposalId)"
                    >Rejeter</button>
                  </div>
                }
              </div>

              <!-- summary -->
              @if (item.proposal.summary) {
                <div class="px-3 pb-1.5 text-xs text-slate-500 leading-relaxed">
                  {{ item.proposal.summary }}
                </div>
              }

              <!-- diff preview -->
              @if (item.diffLines.length > 0) {
                <div
                  class="mx-3 mb-2.5 rounded bg-slate-50 border border-slate-100 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed overflow-x-auto"
                  [attr.data-og7]="'proposal-diff'"
                >
                  @for (line of item.diffLines; track $index) {
                    <div
                      [class.text-emerald-700]="line.startsWith('+')"
                      [class.text-amber-700]="line.startsWith('~')"
                      [class.text-slate-500]="line.startsWith(' ')"
                    >{{ line }}</div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class AdminQualityNeedsProposalPanelComponent {
  readonly snapshot = input<AdminQualityNeedProposalsSnapshot | null>(null);
  readonly proposalAction = output<AdminQualityNeedProposalAction>();

  readonly filterStatus = signal<ProposalFilterStatus>('proposed');
  private readonly pendingIds = signal<ReadonlySet<string>>(new Set());

  readonly filterOptions: readonly { value: ProposalFilterStatus; label: string }[] = [
    { value: 'proposed', label: 'A traiter' },
    { value: 'accepted', label: 'Acceptees' },
    { value: 'rejected', label: 'Rejetees' },
    { value: 'all', label: 'Toutes' },
  ];

  readonly totalCount = computed(() => this.snapshot()?.proposals.length ?? 0);
  readonly proposedCount = computed(
    () => this.snapshot()?.proposals.filter((p) => p.status === 'proposed').length ?? 0,
  );

  readonly displayItems = computed<readonly ProposalDisplayItem[]>(() => {
    const proposals = this.snapshot()?.proposals ?? [];
    const filter = this.filterStatus();

    return proposals
      .filter((p) => filter === 'all' || p.status === filter)
      .map(
        (p): ProposalDisplayItem => ({
          proposal: p,
          typeLabel: proposalTypeLabel(p.type),
          confidenceLabel: proposalConfidenceLabel(p.confidence),
          statusLabel: proposalStatusLabel(p.status),
          statusTone: proposalStatusTone(p.status),
          isActionable: p.status === 'proposed',
          diffLines: buildDiffLines(p),
        }),
      );
  });

  isPending(proposalId: string): boolean {
    return this.pendingIds().has(proposalId);
  }

  onAccept(proposalId: string): void {
    this.setPending(proposalId);
    this.proposalAction.emit({ proposalId, status: 'accepted' });
  }

  onReject(proposalId: string): void {
    this.setPending(proposalId);
    this.proposalAction.emit({ proposalId, status: 'rejected' });
  }

  clearPending(proposalId: string): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      next.delete(proposalId);
      return next;
    });
  }

  private setPending(proposalId: string): void {
    this.pendingIds.update((ids) => new Set([...ids, proposalId]));
  }
}
