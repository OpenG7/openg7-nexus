import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ConnectionAttachment } from '@app/core/models/connection';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-cta-rail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-cta-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/cta » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Cta Rail ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7CtaRailComponent gérée par le framework.
 */
export class Og7CtaRailComponent {
  readonly creating = input(false);
  readonly disabled = input(false);
  readonly ready = input(false);
  readonly success = input(false);
  readonly attachments = input<readonly ConnectionAttachment[]>([]);
  readonly slotsCount = input(0);

  readonly sendIntro = output<void>();
  readonly proposeSlots = output<void>();
  readonly toggleAttachments = output<void>();

  protected readonly attachmentsLabel = computed(() => {
    const list = this.attachments();
    if (!list || list.length === 0) {
      return '0';
    }
    return `${list.length}`;
  });

  protected readonly slotsLabel = computed(() => {
    const count = this.slotsCount();
    if (!count) {
      return '0';
    }
    return `${count}`;
  });

  protected readonly statusLabel = computed(() => {
    if (this.creating()) {
      return 'introBillboard.statusSending';
    }
    if (this.success()) {
      return 'introBillboard.statusSent';
    }
    if (this.ready()) {
      return 'introBillboard.statusArmed';
    }
    return 'introBillboard.statusIdle';
  });

  protected statusDotClass(): string {
    if (this.creating()) {
      return 'inline-flex h-2.5 w-2.5 rounded-full bg-warning animate-pulse shadow-[0_0_0_6px_rgba(245,158,11,0.28)]';
    }
    if (this.success()) {
      return 'inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_6px_rgba(22,163,74,0.28)]';
    }
    if (this.ready()) {
      return 'inline-flex h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_0_6px_rgba(56,189,248,0.45)]';
    }
    return 'inline-flex h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_0_6px_rgba(255,255,255,0.18)]';
  }
}
