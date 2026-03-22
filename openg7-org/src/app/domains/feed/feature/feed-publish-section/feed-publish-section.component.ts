import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { selectProvinces } from '@app/state/catalog/catalog.selectors';
import { feedFormKeySig, fromProvinceIdSig, sectorIdSig } from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith } from 'rxjs/operators';

import { Og7DynamicPublicationFormComponent } from '../dynamic-publication-form/og7-dynamic-publication-form.component';
import {
  buildFeedDraftPrefillClearQueryParams,
  buildFeedDraftPrefillKey,
} from '../feed-draft-prefill.helpers';
import { PublicationFieldOption } from '../form-config/publication-form-config.models';
import { PublicationFormConfigService } from '../form-config/publication-form-config.service';
import { PublicationFormMapperService } from '../form-config/publication-form-mapper.service';
import { Og7FeedComposerComponent } from '../og7-feed-composer/og7-feed-composer.component';
import { FeedRealtimeService } from '../services/feed-realtime.service';

@Component({
  selector: 'og7-feed-publish-section',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, Og7FeedComposerComponent, Og7DynamicPublicationFormComponent],
  templateUrl: './feed-publish-section.component.html',
  styleUrl: './feed-publish-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedPublishSectionComponent {
  private readonly auth = inject(AuthService);
  private readonly feed = inject(FeedRealtimeService);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formConfigService = inject(PublicationFormConfigService);
  private readonly formMapper = inject(PublicationFormMapperService);
  private readonly authLinkRef = viewChild<ElementRef<HTMLAnchorElement>>('authLink');
  private readonly publishButtonRef = viewChild<ElementRef<HTMLButtonElement>>('publishButton');
  private readonly composerRef = viewChild<{ focusPrimaryField?: () => void }>('composer');
  private readonly templateFormRef = viewChild<{ focusPrimaryField?: () => void }>('templateForm');
  private readonly pendingAutoFocus = signal(false);
  private readonly autoOpenedDraftKey = signal<string | null>(null);

  private readonly redirectTargetSig = toSignal(
    this.router.events.pipe(
      startWith(null),
      map(() => this.resolveInternalUrl())
    ),
    { initialValue: this.resolveInternalUrl() }
  );
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly redirectTarget = computed(() => this.redirectTargetSig());
  protected readonly drawerOpen = signal(false);
  protected readonly hasDraftPrefill = computed(() => Boolean(this.buildDraftKey()));
  protected readonly publishMode = signal<'generic' | 'template'>('generic');
  protected readonly selectedTemplateKey = signal('energy-surplus-offer');
  private readonly publishModeTouched = signal(false);
  private readonly templateTouched = signal(false);
  protected readonly templateSubmitState = signal<'idle' | 'submitting' | 'success' | 'error' | 'offline'>('idle');
  protected readonly templateSubmitError = signal<string | null>(null);
  protected readonly templateErrors = signal<readonly string[]>([]);
  protected readonly templateWarnings = signal<readonly string[]>([]);
  protected readonly availableTemplates = this.formConfigService.list();
  protected readonly activeTemplateConfig = computed(() => this.formConfigService.get(this.selectedTemplateKey()));
  private readonly recommendedTemplateKey = computed(() => {
    const explicitFormKey = feedFormKeySig();
    if (explicitFormKey && this.formConfigService.get(explicitFormKey)) {
      return explicitFormKey;
    }

    if (sectorIdSig() === 'energy' && fromProvinceIdSig() === 'ab') {
      return 'hydrocarbon-surplus-offer';
    }

    return 'energy-surplus-offer';
  });
  private readonly recommendedPublishMode = computed<'generic' | 'template'>(() => {
    const explicitFormKey = feedFormKeySig();
    if (explicitFormKey && this.formConfigService.get(explicitFormKey)) {
      return 'template';
    }

    return this.recommendedTemplateKey() === 'hydrocarbon-surplus-offer' ? 'template' : 'generic';
  });
  private readonly provinces = this.store.selectSignal(selectProvinces);
  protected readonly templateFieldOptions = computed<Record<string, readonly PublicationFieldOption[]>>(() => {
    const provinces = this.provinces().map((province) => ({
      value: province.id,
      labelKey: province.name,
    }));
    return {
      fromProvinceId: provinces,
      toProvinceId: provinces,
    };
  });

  constructor() {
    effect(() => {
      const recommended = this.recommendedTemplateKey();
      if (!this.templateTouched() && this.selectedTemplateKey() !== recommended) {
        this.selectedTemplateKey.set(recommended);
      }
    });

    effect(() => {
      const recommended = this.recommendedPublishMode();
      if (!this.publishModeTouched() && this.publishMode() !== recommended) {
        this.publishMode.set(recommended);
      }
    });

    effect(() => {
      if (!this.drawerOpen() || !this.pendingAutoFocus()) {
        return;
      }

      if (this.isAuthenticated()) {
        const target = this.publishMode() === 'template' ? this.templateFormRef() : this.composerRef();
        if (!target?.focusPrimaryField) {
          return;
        }
        this.pendingAutoFocus.set(false);
        this.scheduleFocus(() => target.focusPrimaryField?.());
        return;
      }

      const authLink = this.authLinkRef();
      if (!authLink) {
        return;
      }

      this.pendingAutoFocus.set(false);
      this.scheduleFocus(() => authLink.nativeElement.focus());
    });

    effect(() => {
      const draftKey = this.buildDraftKey();
      if (!draftKey) {
        if (this.autoOpenedDraftKey() !== null) {
          this.autoOpenedDraftKey.set(null);
        }
        return;
      }

      if (draftKey === this.autoOpenedDraftKey()) {
        return;
      }

      this.autoOpenedDraftKey.set(draftKey);
      this.openDrawer();
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    if (!this.drawerOpen()) {
      return;
    }
    event.preventDefault();
    this.closeDrawer();
  }

  focusPrimaryAction(): void {
    this.openDrawer();
  }

  protected openDrawer(): void {
    this.publishModeTouched.set(false);
    this.templateTouched.set(false);
    this.drawerOpen.set(true);
    this.pendingAutoFocus.set(true);
  }

  protected setPublishMode(mode: 'generic' | 'template'): void {
    if (this.publishMode() === mode) {
      return;
    }
    this.publishModeTouched.set(true);
    this.publishMode.set(mode);
    this.resetTemplateSubmitState();
    this.pendingAutoFocus.set(true);
  }

  protected selectTemplate(formKey: string): void {
    if (this.selectedTemplateKey() === formKey) {
      return;
    }
    this.templateTouched.set(true);
    this.selectedTemplateKey.set(formKey);
    this.resetTemplateSubmitState();
    this.pendingAutoFocus.set(true);
  }

  protected async handleTemplateSubmitted(rawValue: Record<string, unknown>): Promise<void> {
    const config = this.activeTemplateConfig();
    if (!config || this.templateSubmitState() === 'submitting') {
      return;
    }

    this.templateSubmitError.set(null);
    this.templateErrors.set([]);
    this.templateWarnings.set([]);

    if (!this.feed.connectionState.connected()) {
      this.templateSubmitState.set('offline');
      this.templateSubmitError.set('feed.error.offline');
      return;
    }

    const submission = this.formMapper.map(config, rawValue);
    this.templateSubmitState.set('submitting');
    const outcome = await this.feed.publishDraft(submission.draft, {
      metadata: {
        publicationForm: {
          formKey: config.formKey,
          schemaVersion: config.schemaVersion,
        },
        extensions: submission.extensions,
      },
    });
    this.templateErrors.set(outcome.validation.errors);
    this.templateWarnings.set(outcome.validation.warnings);

    if (outcome.status === 'validation-error') {
      this.templateSubmitState.set('error');
      return;
    }

    if (outcome.status === 'request-error') {
      this.templateSubmitState.set('error');
      this.templateSubmitError.set(outcome.error ?? 'feed.error.generic');
      return;
    }

    this.templateSubmitState.set('success');
    this.handlePublished();
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }

    this.drawerOpen.set(false);
    this.pendingAutoFocus.set(false);
    this.restoreTriggerFocus();
  }

  protected onBackdropClick(): void {
    this.closeDrawer();
  }

  protected handlePublished(): void {
    this.resetTemplateSubmitState();
    this.clearDraftQueryParams();
    this.closeDrawer();
  }

  private resetTemplateSubmitState(): void {
    this.templateSubmitState.set('idle');
    this.templateSubmitError.set(null);
    this.templateErrors.set([]);
    this.templateWarnings.set([]);
  }

  private resolveInternalUrl(): string {
    const navigation = this.router.getCurrentNavigation();
    const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? this.router.url;
    if (typeof url !== 'string') {
      return '/feed';
    }

    const normalized = url.trim();
    if (!normalized) {
      return '/feed';
    }

    return normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`;
  }

  private restoreTriggerFocus(): void {
    const button = this.publishButtonRef();
    if (!button) {
      return;
    }

    this.scheduleFocus(() => button.nativeElement.focus());
  }

  private scheduleFocus(action: () => void): void {
    setTimeout(action, 0);
  }

  private buildDraftKey(): string | null {
    return buildFeedDraftPrefillKey(this.queryParamMap());
  }

  private clearDraftQueryParams(): void {
    if (!this.buildDraftKey()) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildFeedDraftPrefillClearQueryParams(),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
