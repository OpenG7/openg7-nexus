import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AdminOpsService, AdminOpsSnapshot } from '../data-access/admin-ops.service';

type AdminOpsProvenanceId = 'health' | 'backups' | 'imports' | 'security';

interface AdminOpsProvenanceEntry {
  readonly id: AdminOpsProvenanceId;
  readonly label: string;
  readonly route: string;
  readonly generatedAt: string;
}

const ADMIN_OPS_PROVENANCE_CONFIG: ReadonlyArray<{
  readonly id: AdminOpsProvenanceId;
  readonly label: string;
  readonly route: string;
}> = [
  { id: 'health', label: 'API health', route: '/api/admin/ops/health' },
  { id: 'backups', label: 'Backups', route: '/api/admin/ops/backups' },
  { id: 'imports', label: 'Imports', route: '/api/admin/ops/imports' },
  { id: 'security', label: 'Security', route: '/api/admin/ops/security' },
];

@Component({
  standalone: true,
  selector: 'og7-admin-ops-page',
  imports: [CommonModule],
  templateUrl: './admin-ops.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOpsPage implements OnInit {
  private readonly service = inject(AdminOpsService);
  private readonly destroyRef = inject(DestroyRef);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<AdminOpsSnapshot | null>(null);

  readonly lastUpdated = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return null;
    }
    const values = [
      snapshot.health.generatedAt,
      snapshot.backups.generatedAt,
      snapshot.imports.generatedAt,
      snapshot.security.generatedAt,
    ]
      .map((entry) => new Date(entry).getTime())
      .filter((entry) => Number.isFinite(entry));
    if (!values.length) {
      return null;
    }
    return new Date(Math.max(...values)).toISOString();
  });

  readonly provenanceEntries = computed<readonly AdminOpsProvenanceEntry[]>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    return ADMIN_OPS_PROVENANCE_CONFIG.map((entry) => ({
      ...entry,
      generatedAt: snapshot[entry.id].generatedAt,
    }));
  });

  readonly provenanceState = computed<'fresh' | 'preserved-last-good' | null>(() => {
    if (!this.snapshot()) {
      return null;
    }

    return this.error() ? 'preserved-last-good' : 'fresh';
  });

  readonly provenanceMessage = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return null;
    }

    if (this.error()) {
      return 'Showing the last successful snapshot while the latest refresh failed.';
    }

    return 'Each block lists the API source and snapshot timestamp currently displayed.';
  });

  ngOnInit(): void {
    this.fetchSnapshot(false);
    this.refreshTimer = setInterval(() => this.fetchSnapshot(true), 60_000);
    this.destroyRef.onDestroy(() => {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
    });
  }

  refresh(): void {
    this.fetchSnapshot(true);
  }

  formatBytes(bytes: number | null | undefined): string {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  formatDuration(seconds: number | null | undefined): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
      return '0m';
    }
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  formatSessionTimeout(milliseconds: number | null): string {
    if (milliseconds == null) {
      return 'Disabled';
    }
    if (milliseconds < 60_000) {
      return `${Math.round(milliseconds / 1000)}s`;
    }
    const minutes = Math.floor(milliseconds / 60_000);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  trackBackupFile = (_: number, file: { name: string }) => file.name;
  trackImportEntry = (_: number, item: { id: string }) => item.id;
  trackSource = (_: number, item: { source: string }) => item.source;
  trackProvenanceEntry = (_: number, item: AdminOpsProvenanceEntry) => item.id;

  private fetchSnapshot(silent: boolean): void {
    if (silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    this.service
      .getSnapshot()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        })
      )
      .subscribe({
        next: (snapshot) => {
          this.snapshot.set(snapshot);
        },
        error: (error: unknown) => {
          this.error.set(this.resolveError(error));
        },
      });
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Access denied. This dashboard is restricted to owner/admin accounts.';
      }
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
      if (error.error && typeof error.error === 'object') {
        const message = (error.error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'Unable to load operations data.';
  }
}

