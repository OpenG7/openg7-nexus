import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IncotermCode, TransportMode } from '@app/core/models/connection';
import { TranslateModule } from '@ngx-translate/core';

interface TransportOption {
  readonly mode: TransportMode;
  readonly labelKey: string;
  readonly icon: string;
}

interface IncotermOption {
  readonly code: IncotermCode;
  readonly labelKey: string;
  readonly descriptionKey: string;
}

const TRANSPORT_OPTIONS: readonly TransportOption[] = [
  { mode: 'road', labelKey: 'introBillboard.transport.road', icon: '🚚' },
  { mode: 'rail', labelKey: 'introBillboard.transport.rail', icon: '🚆' },
  { mode: 'air', labelKey: 'introBillboard.transport.air', icon: '✈️' },
  { mode: 'sea', labelKey: 'introBillboard.transport.sea', icon: '🚢' },
];

const INCOTERM_OPTIONS: readonly IncotermOption[] = [
  {
    code: 'FCA',
    labelKey: 'introBillboard.incoterms.FCA',
    descriptionKey: 'introBillboard.incotermsDesc.FCA',
  },
  {
    code: 'FOB',
    labelKey: 'introBillboard.incoterms.FOB',
    descriptionKey: 'introBillboard.incotermsDesc.FOB',
  },
  {
    code: 'DDP',
    labelKey: 'introBillboard.incoterms.DDP',
    descriptionKey: 'introBillboard.incotermsDesc.DDP',
  },
  {
    code: 'CPT',
    labelKey: 'introBillboard.incoterms.CPT',
    descriptionKey: 'introBillboard.incotermsDesc.CPT',
  },
  {
    code: 'DAP',
    labelKey: 'introBillboard.incoterms.DAP',
    descriptionKey: 'introBillboard.incotermsDesc.DAP',
  },
];

@Component({
  selector: 'og7-incoterms-ribbon',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-incoterms-ribbon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/logistics » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Incoterms Ribbon ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7IncotermsRibbonComponent gérée par le framework.
 */
export class Og7IncotermsRibbonComponent {
  readonly selectedTransports = input<readonly TransportMode[]>([]);
  readonly selectedIncoterm = input<IncotermCode | null>(null);

  readonly transportsChange = output<TransportMode[]>();
  readonly incotermChange = output<IncotermCode | null>();

  protected readonly transportOptions = TRANSPORT_OPTIONS;
  protected readonly incotermOptions = INCOTERM_OPTIONS;

  protected isSelectedTransport(mode: TransportMode): boolean {
    return (this.selectedTransports() ?? []).includes(mode);
  }

  protected transportClass(mode: TransportMode): string {
    return this.isSelectedTransport(mode)
      ? 'ring-card shadow-card bg-[#e0f2fe] text-[#1d4ed8]'
      : 'ring-card bg-surface text-subtle hover:text-title';
  }

  protected incotermClass(code: IncotermCode): string {
    return this.isIncotermSelected(code)
      ? 'ring-card shadow-card bg-[#ecfdf5] text-[#166534]'
      : 'ring-card bg-surface text-subtle hover:text-title';
  }

  protected isIncotermSelected(code: IncotermCode): boolean {
    return this.selectedIncoterm() === code;
  }

  protected onTransportToggle(mode: TransportMode): void {
    const current = new Set(this.selectedTransports() ?? []);
    if (current.has(mode)) {
      current.delete(mode);
    } else {
      current.add(mode);
    }
    this.transportsChange.emit(Array.from(current));
  }

  protected onIncotermSelect(code: IncotermCode): void {
    const current = this.selectedIncoterm();
    this.incotermChange.emit(current === code ? null : code);
  }
}
