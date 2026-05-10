import type { FeatureCollection, LineString, Point } from 'geojson';

export type HomeSector = 'energy' | 'manufacturing' | 'agri-food';
export type CorridorMode = 'IMPORT' | 'EXPORT' | 'BOTH';
export type CorridorPriority = 'standard' | 'elevated' | 'critical';

export interface HomeCorridorBeat {
  readonly id: string;
  readonly labelKey: string;
  readonly hubId: string;
}

export interface HomeSectorMeta {
  readonly id: HomeSector;
  readonly labelKey: string;
}

export interface HomeCorridor {
  readonly id: string;
  readonly sector: HomeSector;
  readonly routeLabelKey: string;
  readonly briefKey: string;
  readonly stageKey: string;
  readonly provinces: readonly string[];
  readonly fromProvinceId: string;
  readonly toProvinceId?: string | null;
  readonly mode: CorridorMode;
  readonly priority: CorridorPriority;
  readonly priorityLabelKey: string;
  readonly decisionItemId?: string | null;
  readonly cmsKey: string;
  readonly monitoringHours: number;
  readonly checkpointCount: number;
  readonly reliability: number;
  readonly beats: readonly HomeCorridorBeat[];
}

export interface HomeHub {
  readonly id: string;
  readonly label: string;
  readonly provinceId: string;
  readonly roleKey: string;
  readonly briefKey: string;
  readonly corridorIds: readonly string[];
  readonly coordinates: readonly [number, number];
}

export const HOME_SECTORS: readonly HomeSectorMeta[] = [
  { id: 'energy', labelKey: 'home.map.overlay.sectorsList.energy' },
  { id: 'manufacturing', labelKey: 'home.map.overlay.sectorsList.manufacturing' },
  { id: 'agri-food', labelKey: 'home.map.overlay.sectorsList.agriFood' },
] as const;

export const HOME_CORRIDORS: readonly HomeCorridor[] = [
  {
    id: 'flow-energy',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowEnergy',
    briefKey: 'home.map.overlay.corridorBriefs.flowEnergy',
    stageKey: 'home.map.overlay.stage.activeWatch',
    sector: 'energy',
    provinces: ['qc', 'on'],
    fromProvinceId: 'QC',
    toProvinceId: 'ON',
    mode: 'BOTH',
    priority: 'critical',
    priorityLabelKey: 'feed.context.priority.critical',
    decisionItemId: 'request-001',
    cmsKey: 'strategic-corridor.flow-energy',
    monitoringHours: 72,
    checkpointCount: 4,
    reliability: 97,
    beats: [
      {
        id: 'energy-dispatch',
        labelKey: 'home.map.overlay.corridorBeats.energyDispatch',
        hubId: 'quebec-city',
      },
      {
        id: 'energy-trade',
        labelKey: 'home.map.overlay.corridorBeats.energyTrade',
        hubId: 'montreal',
      },
      {
        id: 'energy-demand',
        labelKey: 'home.map.overlay.corridorBeats.energyDemand',
        hubId: 'toronto',
      },
    ],
  },
  {
    id: 'flow-battery',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowBattery',
    briefKey: 'home.map.overlay.corridorBriefs.flowBattery',
    stageKey: 'home.map.overlay.stage.synchronized',
    sector: 'manufacturing',
    provinces: ['ab', 'mb', 'on'],
    fromProvinceId: 'AB',
    toProvinceId: 'ON',
    mode: 'BOTH',
    priority: 'elevated',
    priorityLabelKey: 'feed.context.priority.elevated',
    decisionItemId: 'request-002',
    cmsKey: 'strategic-corridor.flow-battery',
    monitoringHours: 96,
    checkpointCount: 5,
    reliability: 92,
    beats: [
      {
        id: 'battery-origin',
        labelKey: 'home.map.overlay.corridorBeats.batteryOrigin',
        hubId: 'calgary',
      },
      {
        id: 'battery-sync',
        labelKey: 'home.map.overlay.corridorBeats.batterySync',
        hubId: 'winnipeg',
      },
      {
        id: 'battery-assembly',
        labelKey: 'home.map.overlay.corridorBeats.batteryAssembly',
        hubId: 'toronto',
      },
    ],
  },
  {
    id: 'flow-food',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowFood',
    briefKey: 'home.map.overlay.corridorBriefs.flowFood',
    stageKey: 'home.map.overlay.stage.synchronized',
    sector: 'agri-food',
    provinces: ['bc', 'ab', 'mb', 'on'],
    fromProvinceId: 'BC',
    toProvinceId: 'ON',
    mode: 'BOTH',
    priority: 'standard',
    priorityLabelKey: 'feed.context.priority.standard',
    decisionItemId: 'request-008',
    cmsKey: 'strategic-corridor.flow-food',
    monitoringHours: 84,
    checkpointCount: 5,
    reliability: 94,
    beats: [
      {
        id: 'food-gateway',
        labelKey: 'home.map.overlay.corridorBeats.foodGateway',
        hubId: 'vancouver',
      },
      { id: 'food-sync', labelKey: 'home.map.overlay.corridorBeats.foodSync', hubId: 'winnipeg' },
      {
        id: 'food-demand',
        labelKey: 'home.map.overlay.corridorBeats.foodDemand',
        hubId: 'toronto',
      },
    ],
  },
  {
    id: 'flow-qc-usne',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowQcUsne',
    briefKey: 'home.map.overlay.corridorBriefs.flowQcUsne',
    stageKey: 'home.map.overlay.stage.exportBridge',
    sector: 'energy',
    provinces: ['qc', 'us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt'],
    fromProvinceId: 'QC',
    toProvinceId: null,
    mode: 'EXPORT',
    priority: 'elevated',
    priorityLabelKey: 'feed.context.priority.elevated',
    decisionItemId: null,
    cmsKey: 'strategic-corridor.flow-qc-usne',
    monitoringHours: 48,
    checkpointCount: 3,
    reliability: 95,
    beats: [
      {
        id: 'export-origin',
        labelKey: 'home.map.overlay.corridorBeats.exportOrigin',
        hubId: 'montreal',
      },
      {
        id: 'export-gateway',
        labelKey: 'home.map.overlay.corridorBeats.exportGateway',
        hubId: 'boston',
      },
    ],
  },
] as const;

