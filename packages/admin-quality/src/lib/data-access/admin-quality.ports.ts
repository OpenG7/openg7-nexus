import { InjectionToken } from '@angular/core';

import {
  ADMIN_QUALITY_MATRIX_PORT as PORTABLE_ADMIN_QUALITY_MATRIX_PORT,
  ADMIN_QUALITY_MISSION_DECISIONS_PORT as PORTABLE_ADMIN_QUALITY_MISSION_DECISIONS_PORT,
  ADMIN_QUALITY_NOTIFICATIONS as PORTABLE_ADMIN_QUALITY_NOTIFICATIONS,
  ADMIN_QUALITY_OPS_PORT as PORTABLE_ADMIN_QUALITY_OPS_PORT,
  ADMIN_QUALITY_ROUTE_CONFIG as PORTABLE_ADMIN_QUALITY_ROUTE_CONFIG,
  DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG,
} from '../admin-quality.tokens';
import type {
  AdminQualityMatrixPort as PortableAdminQualityMatrixPort,
  AdminQualityMissionDecisionsPort as PortableAdminQualityMissionDecisionsPort,
  AdminQualityNotificationOptions,
  AdminQualityNotificationPort,
  AdminQualityOpsPort as PortableAdminQualityOpsPort,
  AdminQualityRouteConfig,
} from '../admin-quality.tokens';

import type {
  AdminOpsAiProofSnapshot,
  AdminOpsCodexDispatchRequest,
  AdminOpsCodexDispatchResponse,
  AdminOpsSecuritySnapshot,
} from './admin-ops.service';
import type {
  AdminQualityMatrixApplyProposalResult,
  AdminQualityMatrixRecalculationScope,
  AdminQualityMatrixRecalculationSnapshot,
  AdminQualityMatrixSnapshot,
} from './admin-quality-matrix.service';
import type {
  AdminQualityMissionDecisionRecord,
  AdminQualityMissionDecisionSaveInput,
  AdminQualityMissionDecisionSnapshot,
} from './admin-quality-mission-decisions.service';

export type AdminQualityMatrixPort = PortableAdminQualityMatrixPort<
  AdminQualityMatrixSnapshot,
  AdminQualityMatrixRecalculationScope,
  AdminQualityMatrixRecalculationSnapshot,
  AdminQualityMatrixApplyProposalResult
>;

export type AdminQualityOpsPort = PortableAdminQualityOpsPort<
  AdminOpsSecuritySnapshot,
  AdminOpsAiProofSnapshot,
  AdminOpsCodexDispatchRequest,
  AdminOpsCodexDispatchResponse
>;

export type AdminQualityMissionDecisionsPort = PortableAdminQualityMissionDecisionsPort<
  AdminQualityMissionDecisionSnapshot,
  AdminQualityMissionDecisionSaveInput,
  AdminQualityMissionDecisionRecord
>;

export type {
  AdminQualityNotificationOptions,
  AdminQualityNotificationPort,
  AdminQualityRouteConfig,
};

export { DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG };

export const ADMIN_QUALITY_MATRIX_PORT =
  PORTABLE_ADMIN_QUALITY_MATRIX_PORT as InjectionToken<AdminQualityMatrixPort>;

export const ADMIN_QUALITY_OPS_PORT =
  PORTABLE_ADMIN_QUALITY_OPS_PORT as InjectionToken<AdminQualityOpsPort>;

export const ADMIN_QUALITY_MISSION_DECISIONS_PORT =
  PORTABLE_ADMIN_QUALITY_MISSION_DECISIONS_PORT as InjectionToken<AdminQualityMissionDecisionsPort>;

export const ADMIN_QUALITY_NOTIFICATIONS =
  PORTABLE_ADMIN_QUALITY_NOTIFICATIONS as InjectionToken<AdminQualityNotificationPort>;

export const ADMIN_QUALITY_ROUTE_CONFIG =
  PORTABLE_ADMIN_QUALITY_ROUTE_CONFIG as InjectionToken<AdminQualityRouteConfig>;
