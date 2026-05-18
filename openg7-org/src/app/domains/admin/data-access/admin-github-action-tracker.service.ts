import { Injectable, inject } from '@angular/core';
import { CodexLiveTimelineService } from '@app/core/observability/codex-live-timeline.service';
import {
  GithubActionNotificationState,
  GithubActionNotificationStatus,
  githubActionStatusMetadata,
} from '@app/core/observability/github-action-notification-status';
import {
  injectNotificationStore,
  NotificationAction,
  NotificationEntry,
} from '@app/core/observability/notification.store';
import { catchError, of, Subscription, switchMap, timer } from 'rxjs';

import {
  AdminOpsAiProofSnapshot,
  AdminOpsCodexDispatchResponse,
  AdminOpsService,
} from './admin-ops.service';

const GITHUB_ACTION_POLL_INTERVAL_MS = 15_000;
const GITHUB_ACTION_MAX_POLLS = 80;
const TRACKED_RUN_GRACE_MS = 120_000;
const ACTION_STATUS_SUFFIX_PATTERN =
  /\s+-\s+(en file|en cours|termine|echec|suivi indisponible)(?: #\d+)?$/i;

export interface AdminGithubActionDispatchCorrelation {
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface AdminGithubActionTrackingContext extends AdminGithubActionDispatchCorrelation {
  readonly source: string | null;
  readonly parentNotificationId: string;
  readonly actionId: string;
  readonly timelineRunId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminGithubActionTrackerService {
  private readonly ops = inject(AdminOpsService);
  private readonly notifications = injectNotificationStore();
  private readonly liveTimeline = inject(CodexLiveTimelineService);
  private readonly subscriptions = new Map<string, Subscription>();

  createDispatchCorrelation(actionId: string): AdminGithubActionDispatchCorrelation {
    const correlationId = `og7-${this.randomToken()}`;
    return {
      correlationId,
      idempotencyKey: `${correlationId}-${this.sanitizeToken(actionId) || 'action'}`,
    };
  }

  startTracking(
    dispatch: AdminOpsCodexDispatchResponse,
    context: AdminGithubActionTrackingContext,
  ): string | void {
    const trackingId = this.trackingId(context);
    const initialStatus = this.buildStatus({
      state: 'queued',
      label: 'GitHub Actions - en file',
      detail: `Dispatch recu; en attente du run ${dispatch.workflow}.`,
      dispatch,
      context,
    });
    const notificationId = this.updateNotification(
      context.parentNotificationId,
      initialStatus,
      context,
      dispatch,
    )
      ? context.parentNotificationId
      : this.createStandaloneTrackingNotification(initialStatus, context, dispatch);

    if (notificationId) {
      this.liveTimeline.recordGithubStatus(context.timelineRunId, initialStatus);
      this.pollGithubAction(trackingId, notificationId, dispatch, context);
    }

    return notificationId;
  }

  private createStandaloneTrackingNotification(
    initialStatus: GithubActionNotificationStatus,
    context: AdminGithubActionTrackingContext,
    dispatch: AdminOpsCodexDispatchResponse,
  ): string | void {
    return this.notifications.info(initialStatus.detail, {
      title: 'Codex - GitHub Actions',
      source: context.source ?? 'admin-quality-agent',
      metadata: {
        parentNotificationId: context.parentNotificationId,
        actionId: context.actionId,
        workflow: dispatch.workflow,
        ref: dispatch.ref,
        correlationId: context.correlationId,
        idempotencyKey: context.idempotencyKey,
        ...githubActionStatusMetadata(initialStatus),
      },
      actions: [
        {
          id: 'admin-github-action-open-ops',
          label: 'Voir Ops',
          kind: 'route',
          route: '/admin/ops',
        },
      ],
    });
  }

  private pollGithubAction(
    trackingId: string,
    notificationId: string,
    dispatch: AdminOpsCodexDispatchResponse,
    context: AdminGithubActionTrackingContext,
  ): void {
    this.stopTracking(trackingId);
    let attempts = 0;
    const subscription = timer(0, GITHUB_ACTION_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.ops.getAiProofs(context.correlationId).pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((snapshot) => {
        attempts += 1;
        const status = this.resolveStatus(snapshot, dispatch, context, attempts);
        this.updateNotification(notificationId, status, context, dispatch);
        this.updateLiveTimeline(snapshot, status, context, dispatch);

        if (this.isTerminal(status.state) || attempts >= GITHUB_ACTION_MAX_POLLS) {
          if (attempts >= GITHUB_ACTION_MAX_POLLS && !this.isTerminal(status.state)) {
            this.updateNotification(
              notificationId,
              this.buildStatus({
                state: 'unavailable',
                label: 'GitHub Actions - suivi interrompu',
                detail: `Le run ${dispatch.workflow} n'a pas donne d'etat final dans la fenetre de suivi.`,
                dispatch,
                context,
              }),
              context,
              dispatch,
            );
          }
          this.stopTracking(trackingId);
        }
      });

    this.subscriptions.set(trackingId, subscription);
  }

  private resolveStatus(
    snapshot: AdminOpsAiProofSnapshot | null,
    dispatch: AdminOpsCodexDispatchResponse,
    context: AdminGithubActionTrackingContext,
    attempts: number,
  ): GithubActionNotificationStatus {
    const proof = snapshot?.providers.find(
      (provider) => provider.provider === dispatch.selectedProvider,
    );
    const run = proof?.run ?? null;
    const requestedAtMs = Date.parse(dispatch.requestedAt);
    const runCreatedAtMs = Date.parse(run?.createdAt ?? '');
    const runMatchesDispatch =
      Boolean(run) &&
      run?.correlationId === context.correlationId &&
      (!Number.isFinite(requestedAtMs) ||
        (Number.isFinite(runCreatedAtMs) &&
          runCreatedAtMs >= requestedAtMs - TRACKED_RUN_GRACE_MS));

    if (!snapshot) {
      return this.buildStatus({
        state: 'unavailable',
        label: 'GitHub Actions - verification indisponible',
        detail: `Impossible de lire GitHub Actions pour ${dispatch.workflow}; nouvelle tentative automatique.`,
        dispatch,
        context,
      });
    }

    if (!proof || !runMatchesDispatch) {
      return this.buildStatus({
        state: 'queued',
        label: attempts <= 1 ? 'GitHub Actions - en file' : 'GitHub Actions - run attendu',
        detail: `Dispatch recu; GitHub n'a pas encore expose le run correle ${context.correlationId}.`,
        dispatch,
        context,
      });
    }

    const state = proof.state;
    return this.buildStatus({
      state,
      label: this.labelForState(state),
      detail: proof.summary,
      dispatch,
      context,
      runUrl: run.url,
      runNumber: run.number,
    });
  }

  private updateNotification(
    notificationId: string,
    status: GithubActionNotificationStatus,
    context: AdminGithubActionTrackingContext,
    dispatch: AdminOpsCodexDispatchResponse,
  ): boolean {
    const entry = this.notificationEntry(notificationId);
    if (!entry) {
      return false;
    }

    this.notifications.updateEntry(notificationId, {
      type: status.state === 'failed' ? 'error' : status.state === 'completed' ? 'success' : 'info',
      message: status.detail,
      metadata: {
        ...(entry.metadata ?? {}),
        parentNotificationId: context.parentNotificationId,
        actionId: context.actionId,
        workflow: dispatch.workflow,
        ref: dispatch.ref,
        correlationId: context.correlationId,
        idempotencyKey: context.idempotencyKey,
        ...githubActionStatusMetadata(status),
      },
      actions: this.actionsWithStatus(entry, context.actionId, status),
      read: false,
    });

    return true;
  }

  private updateLiveTimeline(
    snapshot: AdminOpsAiProofSnapshot | null,
    status: GithubActionNotificationStatus,
    context: AdminGithubActionTrackingContext,
    dispatch: AdminOpsCodexDispatchResponse,
  ): void {
    this.liveTimeline.recordGithubStatus(context.timelineRunId, status);

    const proof = snapshot?.providers.find(
      (provider) => provider.provider === dispatch.selectedProvider,
    );
    if (proof?.pullRequest) {
      this.liveTimeline.recordPullRequest(context.timelineRunId, {
        number: proof.pullRequest.number,
        url: proof.pullRequest.url,
        title: proof.pullRequest.title,
      });
    }
  }

  private buildStatus(input: {
    readonly state: GithubActionNotificationState;
    readonly label: string;
    readonly detail: string;
    readonly dispatch: AdminOpsCodexDispatchResponse;
    readonly context: AdminGithubActionTrackingContext;
    readonly runUrl?: string | null;
    readonly runNumber?: number | null;
  }): GithubActionNotificationStatus {
    return {
      state: input.state,
      label: input.label,
      detail: input.detail,
      workflow: input.dispatch.workflow,
      runUrl: input.runUrl ?? null,
      runNumber: input.runNumber ?? null,
      correlationId: input.context.correlationId,
      updatedAt: new Date().toISOString(),
    };
  }

  private labelForState(state: GithubActionNotificationState): string {
    switch (state) {
      case 'queued':
        return 'GitHub Actions - en file';
      case 'in-progress':
        return 'GitHub Actions - en traitement';
      case 'completed':
        return 'GitHub Actions - termine';
      case 'failed':
        return 'GitHub Actions - echec';
      default:
        return 'GitHub Actions - etat indisponible';
    }
  }

  private isTerminal(state: GithubActionNotificationState): boolean {
    return state === 'completed' || state === 'failed';
  }

  private notificationEntry(notificationId: string): NotificationEntry | null {
    return this.notifications.entries().find((entry) => entry.id === notificationId) ?? null;
  }

  private actionsWithStatus(
    entry: NotificationEntry,
    actionId: string,
    status: GithubActionNotificationStatus,
  ): readonly NotificationAction[] {
    const actions = entry.actions ?? [];
    const resultRoute =
      status.state === 'completed' ? this.resultRouteForEntry(entry, actionId) : null;

    return actions.flatMap((action) => {
      if (action.id !== actionId) {
        return [action];
      }

      if (resultRoute) {
        return [
          {
            ...action,
            label: this.resultActionLabel(status),
            kind: 'route' as const,
            route: resultRoute,
            command: null,
            codexDispatch: null,
          },
          this.openOpsAction(action.id),
        ];
      }

      return [
        {
          ...action,
          label: this.actionLabelWithStatus(action.label, status),
          kind: 'route' as const,
          route: '/admin/ops',
          command: null,
          codexDispatch: null,
        },
      ];
    });
  }

  private resultRouteForEntry(entry: NotificationEntry, actionId: string): string | null {
    const entryId =
      this.normalizedText(entry.metadata?.['entryId']) ??
      this.entryIdFromAgentActionId(actionId);

    return entryId ? `/admin/quality?entryId=${encodeURIComponent(entryId)}` : null;
  }

  private entryIdFromAgentActionId(actionId: string): string | null {
    const prefix = 'admin-quality-agent-task-';
    return actionId.startsWith(prefix) ? this.normalizedText(actionId.slice(prefix.length)) : null;
  }

  private openOpsAction(actionId: string): NotificationAction {
    return {
      id: `${actionId}-open-ops`,
      label: 'Voir Ops',
      kind: 'route',
      route: '/admin/ops',
    };
  }

  private resultActionLabel(status: GithubActionNotificationStatus): string {
    const runSuffix = status.runNumber ? ` #${status.runNumber}` : '';
    return `Voir resultat${runSuffix}`;
  }

  private actionLabelWithStatus(label: string, status: GithubActionNotificationStatus): string {
    const baseLabel = label.replace(ACTION_STATUS_SUFFIX_PATTERN, '').trim() || label;
    const runSuffix = status.runNumber ? ` #${status.runNumber}` : '';
    return `${baseLabel} - ${this.actionStatusLabel(status.state)}${runSuffix}`;
  }

  private actionStatusLabel(state: GithubActionNotificationState): string {
    switch (state) {
      case 'queued':
        return 'en file';
      case 'in-progress':
        return 'en cours';
      case 'completed':
        return 'termine';
      case 'failed':
        return 'echec';
      default:
        return 'suivi indisponible';
    }
  }

  private trackingId(context: AdminGithubActionTrackingContext): string {
    return `${context.parentNotificationId}:${context.actionId}:${context.correlationId}`;
  }

  private stopTracking(notificationId: string): void {
    this.subscriptions.get(notificationId)?.unsubscribe();
    this.subscriptions.delete(notificationId);
  }

  private randomToken(): string {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.randomUUID) {
      return this.sanitizeToken(cryptoApi.randomUUID());
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private sanitizeToken(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizedText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