export const HOME_FLOWS: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'flow-energy',
      properties: {
        corridorId: 'flow-energy',
        sector: 'energy',
        provinces: ['qc', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-71.208, 46.8139],
          [-73.5673, 45.5017],
          [-75.6972, 45.4215],
          [-79.3832, 43.6532],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'flow-battery',
      properties: {
        corridorId: 'flow-battery',
        sector: 'manufacturing',
        provinces: ['ab', 'mb', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-114.0719, 51.0447],
          [-104.6189, 50.4452],
          [-97.1384, 49.8951],
          [-89.2477, 48.3809],
          [-79.3832, 43.6532],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'flow-food',
      properties: {
        corridorId: 'flow-food',
        sector: 'agri-food',
        provinces: ['bc', 'ab', 'mb', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-123.1207, 49.2827],
          [-114.0719, 51.0447],
          [-97.1384, 49.8951],
          [-89.2477, 48.3809],
          [-79.3832, 43.6532],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'flow-qc-usne',
      properties: {
        corridorId: 'flow-qc-usne',
        sector: 'energy',
        provinces: ['qc', 'us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-71.208, 46.8139],
          [-73.5673, 45.5017],
          [-71.0589, 42.3601],
        ],
      },
    },
  ],
};

export const HOME_HUBS: readonly HomeHub[] = [
  {
    id: 'quebec-city',
    label: 'Quebec City',
    provinceId: 'qc',
    roleKey: 'home.map.overlay.hubRoles.dispatch',
    briefKey: 'home.map.overlay.hubBriefs.quebecCity',
    corridorIds: ['flow-energy'],
    coordinates: [-71.208, 46.8139],
  },
  {
    id: 'montreal',
    label: 'Montreal',
    provinceId: 'qc',
    roleKey: 'home.map.overlay.hubRoles.trade',
    briefKey: 'home.map.overlay.hubBriefs.montreal',
    corridorIds: ['flow-energy', 'flow-qc-usne'],
    coordinates: [-73.5673, 45.5017],
  },
  {
    id: 'ottawa',
    label: 'Ottawa',
    provinceId: 'on',
    roleKey: 'home.map.overlay.hubRoles.governance',
    briefKey: 'home.map.overlay.hubBriefs.ottawa',
    corridorIds: ['flow-energy'],
    coordinates: [-75.6972, 45.4215],
  },
  {
    id: 'toronto',
    label: 'Toronto',
    provinceId: 'on',
    roleKey: 'home.map.overlay.hubRoles.market',
    briefKey: 'home.map.overlay.hubBriefs.toronto',
    corridorIds: ['flow-energy', 'flow-battery', 'flow-food'],
    coordinates: [-79.3832, 43.6532],
  },
  {
    id: 'calgary',
    label: 'Calgary',
    provinceId: 'ab',
    roleKey: 'home.map.overlay.hubRoles.extraction',
    briefKey: 'home.map.overlay.hubBriefs.calgary',
    corridorIds: ['flow-battery'],
    coordinates: [-114.0719, 51.0447],
  },
  {
    id: 'winnipeg',
    label: 'Winnipeg',
    provinceId: 'mb',
    roleKey: 'home.map.overlay.hubRoles.sync',
    briefKey: 'home.map.overlay.hubBriefs.winnipeg',
    corridorIds: ['flow-battery', 'flow-food'],
    coordinates: [-97.1384, 49.8951],
  },
  {
    id: 'vancouver',
    label: 'Vancouver',
    provinceId: 'bc',
    roleKey: 'home.map.overlay.hubRoles.gateway',
    briefKey: 'home.map.overlay.hubBriefs.vancouver',
    corridorIds: ['flow-food'],
    coordinates: [-123.1207, 49.2827],
  },
  {
    id: 'boston',
    label: 'Boston',
    provinceId: 'us-ma',
    roleKey: 'home.map.overlay.hubRoles.export',
    briefKey: 'home.map.overlay.hubBriefs.boston',
    corridorIds: ['flow-qc-usne'],
    coordinates: [-71.0589, 42.3601],
  },
] as const;

export const HOME_HUB_FEATURES: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: HOME_HUBS.map((hub) => ({
    type: 'Feature',
    id: hub.id,
    properties: { label: hub.label, provinceId: hub.provinceId, hubId: hub.id },
    geometry: { type: 'Point', coordinates: [...hub.coordinates] },
  })),
};

export function getHomeSectorLabelKey(sectorId: HomeSector): string {
  return (
    HOME_SECTORS.find((sector) => sector.id === sectorId)?.labelKey ??
    'home.map.overlay.sectorsList.energy'
  );
}
