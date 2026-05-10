import {
  ConnectionAttachment,
  ConnectionDraft,
  ConnectionRecord,
  ConnectionResponse,
  ConnectionStage,
  ConnectionSubmissionRecord,
  IntroductionDraftState,
  PipelineEvent,
} from '@app/core/models/connection';
import { createReducer, on } from '@ngrx/store';

import { ConnectionsActions } from './connections.actions';

export interface ConnectionsState {
  readonly creating: boolean;
  readonly stage: ConnectionStage;
  readonly history: readonly PipelineEvent[];
  readonly attachments: readonly ConnectionAttachment[];
  readonly meetingSlots: readonly string[];
  readonly lastConnectionId: number | null;
  readonly error: string | null;
  readonly draftsByMatch: Readonly<Record<number, IntroductionDraftState>>;
  readonly submissionsByMatch: Readonly<Record<number, ConnectionSubmissionRecord>>;
  readonly activeMatchId: number | null;
  readonly pendingSubmissionDraft: IntroductionDraftState | null;
}

const INITIAL_STAGE: ConnectionStage = 'intro';

const initialState: ConnectionsState = {
  creating: false,
  stage: INITIAL_STAGE,
  history: [],
  attachments: [],
  meetingSlots: [],
  lastConnectionId: null,
  error: null,
  draftsByMatch: {},
  submissionsByMatch: {},
  activeMatchId: null,
  pendingSubmissionDraft: null,
};

export const connectionsReducer = createReducer(
  initialState,
  on(ConnectionsActions.createConnection, (state, { draft }) => {
    const matchId = draft.matchId;
    const snapshot = mapDraftToSnapshot(draft);
    return {
      ...state,
      creating: true,
      error: null,
      stage: INITIAL_STAGE,
      history: addEvent(state.history, INITIAL_STAGE),
      attachments: draft.attachments,
      meetingSlots: [...draft.meetingSlots],
      draftsByMatch: removeKey(state.draftsByMatch, matchId),
      activeMatchId: matchId,
      pendingSubmissionDraft: snapshot,
    };
  }),
  on(ConnectionsActions.createConnectionSuccess, (state, { connection }) => {
    const nextStage: ConnectionStage = connection.stage ?? 'reply';
    const matchId = state.activeMatchId;
    const snapshot = state.pendingSubmissionDraft;
    const record = buildConnectionRecord(connection, nextStage);
    const submissions =
      matchId != null && snapshot
        ? {
            ...state.submissionsByMatch,
            [matchId]: { matchId, draft: snapshot, record },
          }
        : state.submissionsByMatch;

    return {
      ...state,
      creating: false,
      stage: nextStage,
      history: addEvent(state.history, nextStage, record.createdAt),
      lastConnectionId: connection.id,
      error: null,
      submissionsByMatch: submissions,
      activeMatchId: null,
      pendingSubmissionDraft: null,
    };
  }),
  on(ConnectionsActions.createConnectionFailure, (state, { error }) => {
    const matchId = state.activeMatchId;
    const snapshot = state.pendingSubmissionDraft;
    const drafts =
      matchId != null && snapshot
        ? { ...state.draftsByMatch, [matchId]: snapshot }
        : state.draftsByMatch;

    return {
      ...state,
      creating: false,
      error,
      draftsByMatch: drafts,
      activeMatchId: null,
      pendingSubmissionDraft: null,
    };
  }),
  on(ConnectionsActions.pipelineAdvanced, (state, { stage, timestamp }) => ({
    ...state,
    stage,
    history: addEvent(state.history, stage, timestamp),
    error: null,
  })),
  on(ConnectionsActions.resetPipeline, () => ({ ...initialState })),
  on(ConnectionsActions.attachmentsUpdated, (state, { attachments }) => ({
    ...state,
    attachments: [...attachments],
  })),
  on(ConnectionsActions.meetingSlotsUpdated, (state, { slots }) => ({
    ...state,
    meetingSlots: [...slots],
  })),
  on(ConnectionsActions.saveDraft, (state, { matchId, draft }) => ({
    ...state,
    draftsByMatch: { ...state.draftsByMatch, [matchId]: draft },
  })),
  on(ConnectionsActions.discardDraft, (state, { matchId }) => ({
    ...state,
    draftsByMatch: removeKey(state.draftsByMatch, matchId),
  })),
);

function addEvent(
  history: readonly PipelineEvent[],
  stage: ConnectionStage,
  timestamp?: string,
): readonly PipelineEvent[] {
  const event: PipelineEvent = {
    stage,
    timestamp: timestamp ?? new Date().toISOString(),
  };
  return [...history, event];
}

function removeKey<T>(
  source: Readonly<Record<number, T>>,
  key: number,
): Readonly<Record<number, T>> {
  if (!(key in source)) {
    return source;
  }
  const entries = Object.entries(source).filter(([id]) => Number(id) !== key);
  return Object.fromEntries(entries) as Readonly<Record<number, T>>;
}

function mapDraftToSnapshot(draft: ConnectionDraft): IntroductionDraftState {
  return {
    message: draft.introMessage,
    attachments: [...draft.attachments],
    meetingSlots: [...draft.meetingSlots],
    transports: [...draft.logistics.transports],
    incoterm: draft.logistics.incoterm ?? null,
  } satisfies IntroductionDraftState;
}

function buildConnectionRecord(
  response: ConnectionResponse,
  fallbackStage: ConnectionStage,
): ConnectionRecord {
  const stage = response.stage ?? fallbackStage;
  const createdAt = response.createdAt ?? new Date().toISOString();
  return {
    id: response.id,
    stage,
    createdAt,
    updatedAt: response.updatedAt ?? null,
  } satisfies ConnectionRecord;
}
