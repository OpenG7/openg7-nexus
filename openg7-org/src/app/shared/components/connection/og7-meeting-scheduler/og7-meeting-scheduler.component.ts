import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-meeting-scheduler',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-meeting-scheduler.component.html',
  styleUrls: ['./og7-meeting-scheduler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/connection » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Meeting Scheduler ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7MeetingSchedulerComponent gérée par le framework.
 */
export class Og7MeetingSchedulerComponent {
  readonly slots = input<readonly string[]>([]);
  readonly disabled = input(false);

  readonly slotsChange = output<readonly string[]>();

  protected readonly draftValue = signal('');
  protected readonly hasSlots = computed(() => this.slots().length > 0);
  protected readonly canSubmit = computed(() => {
    if (this.disabled()) {
      return false;
    }
    return this.normalizeValue(this.draftValue()) !== null;
  });

  private readonly formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  protected trackSlot(index: number, value: string): string {
    return `${index}-${value}`;
  }

  protected formattedSlot(value: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return this.formatter.format(date);
  }

  protected handleInput(value: string): void {
    this.draftValue.set(value ?? '');
  }

  protected submitDraft(event: Event): void {
    event.preventDefault();
    this.addCurrentDraft();
  }

  protected addCurrentDraft(): void {
    if (this.disabled()) {
      return;
    }
    const value = this.normalizeValue(this.draftValue());
    if (!value) {
      return;
    }
    const unique = new Set(this.slots());
    unique.add(value);
    const next = Array.from(unique);
    this.slotsChange.emit(next);
    this.draftValue.set('');
  }

  protected removeSlot(index: number): void {
    if (this.disabled()) {
      return;
    }
    const current = [...this.slots()];
    current.splice(index, 1);
    this.slotsChange.emit(current);
  }

  private normalizeValue(raw: string | null | undefined): string | null {
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return trimmed;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
