import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface HeroCta {
  label: string;
  trackingType: string;
  routerLink?: string | Array<string | number>;
  href?: string;
  ariaLabel?: string;
}

export interface HeroCtaClickEvent {
  cta: HeroCta;
  trackingType: string;
  event: MouseEvent;
}

@Component({
  selector: 'og7-hero-ctas',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, MatButtonModule],
  templateUrl: './hero-ctas.component.html',
  host: {
    class: 'hero-ctas flex flex-wrap gap-3 justify-start',
  },
})
export class HeroCtasComponent {
  @Input() primaryCta: HeroCta | null = {
    label: 'hero.actions.viewSectors',
    routerLink: '/sectors',
    trackingType: 'view-sectors',
  };

  @Input() secondaryCta: HeroCta | null = {
    label: 'hero.actions.proMode',
    routerLink: '/pricing',
    trackingType: 'pro-mode',
  };

  @Input() tertiaryCta: HeroCta | null = {
    label: 'hero.actions.preview',
    routerLink: '/preview/homepage',
    trackingType: 'preview',
  };

  @Output() readonly ctaClicked = new EventEmitter<HeroCtaClickEvent>();

  onCtaClick(event: MouseEvent, cta: HeroCta): void {
    this.ctaClicked.emit({ cta, trackingType: cta.trackingType, event });
  }
}
