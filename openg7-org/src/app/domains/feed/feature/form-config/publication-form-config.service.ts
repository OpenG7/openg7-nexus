import { Injectable } from '@angular/core';

import coldChainCapacityOfferConfigJson from './forms/cold-chain-capacity-offer.json';
import energySurplusOfferConfigJson from './forms/energy-surplus-offer.json';
import hydrocarbonSurplusOfferConfigJson from './forms/hydrocarbon-surplus-offer.json';
import industrialLoadFlexRequestConfigJson from './forms/industrial-load-flex-request.json';
import { PublicationFormConfig } from './publication-form-config.models';

const CONFIGS: Record<string, PublicationFormConfig> = {
  'cold-chain-capacity-offer': coldChainCapacityOfferConfigJson as PublicationFormConfig,
  'energy-surplus-offer': energySurplusOfferConfigJson as PublicationFormConfig,
  'hydrocarbon-surplus-offer': hydrocarbonSurplusOfferConfigJson as PublicationFormConfig,
  'industrial-load-flex-request': industrialLoadFlexRequestConfigJson as PublicationFormConfig,
};

@Injectable({ providedIn: 'root' })
export class PublicationFormConfigService {
  list(): readonly PublicationFormConfig[] {
    return Object.values(CONFIGS);
  }

  get(formKey: string | null | undefined): PublicationFormConfig | null {
    if (!formKey) {
      return null;
    }
    return CONFIGS[formKey] ?? null;
  }
}