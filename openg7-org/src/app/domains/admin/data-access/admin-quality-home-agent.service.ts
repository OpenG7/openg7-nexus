import { Injectable, DestroyRef, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { AuthUser } from '@app/core/auth/auth.types';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { buildAdminQualityAgentTaskActions } from '@openg7/admin-quality';
import { filter, finalize, map } from 'rxjs/operators';

import { AdminQualityMatrixEntry, AdminQualityMatrixService } from './admin-quality-matrix.service';

const AGENT_SOURCE = 'admin-quality-agent';
const AGENT_WORKLOAD_DEDUPE_KEY = `${AGENT_SOURCE}:workload`;
const HOME_AGENT_SNOOZE_MS = 30 * 60 * 1000;
const SYSTEM_ADMIN_ROLES = new Set(['admin', 'owner']);

@Injectable({ providedIn: 'root' })
export class AdminQualityHomeAgentService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly matrix = inject(AdminQualityMatrixService);
  private readonly notifications = injectNotificationStore();
  private readonly router = inject(Router);
  private loading = false;
  private activatedForSignature: string | null = null;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly systemAdminUser = computed(() => {
    const user = this.auth.user();
    if (!this.auth.isAuthenticated() || !this.isSystemAdmin(user)) {
      return null;
    }
    return user;
  });

  constructor() {
    effect(() => {
      const user = this.systemAdminUser();
      const url = this.currentUrl();

      if (!user || !this.isHomeRoute(url)) {
        return;
      }

      const signature = `${user.id}:${user.email}:${this.normalizeUrlPath(url)}`;
      if (this.loading || signature === this.activatedForSignature) {
        return;
      }

      this.activatedForSignature = signature;
      this.loadAndAnnounce(user);
    });
  }

  private loadAndAnnounce(user: AuthUser): void {
    this.loading = true;
    this.matrix
      .loadMatrix()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (snapshot) => {
          const openEntries = snapshot.entries.filter((entry) => !this.isEntryFullyGreen(entry));
          const automationReadyCount = openEntries.filter(
            (entry) => !this.isEntryBlockedForAgent(entry),
          ).length;
          const decisionCount = openEntries.length - automationReadyCount;
          const proofCount = openEntries.filter(
            (entry) => entry.managementBucket === 'proof-gap',
          ).length;

          if (!openEntries.length) {
            this.notifications.success(
              `Agent de developpement actif pour ${user.email}: la matrice admin-quality est verte.`,
              {
                title: 'Agent admin-quality',
                source: AGENT_SOURCE,
                actions: [this.openAgentCockpitAction(), this.snoozeAgentAction()],
                metadata: {
                  kind: 'home-agent-activation',
                  dedupeKey: this.homeAgentDedupeKey(),
                  userId: user.id,
                  userEmail: user.email,
                  roleGate: 'system-admin',
                  openCount: 0,
                },
              },
            );
            return;
          }

          const taskActions = buildAdminQualityAgentTaskActions(openEntries);

          this.notifications.info(
            `Agent de developpement actif pour ${user.email}: ${openEntries.length} chantier(s), ${automationReadyCount} automatisable(s), ${decisionCount} decision(s) humaine(s).`,
            {
              title: 'Agent admin-quality',
              source: AGENT_SOURCE,
              actions: taskActions.length
                ? taskActions
                : [this.openAgentCockpitAction(), this.snoozeAgentAction()],
              metadata: {
                kind: 'home-agent-activation',
                dedupeKey: this.homeAgentDedupeKey(),
                userId: user.id,
                userEmail: user.email,
                roleGate: 'system-admin',
                openCount: openEntries.length,
                automationReadyCount,
                decisionCount,
                proofCount,
                taskActionCount: taskActions.length,
                generatedAt: snapshot.generatedAt,
              },
            },
          );
        },
        error: () => {
          this.activatedForSignature = null;
        },
      });
  }

  private openAgentCockpitAction() {
    return {
      id: 'admin-quality-agent-home-open-cockpit',
      label: 'Ouvrir cockpit',
      kind: 'route' as const,
      route: '/admin/quality',
    };
  }

  private snoozeAgentAction() {
    return {
      id: 'admin-quality-agent-home-snooze',
      label: 'Plus tard',
      kind: 'snooze' as const,
      durationMs: HOME_AGENT_SNOOZE_MS,
    };
  }

  private homeAgentDedupeKey(): string {
    return AGENT_WORKLOAD_DEDUPE_KEY;
  }

  private isSystemAdmin(user: AuthUser | null): user is AuthUser {
    return Boolean(user?.roles.some((role) => SYSTEM_ADMIN_ROLES.has(role.trim().toLowerCase())));
  }

  private isHomeRoute(url: string): boolean {
    return this.normalizeUrlPath(url) === '/';
  }

  private normalizeUrlPath(url: string): string {
    const [pathWithoutHash] = url.split('#', 1);
    const [pathWithoutQuery] = pathWithoutHash.split('?', 1);
    return pathWithoutQuery || '/';
  }

  private isEntryFullyGreen(entry: AdminQualityMatrixEntry): boolean {
    return (
      entry.managementBucket === 'covered' &&
      entry.summaryStatus === 'oui' &&
      entry.businessStatus === 'oui' &&
      entry.implementationStatus === 'oui' &&
      entry.e2eStatus === 'oui'
    );
  }

  private isEntryBlockedForAgent(entry: AdminQualityMatrixEntry): boolean {
    return (
      entry.needsProductWorkFirst ||
      entry.managementBucket === 'product-gap' ||
      entry.managementBucket === 'scope-limit'
    );
  }
}
