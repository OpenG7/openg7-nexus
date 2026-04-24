import { AdminQualityMissionRecommendation, AdminQualityMissionStatus } from './admin-quality-mission-control';

export type AdminQualityMissionControlAction =
  | 'approve'
  | 'auto-delegate'
  | 'defer'
  | 'block'
  | 'reset'
  | 'return-proof'
  | 'complete';

export interface AdminQualityMissionControlActionEvent {
  readonly action: AdminQualityMissionControlAction;
  readonly recommendation: AdminQualityMissionRecommendation;
}

export type AdminQualityMissionActionTone = 'primary' | 'secondary' | 'danger' | 'neutral' | 'success';

export interface AdminQualityMissionActionDescriptor {
  readonly action: AdminQualityMissionControlAction;
  readonly label: string;
  readonly tone: AdminQualityMissionActionTone;
  readonly hookId?: string;
}

export type AdminQualityMissionActionResolution =
  | {
      readonly kind: 'status';
      readonly status: AdminQualityMissionStatus;
      readonly message: string;
    }
  | {
      readonly kind: 'reset';
      readonly message: string;
    };

export function missionActionDescriptors(
  status: AdminQualityMissionStatus
): readonly AdminQualityMissionActionDescriptor[] {
  switch (status) {
    case 'approved':
      return [
        { action: 'auto-delegate', label: 'Lancer delegation', tone: 'secondary' },
        { action: 'block', label: 'Bloquer', tone: 'danger' },
        { action: 'reset', label: 'Reinitialiser', tone: 'neutral' },
      ];
    case 'in-progress':
      return [
        { action: 'return-proof', label: 'Preuve revenue', tone: 'success' },
        { action: 'block', label: 'Bloquer', tone: 'danger' },
        { action: 'reset', label: 'Reinitialiser', tone: 'neutral' },
      ];
    case 'proof-returned':
      return [
        { action: 'complete', label: 'Cloturer', tone: 'primary' },
        { action: 'reset', label: 'Reouvrir', tone: 'neutral' },
      ];
    case 'blocked':
      return [
        { action: 'auto-delegate', label: 'Relancer', tone: 'secondary' },
        { action: 'reset', label: 'Reinitialiser', tone: 'neutral' },
      ];
    case 'done':
      return [{ action: 'reset', label: 'Reouvrir', tone: 'neutral' }];
    default:
      return [
        { action: 'approve', label: 'Valider mission', tone: 'primary', hookId: 'admin-quality-approve-mission' },
        { action: 'auto-delegate', label: 'Deleguer', tone: 'secondary' },
        { action: 'defer', label: 'Differer', tone: 'neutral' },
      ];
  }
}

export function resolveMissionAction(
  action: AdminQualityMissionControlAction,
  recommendation: AdminQualityMissionRecommendation
): AdminQualityMissionActionResolution | null {
  switch (action) {
    case 'approve':
      return { kind: 'status', status: 'approved', message: 'Mission approuvee par un humain.' };
    case 'auto-delegate':
      if (
        recommendation.status === 'proposed' ||
        recommendation.status === 'deferred' ||
        recommendation.status === 'rejected' ||
        recommendation.status === 'approved'
      ) {
        return { kind: 'status', status: 'in-progress', message: 'Mission approuvee et deleguee.' };
      }
      if (recommendation.status === 'blocked') {
        return { kind: 'status', status: 'approved', message: 'Mission debloquee et remise en file.' };
      }
      return null;
    case 'defer':
      return { kind: 'status', status: 'deferred', message: 'Mission differee.' };
    case 'block':
      return { kind: 'status', status: 'blocked', message: 'Mission marquee comme bloquee.' };
    case 'reset':
      return { kind: 'reset', message: 'Mission reinitialisee.' };
    case 'return-proof':
      return { kind: 'status', status: 'proof-returned', message: 'La preuve est marquee comme revenue.' };
    case 'complete':
      return { kind: 'status', status: 'done', message: 'Mission cloturee localement.' };
    default:
      return null;
  }
}
