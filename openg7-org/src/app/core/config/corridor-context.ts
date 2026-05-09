export interface CorridorContext {
  readonly id: string;
  readonly labelKey: string;
  readonly routeKey?: string;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
}

const CORRIDOR_CONTEXTS: Readonly<Record<string, CorridorContext>> = {
  'essential-services': {
    id: 'essential-services',
    labelKey: 'home.corridorsRealtime.items.essentialServices',
    routeKey: 'home.corridorsRealtime.items.qcOn',
    fromProvinceId: 'QC',
    toProvinceId: 'ON',
  },
  'step-live': {
    id: 'step-live',
    labelKey: 'home.corridorsRealtime.items.stepLive',
  },
  'flow-energy': {
    id: 'flow-energy',
    labelKey: 'home.map.overlay.corridorLabels.flowEnergy',
    fromProvinceId: 'QC',
    toProvinceId: 'ON',
  },
  'flow-battery': {
    id: 'flow-battery',
    labelKey: 'home.map.overlay.corridorLabels.flowBattery',
    fromProvinceId: 'AB',
    toProvinceId: 'ON',
  },
  'flow-food': {
    id: 'flow-food',
    labelKey: 'home.map.overlay.corridorLabels.flowFood',
    fromProvinceId: 'BC',
    toProvinceId: 'ON',
  },
  'flow-qc-usne': {
    id: 'flow-qc-usne',
    labelKey: 'home.map.overlay.corridorLabels.flowQcUsne',
    fromProvinceId: 'QC',
  },
};

export function resolveCorridorContext(corridorId: string | null | undefined): CorridorContext | null {
  if (typeof corridorId !== 'string') {
    return null;
  }

  const normalizedId = corridorId.trim().toLowerCase();
  return normalizedId ? CORRIDOR_CONTEXTS[normalizedId] ?? null : null;
}
