import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type ArrayLikeValue<T> = T | T[];

@Component({
  standalone: true,
  selector: 'og7-governance-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './governance.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Governance » du dossier « domains/static/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns GovernancePage gérée par le framework.
 */
export class GovernancePage {
  private readonly translate = inject(TranslateService);

  protected commitments(): Array<{ title: string; copy: string }> {
    return this.asArray('pages.governance.commitments');
  }

  protected anchors(): Array<{ id: string; label: string }> {
    return this.asArray('pages.governance.anchors');
  }

  protected boardMembers(): Array<{
    name: string;
    role: string;
    background: string;
    focus: string;
  }> {
    return this.asArray('pages.governance.board.members');
  }

  protected boardMandate(): string[] {
    return this.asArray('pages.governance.board.mandate');
  }

  protected boardCadence(): string[] {
    return this.asArray('pages.governance.board.cadence');
  }

  protected advisoryGroups(): Array<{ name: string; focus: string; meets: string }> {
    return this.asArray('pages.governance.advisory.groups');
  }

  protected processSteps(): Array<{ title: string; description: string; deliverables?: string[] }> {
    return this.asArray('pages.governance.process.steps');
  }

  protected transparencyItems(): string[] {
    return this.asArray('pages.governance.transparency.items');
  }

  protected timelineMilestones(): Array<{ quarter: string; title: string }> {
    return this.asArray('pages.governance.timeline.milestones');
  }

  private asArray<T>(key: string): T[] {
    const value = this.translate.instant(key) as ArrayLikeValue<T> | string | undefined;
    if (!value || value === key) {
      return [];
    }
    return Array.isArray(value) ? (value as T[]) : [value as T];
  }
}
