import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostBinding,
  HostListener,
  AfterContentInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  inject,
  forwardRef,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuickSearchLauncherService } from '@app/domains/search/feature/quick-search-modal/quick-search-launcher.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

interface PaletteItem {
  label: string;
  description?: string;
  badge?: string;
  badgeClass?: string;
}

interface PaletteSection {
  title: string;
  items: PaletteItem[];
}

@Component({
  selector: 'og7-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Og7SearchFieldComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => Og7SearchFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './og7-search-field.component.html',
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/search » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Search Field ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7SearchFieldComponent gérée par le framework.
 */
export class Og7SearchFieldComponent implements
  ControlValueAccessor, AfterContentInit, Validator, OnDestroy {

  // --- état & id
  static nextId = 0;
  @HostBinding() id = `og7-search-field-${Og7SearchFieldComponent.nextId++}`;
  @ViewChild('input') input?: ElementRef<HTMLInputElement>;
  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') palettePanel?: ElementRef<HTMLElement>;

  // --- DI
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // --- Inputs conservés
  @Input() debounceMs = 300;
  @Input() queryParamKey?: string;
  private _variant: 'default' | 'compact' | 'hero' | 'toolbar' = 'default';
  @Input() get variant() { return this._variant; }
  set variant(value: 'default' | 'compact' | 'hero' | 'toolbar' | undefined) {
    this._variant = value ?? 'default';
  }
  @Input() quickSearchTrigger = false;
  @Input() quickSearchSource = 'toolbar';
  @Input() persistKey?: string;
  @Input() loading = false;
  @Input() clearable = true;
  @Input() ariaLabel?: string;

  // Accessibilité & règles
  private _placeholder = '';
  @Input() get placeholder() { return this._placeholder; }
  set placeholder(v: string) { this._placeholder = v; }

  private _required = false;
  @Input() get required() { return this._required; }
  set required(v: boolean) { this._required = coerceBooleanProperty(v); }

  private _disabled = false;
  @Input() get disabled() { return this._disabled; }
  set disabled(v: boolean) { this._disabled = coerceBooleanProperty(v); }

  // --- Outputs conservés
  @Output() searchChanged = new EventEmitter<string>();
  @Output() searchCommitted = new EventEmitter<string>();

  // --- CVA
  private onChange = (_value: string) => {};
  onTouched = () => {};

  readonly paletteOpen = signal(false);

  readonly primarySections: ReadonlyArray<PaletteSection> = [
    {
      title: 'Entreprises',
      items: [
        {
          label: 'Enbridge Inc.',
          description: 'Ontario',
          badge: 'Énergie',
          badgeClass: 'bg-cyan-500/20 text-cyan-200'
        },
        {
          label: 'Magna International',
          description: 'Ontario',
          badge: 'Manufacturier',
          badgeClass: 'bg-sky-500/20 text-sky-200'
        }
      ]
    },
    {
      title: 'Secteurs',
      items: [
        {
          label: 'Énergie',
          description: 'Tendances et investissements récents',
          badge: 'Actif',
          badgeClass: 'bg-emerald-500/20 text-emerald-200'
        },
        {
          label: 'Technologie',
          description: 'Croissance des emplois numériques',
          badge: 'Nouveau',
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-200'
        }
      ]
    }
  ];

  readonly secondarySections: ReadonlyArray<PaletteSection> = [
    {
      title: 'Statistiques',
      items: [
        {
          label: 'Filtrer : Énergie',
          badge: 'Raccourci',
          badgeClass: 'bg-cyan-500/20 text-cyan-200'
        }
      ]
    },
    {
      title: 'Actions',
      items: [
        {
          label: 'Créer catéprise',
          badge: '⇧ + N',
          badgeClass: 'bg-slate-800 text-slate-300'
        },
        {
          label: 'Ouvrir carte du Canada',
          badge: '↵',
          badgeClass: 'bg-slate-800 text-slate-300'
        }
      ]
    },
    {
      title: 'Aide',
      items: [
        {
          label: "Afficher l'aide"
        }
      ]
    }
  ];

  readonly valueSig = signal('');
  get value() { return this.valueSig(); }
  set value(val: string) {
    if (val !== this.valueSig()) {
      this.valueSig.set(val);
      this.empty = !val;
      this.onChange(val);
    }
  }

  // --- UI state
  focused = false;
  empty = true;

  // --- variantes host class (si tu veux styler par variant plus tard)
  @HostBinding('class.og7-search') readonly hostBaseClass = true;
  @HostBinding('class.og7-search--default') get hostDefaultClass() { return this.variant === 'default'; }
  @HostBinding('class.og7-search--compact') get hostCompactClass() { return this.variant === 'compact'; }
  @HostBinding('class.og7-search--hero') get hostHeroClass() { return this.variant === 'hero'; }
  @HostBinding('class.og7-search--toolbar') get hostToolbarClass() { return this.variant === 'toolbar'; }

  // --- flux & subs
  private valueChanges = new Subject<string>();
  private sub = new Subscription();

  private quickSearchLauncher = inject(QuickSearchLauncherService);

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterContentInit() {
    // Debounce sur la frappe
    this.sub.add(
      this.valueChanges.pipe(debounceTime(this.debounceMs))
        .subscribe((val) => {
          this.searchChanged.emit(val);
          this.dispatchAnalytics('og7:searchChanged', val, 'typing');
        })
    );

    // Initialisation depuis l’URL ou le storage
    if (this.queryParamKey) {
      const q = this.route.snapshot.queryParamMap.get(this.queryParamKey);
      if (q != null) this.writeValue(q);
      else if (this.persistKey) {
        const stored = localStorage.getItem(this.persistKey);
        if (stored) this.writeValue(stored);
      }
    }
  }

  // --- CVA
  writeValue(value: string | null): void { this.value = value ?? ''; }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // --- Validator
  validate(_control: AbstractControl): ValidationErrors | null {
    return this.required && !this.value ? { required: true } : null;
  }

  // --- UI handlers
  onInput(val: string) {
    this.value = val;
    this.valueChanges.next(val);
  }
  onEscape() {
    if (this.paletteOpen()) {
      this.closePalette();
      return;
    }
    if (this.clearable && !this.disabled && !this.empty) {
      this.clear();
    }
  }
  onFocus() { this.focused = true; }
  onBlur()  { this.focused = false; this.onTouched(); }

  showClear() { return this.clearable && !this.empty && !this.loading && !this.disabled; }

  clear() {
    this.value = '';
    this.valueChanges.next('');
    this.searchChanged.emit('');
    this.dispatchAnalytics('og7:searchChanged', '', 'clear');
    this.focusInput();
  }

  commit(source: 'enter' | 'action') {
    const val = this.value;
    this.searchCommitted.emit(val);
    this.dispatchAnalytics('og7:searchCommitted', val, source);

    if (this.queryParamKey) {
      this.router.navigate([], {
        queryParams: { [this.queryParamKey]: val || null },
        queryParamsHandling: 'merge',
      });
    }
    if (this.persistKey) localStorage.setItem(this.persistKey, val);
  }

  selectSuggestion(value: string) {
    this.value = value;
    this.commit('action');
    this.closePalette();
  }

  openPalette() {
    if (this.disabled) {
      return;
    }
    if (this.quickSearchTrigger) {
      this.quickSearchLauncher.open({ source: this.quickSearchSource, initialQuery: this.value });
      return;
    }
    if (!this.paletteOpen()) {
      this.paletteOpen.set(true);
      setTimeout(() => this.focusInput(), 0);
    }
  }

  closePalette() {
    if (this.paletteOpen()) {
      this.paletteOpen.set(false);
      const trigger = this.triggerButton?.nativeElement;
      if (trigger) {
        setTimeout(() => trigger.focus(), 0);
      }
    }
  }

  private focusInput() {
    const el = this.input?.nativeElement;
    if (el) setTimeout(() => el.focus(), 0);
  }

  private dispatchAnalytics(name: string, value: string, source: string) {
    const ev = new CustomEvent(name, { bubbles: true, detail: { value, source } });
    this.elementRef.nativeElement.dispatchEvent(ev);
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      this.openPalette();
    } else if (key === 'escape' && this.paletteOpen()) {
      event.preventDefault();
      this.closePalette();
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    if (this.quickSearchTrigger) {
      return;
    }
    if (!this.paletteOpen()) return;
    const target = event.target as Node | null;
    if (!target) return;
    const panelEl = this.palettePanel?.nativeElement;
    const triggerEl = this.triggerButton?.nativeElement;
    const insidePanel = panelEl?.contains(target) ?? false;
    const onTrigger = triggerEl?.contains(target) ?? false;
    if (insidePanel || onTrigger) return;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closePalette();
      return;
    }
    this.closePalette();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
