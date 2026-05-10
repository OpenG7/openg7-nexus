import { ConnectionStage, PipelineEvent } from '@app/core/models/connection';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ConnectionsState } from './connections.reducer';

export interface PipelineStepStatus {
  readonly stage: ConnectionStage;
  readonly status: 'upcoming' | 'active' | 'completed';
  readonly timestamp?: string;
}

export const selectConnectionsState = createFeatureSelector<ConnectionsState>('connections');

export const selectConnectionCreating = createSelector(
  selectConnectionsState,
  (state) => state.creating,
);

export const selectCurrentStage = createSelector(selectConnectionsState, (state) => state.stage);

export const selectPipelineHistory = createSelector(
  selectConnectionsState,
  (state) => state.history,
);

export const selectPipelineSteps = createSelector(
  selectConnectionsState,
  (state): readonly PipelineStepStatus[] => {
    const order: ConnectionStage[] = ['intro', 'reply', 'meeting', 'review', 'deal'];
    const currentIndex = order.indexOf(state.stage);
    return order.map((stage, index) => {
      const event = findLastEvent(state.history, stage);
      let status: PipelineStepStatus['status'];
      if (currentIndex === -1) {
        status = 'upcoming';
      } else if (index < currentIndex) {
        status = 'completed';
      } else if (index === currentIndex) {
        status = 'active';
      } else {
        status = 'upcoming';
      }
      return {
        stage,
        status,
        timestamp: event?.timestamp,
      } satisfies PipelineStepStatus;
    });
  },
);

export const selectPipelineStart = createSelector(selectConnectionsState, (state) =>
  state.history.length ? state.history[0].timestamp : null,
);

export const selectAttachments = createSelector(
  selectConnectionsState,
  (state) => state.attachments,
);

export const selectMeetingSlots = createSelector(
  selectConnectionsState,
  (state) => state.meetingSlots,
);

export const selectConnectionError = createSelector(selectConnectionsState, (state) => state.error);

export const selectDraftsByMatch = createSelector(
  selectConnectionsState,
  (state) => state.draftsByMatch,
);

export const selectSubmissionsByMatch = createSelector(
  selectConnectionsState,
  (state) => state.submissionsByMatch,
);

function findLastEvent(
  history: readonly PipelineEvent[],
  stage: ConnectionStage,
): PipelineEvent | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const event = history[i];
    if (event.stage === stage) {
      return event;
    }
  }
  return undefined;
}
