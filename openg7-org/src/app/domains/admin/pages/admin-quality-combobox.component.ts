import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

export interface AdminQualityComboboxOption {
  readonly value: string;
  readonly label: string;
}

let adminQualityComboboxSequence = 0;

@Component({
  standalone: true,
  selector: 'og7-admin-quality-combobox',
  imports: [CommonModule, OverlayModule],
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      class="flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-[#0c1729] px-3.5 py-3 text-left text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition hover:bg-[#10192b] focus-visible:border-cyan-300/45 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listboxId"
      [attr.aria-label]="label()"
      [attr.data-og7-id]="dataOg7Id()"
      data-og7="admin-quality-combobox"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      <span class="min-w-0 truncate">{{ selectedLabel() }}</span>
      <span class="text-xs text-slate-300" aria-hidden="true">v</span>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayMinWidth]="panelMinWidth()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
    >
      <div
        class="og7-admin-quality-combobox-panel max-h-72 overflow-y-auto rounded-2xl border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(3,10,24,0.98),rgba(8,20,38,0.98))] p-1.5 text-sm text-slate-100 shadow-[0_24px_80px_-40px_rgba(8,47,73,0.95)]"
        [attr.id]="listboxId"
        role="listbox"
        [attr.aria-label]="label()"
        [attr.data-og7-id]="dataOg7Id() + '-listbox'"
        data-og7="admin-quality-combobox-listbox"
      >
        @for (option of options(); track option.value; let index = $index) {
        <button
          #optionButton
          type="button"
          role="option"
          class="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          [class.bg-cyan-400/16]="option.value === value()"
          [class.text-white]="option.value === value()"
          [class.text-slate-300]="option.value !== value()"
          [class.hover:bg-white/8]="option.value !== value()"
          [attr.aria-selected]="option.value === value()"
          [attr.data-og7-id]="dataOg7Id() + '-' + option.value"
          data-og7="admin-quality-combobox-option"
          (click)="select(option.value)"
          (keydown)="onOptionKeydown($event, index)"
        >
          <span class="min-w-0 truncate">{{ option.label }}</span>
          @if (option.value === value()) {
          <span class="text-xs font-semibold text-cyan-100" aria-hidden="true">OK</span>
          }
        </button>
        }
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .og7-admin-quality-combobox-panel {
        scrollbar-color: rgba(125, 211, 252, 0.42) rgba(15, 23, 42, 0.72);
        scrollbar-width: thin;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityComboboxComponent {
  readonly label = input('Selection');
  readonly value = input('');
  readonly options = input<readonly AdminQualityComboboxOption[]>([]);
  readonly dataOg7Id = input('admin-quality-combobox');
  readonly valueChange = output<string>();

  protected readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');
  protected readonly open = signal(false);
  protected readonly panelMinWidth = signal(240);
  protected readonly listboxId = `og7-admin-quality-combobox-${++adminQualityComboboxSequence}`;
  protected readonly positions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 6,
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -6,
    },
  ];

  protected readonly selectedLabel = computed(() => {
    const selected = this.options().find((option) => option.value === this.value());
    return selected?.label ?? this.label();
  });

  protected toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    const width = this.triggerRef()?.nativeElement.getBoundingClientRect().width;
    this.panelMinWidth.set(Math.max(width ?? 240, 220));
    this.open.set(true);
    queueMicrotask(() => this.focusSelectedOption());
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(value: string): void {
    this.valueChange.emit(value);
    this.close();
    queueMicrotask(() => this.triggerRef()?.nativeElement.focus());
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPanel();
      return;
    }

    if (event.key === 'Escape') {
      this.close();
    }
  }

  protected onOptionKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.triggerRef()?.nativeElement.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = this.options()[index];
      if (option) {
        this.select(option.value);
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.focusOption(index + delta);
    }
  }

  private focusSelectedOption(): void {
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());
    this.focusOption(selectedIndex >= 0 ? selectedIndex : 0);
  }

  private focusOption(index: number): void {
    const buttons = this.optionButtons();
    if (!buttons.length) {
      return;
    }

    const nextIndex = (index + buttons.length) % buttons.length;
    buttons[nextIndex]?.nativeElement.focus();
  }
}
