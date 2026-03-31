// Types générés par openapi-typescript
import type { components } from './strapi.rest';

// Types de haut niveau (facultatif)
export type Province = components['schemas']['Province'];
export type Sector   = components['schemas']['Sector'];
export type Company  = components['schemas']['Company'];
export type Exchange = components['schemas']['Exchange'];
export type BillingPlan = components['schemas']['BillingPlan'];
export type BillingPlanCapabilities = components['schemas']['BillingPlanCapabilities'];
export type BillingPlanPrice = components['schemas']['BillingPlanPrice'];
export type StatisticsSummary = components['schemas']['StatisticsSummary'];
export type StatisticsInsight = components['schemas']['StatisticsInsight'];
export type StatisticsSnapshot = components['schemas']['StatisticsSnapshot'];
export type StatisticsResponse = components['schemas']['StatisticsResponse'];
export type HydrocarbonSignal = components['schemas']['HydrocarbonSignal'];
export type HydrocarbonSignalResponse = components['schemas']['HydrocarbonSignalResponse'];
export type HydrocarbonSignalCollectionResponse = components['schemas']['HydrocarbonSignalCollectionResponse'];

// Réponses Strapi usuelles
export interface StrapiList<T> { data: T[]; meta: { pagination?: unknown } }
export interface StrapiSingle<T> { data: T;  meta?: unknown }

// Endpoints documentés
export const endpoints = {
  sectors:   '/api/sectors',
  provinces: '/api/provinces',
  companies: '/api/companies',
  exchanges: '/api/exchanges',
  homepage:  '/api/homepage',
  statistics: '/api/statistics',
  billingPlans: '/billing/plans',
  hydrocarbonSignals: '/api/hydrocarbon-signals'
} as const;
