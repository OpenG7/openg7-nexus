import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  COMPANY_STATUSES,
  CompanyRecord,
  CompanyService,
  CompanyStatus,
} from '@app/core/services/company.service';
import { TranslateModule } from '@ngx-translate/core';
import { AdminNavigationPillsComponent } from '@openg7/admin-quality';
import type { AdminNavigationPillItem } from '@openg7/admin-quality';

const STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  suspended: 'Suspended',
};

@Component({
  standalone: true,
  selector: 'og7-admin-page',
  imports: [CommonModule, TranslateModule, AdminNavigationPillsComponent],
  templateUrl: './admin.page.html',
  styles: [
    `
      :host {
        display: block;
      }

      .og7-admin-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 14% 18%, rgba(56, 189, 248, 0.18), transparent 24%),
          radial-gradient(circle at 84% 16%, rgba(16, 185, 129, 0.12), transparent 20%),
          radial-gradient(circle at 78% 78%, rgba(244, 63, 94, 0.1), transparent 20%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 42%);
        pointer-events: none;
      }

      .og7-admin-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 -120px 160px rgba(2, 6, 23, 0.18);
        pointer-events: none;
      }

      .og7-admin-surface {
        position: relative;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
        box-shadow: 0 22px 56px -42px rgba(15, 23, 42, 0.22);
      }

      .og7-admin-surface::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(56, 189, 248, 0.08), transparent 22%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .og7-admin-surface::after {
        content: '';
        position: absolute;
        inset: auto 1.5rem 0 1.5rem;
        height: 3.5rem;
        background: radial-gradient(circle at center, rgba(14, 165, 233, 0.09), transparent 68%);
        filter: blur(18px);
        pointer-events: none;
      }

      .og7-admin-motion-rise {
        opacity: 0;
        transform: translateY(12px) scale(0.985);
        animation: og7-admin-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      @keyframes og7-admin-rise {
        0% {
          opacity: 0;
          transform: translateY(12px) scale(0.985);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .og7-admin-summary-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at top right,
          rgba(255, 255, 255, 0.14),
          transparent 34%
        );
        pointer-events: none;
      }

      .og7-admin-summary-card::after {
        content: '';
        position: absolute;
        inset: auto 1.25rem 1rem 1.25rem;
        height: 1px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0),
          rgba(148, 163, 184, 0.28),
          rgba(255, 255, 255, 0)
        );
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Admin » du dossier « domains/admin/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AdminPage gérée par le framework.
 */
export class AdminPage implements OnInit {
  private readonly service = inject(CompanyService);
  private readonly notifications = injectNotificationStore();

  protected readonly companies = this.service.companies();
  protected readonly loading = this.service.loading();
  protected readonly error = this.service.error();
  protected readonly statuses = COMPANY_STATUSES;
  protected readonly updating = signal<Record<number, boolean>>({});
  protected readonly adminCircuitItems: readonly AdminNavigationPillItem[] = [
    { id: 'moderation', label: 'Moderation', routerLink: '/admin', active: true },
    { id: 'ops', label: 'Owner Ops', routerLink: '/admin/ops' },
    { id: 'quality', label: 'QA Matrix', routerLink: '/admin/quality' },
  ];
  protected readonly moderationSummary = computed(() => {
    const companies = this.companies();
    const summary = {
      total: companies.length,
      pending: 0,
      approved: 0,
      suspended: 0,
    };

    for (const company of companies) {
      if (company.status === 'pending') {
        summary.pending += 1;
      } else if (company.status === 'approved') {
        summary.approved += 1;
      } else if (company.status === 'suspended') {
        summary.suspended += 1;
      }
    }

    return summary;
  });
  protected readonly moderationHeadline = computed(() => {
    const summary = this.moderationSummary();
    if (summary.pending > 0) {
      return `${summary.pending} company${summary.pending > 1 ? 'ies are' : ' is'} waiting for owner review.`;
    }
    if (summary.suspended > 0) {
      return `${summary.suspended} suspended organisation${summary.suspended > 1 ? 's remain' : ' remains'} under watch.`;
    }
    return 'The moderation queue is clear. Use Ops and Quality to review downstream operational impact.';
  });

  protected summaryCardClasses(tone: 'neutral' | 'warning' | 'ready' | 'critical'): string {
    switch (tone) {
      case 'warning':
        return 'border-amber-300/38 bg-[linear-gradient(180deg,rgba(120,53,15,0.58),rgba(120,53,15,0.18))] text-white shadow-[0_24px_70px_-38px_rgba(245,158,11,0.42)]';
      case 'ready':
        return 'border-emerald-300/38 bg-[linear-gradient(180deg,rgba(6,78,59,0.6),rgba(6,95,70,0.22))] text-white shadow-[0_24px_70px_-38px_rgba(16,185,129,0.45)]';
      case 'critical':
        return 'border-rose-300/38 bg-[linear-gradient(180deg,rgba(127,29,29,0.62),rgba(127,29,29,0.2))] text-white shadow-[0_24px_70px_-38px_rgba(244,63,94,0.44)]';
      default:
        return 'border-cyan-300/28 bg-[linear-gradient(180deg,rgba(8,47,73,0.62),rgba(14,116,144,0.18))] text-white shadow-[0_24px_70px_-38px_rgba(56,189,248,0.34)]';
    }
  }

  protected summaryBadgeClasses(tone: 'neutral' | 'warning' | 'ready' | 'critical'): string {
    switch (tone) {
      case 'warning':
        return 'border-amber-100/28 bg-amber-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      case 'ready':
        return 'border-emerald-100/28 bg-emerald-200/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      case 'critical':
        return 'border-rose-100/28 bg-rose-200/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      default:
        return 'border-cyan-100/28 bg-cyan-200/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
    }
  }

  protected summaryToneLabel(tone: 'neutral' | 'warning' | 'ready' | 'critical'): string {
    switch (tone) {
      case 'warning':
        return 'Review';
      case 'ready':
        return 'Live';
      case 'critical':
        return 'Watch';
      default:
        return 'Monitor';
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.service.loadCompanies({ status: 'all' });
  }

  statusLabel(status: CompanyStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  isUpdating(id: number): boolean {
    return Boolean(this.updating()[id]);
  }

  onStatusChange(company: CompanyRecord, event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const rawStatus = target?.value ?? 'pending';
    if (rawStatus !== 'approved' && rawStatus !== 'pending' && rawStatus !== 'suspended') {
      return;
    }
    const status = rawStatus as CompanyStatus;
    if (status === company.status) {
      return;
    }
    this.setUpdating(company.id, true);
    this.service.updateStatus(company.id, status).subscribe({
      next: () => {
        this.notifications.success('Company status updated.', {
          source: 'admin',
          metadata: { companyId: company.id, status },
        });
        this.setUpdating(company.id, false);
      },
      error: () => {
        this.notifications.error('Failed to update status.', {
          source: 'admin',
          metadata: { companyId: company.id, status },
          deliver: { email: true },
        });
        this.setUpdating(company.id, false);
      },
    });
  }

  resolveError(message: string | null): string {
    if (!message) {
      return 'An unexpected error occurred while loading companies.';
    }
    if (message === 'company.error.load') {
      return 'Unable to load companies from the API.';
    }
    return message;
  }

  private setUpdating(id: number, value: boolean): void {
    const next = { ...this.updating() };
    if (value) {
      next[id] = true;
    } else {
      delete next[id];
    }
    this.updating.set(next);
  }
}
