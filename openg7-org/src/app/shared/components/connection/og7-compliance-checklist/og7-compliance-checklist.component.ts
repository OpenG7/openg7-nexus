import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-compliance-checklist',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-compliance-checklist.component.html',
  styleUrls: ['./og7-compliance-checklist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/connection » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Compliance Checklist ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7ComplianceChecklistComponent gérée par le framework.
 */
export class Og7ComplianceChecklistComponent {
  readonly ndaSelected = input(false);
  readonly rfqSelected = input(false);
  readonly ndaPreviewUrl = input<string | null>(null);
  readonly rfqPreviewUrl = input<string | null>(null);
  readonly disabled = input(false);

  readonly ndaChange = output<boolean>();
  readonly rfqChange = output<boolean>();

  protected readonly ndaChecked = computed(() => Boolean(this.ndaSelected()));
  protected readonly rfqChecked = computed(() => Boolean(this.rfqSelected()));
  protected readonly ndaPreview = computed(() => this.normalizeUrl(this.ndaPreviewUrl()));
  protected readonly rfqPreview = computed(() => this.normalizeUrl(this.rfqPreviewUrl()));
  protected readonly selectionCount = computed(
    () => Number(this.ndaChecked()) + Number(this.rfqChecked()),
  );

  protected onNdaToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const checked = Boolean(inputElement?.checked);
    this.ndaChange.emit(checked);
  }

  protected onRfqToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const checked = Boolean(inputElement?.checked);
    this.rfqChange.emit(checked);
  }

  protected toggleNda(): void {
    if (this.disabled()) {
      return;
    }
    this.ndaChange.emit(!this.ndaChecked());
  }

  protected toggleRfq(): void {
    if (this.disabled()) {
      return;
    }
    this.rfqChange.emit(!this.rfqChecked());
  }

  private normalizeUrl(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
