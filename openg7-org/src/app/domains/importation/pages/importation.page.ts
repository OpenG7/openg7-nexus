import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  ImportationCommoditySectionComponent,
  ImportationOverviewHeaderComponent,
  ImportationFlowMapPanelComponent,
  ImportationSupplierIntelComponent,
  ImportationCollaborationHubComponent,
  ImportationKnowledgeSectionComponent,
} from '../components';
import {
  ImportationCommodityTab,
  ImportationOriginScope,
  ImportationPeriodGranularity,
} from '../models/importation.models';
import { ImportationFiltersStore } from '../services/importation-filters.store';

@Component({
  standalone: true,
  selector: 'og7-importation-page',
  imports: [
    CommonModule,
    TranslateModule,
    ImportationOverviewHeaderComponent,
    ImportationFlowMapPanelComponent,
    ImportationCommoditySectionComponent,
    ImportationSupplierIntelComponent,
    ImportationCollaborationHubComponent,
    ImportationKnowledgeSectionComponent,
  ],
  templateUrl: './importation.page.html',
  styleUrls: ['./importation.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ImportationFiltersStore],
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Importation » du dossier « domains/importation/pages ».
 * Raison d’être : Orchestrer les sections de visualisation, tableaux et collaboration pour le module Importation.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ImportationPage gérée par le framework.
 */
export class ImportationPage implements OnInit {
  private readonly store = inject(ImportationFiltersStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly overviewVm = this.store.overviewVm;
  readonly flowVm = this.store.flowMapVm;
  readonly commodityVm = this.store.commodityVm;
  readonly supplierVm = this.store.supplierVm;
  readonly collaborationVm = this.store.collaborationVm;
  readonly knowledgeVm = this.store.knowledgeVm;

  ngOnInit(): void {
    this.store.initialize(this.route, this.router);
  }

  onPeriodGranularityChange(value: ImportationPeriodGranularity): void {
    this.store.setPeriodGranularity(value);
  }

  onPeriodValueChange(value: string | null): void {
    this.store.setPeriodValue(value);
  }

  onOriginScopeChange(value: ImportationOriginScope): void {
    this.store.setOriginScope(value);
  }

  onOriginCodesChange(codes: readonly string[]): void {
    this.store.setOriginCodes(codes);
  }

  onHsSectionToggle(section: string): void {
    this.store.toggleHsSection(section);
  }

  onCompareToggle(): void {
    this.store.toggleCompareMode();
  }

  onCompareWithChange(value: string | null): void {
    this.store.setCompareWith(value);
  }

  onTimelineSelect(value: string): void {
    this.store.selectTimeline(value);
  }

  onTimelinePlayToggle(): void {
    this.store.toggleTimelinePlayback();
  }

  onOriginSelect(originCode: string): void {
    this.store.drilldownOrigin(originCode);
  }

  onCompareTargetChange(value: string): void {
    this.store.setCompareWith(value);
  }

  onCommodityTabChange(tab: ImportationCommodityTab): void {
    this.store.setActiveTab(tab);
  }

  onCommoditySelect(id: string | null): void {
    this.store.selectCommodity(id);
  }

  onExportRequest(type: 'csv' | 'json' | 'look'): void {
    this.store.requestExport(type);
  }

  onCreateWatchlist(name: string): void {
    this.store.createWatchlist(name);
  }

  onScheduleReport(payload: {
    recipients: readonly string[];
    format: 'csv' | 'json' | 'look';
    frequency: 'weekly' | 'monthly' | 'quarterly';
    notes?: string;
  }): void {
    this.store.scheduleReport(payload);
  }
}
