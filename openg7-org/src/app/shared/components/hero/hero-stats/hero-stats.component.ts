import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * Composant "badges de stats" pour OpenG7
 * - Standalone, signal-first
 * - Tailwind pour le style (pas de SCSS requis)
 * - Accessibilité: focus-ring, roles list/listitem
 */
export interface StatMetric {
  id: 'tradeValue' | 'exchangeQty' | 'sectors';
  labelKey: string; // ex: 'metrics.tradeValue'
  value: number; // ex: 3000000000
  kind: 'money' | 'count'; // formatage
  suffixKey?: string; // ex: 'metrics.transactions'
  color?: string; // ex: 'bg-sky-500'
  /** Variation en %, positive ou négative (optionnel) */
  delta?: number;
  /** Série pour sparkline (optionnel) */
  series?: number[];
}

type StatViewModel = StatMetric & {
  display: string;
  rawValue: number;
  sparkPath?: string;
  sparkArea?: string;
};

@Component({
  selector: 'og7-hero-stats',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  providers: [CurrencyPipe],
  templateUrl: './hero-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/hero » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Hero Stats ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HeroStatsComponent gérée par le framework.
 */
export class HeroStatsComponent {
  private readonly translate = inject(TranslateService);
  private readonly currency = inject(CurrencyPipe);

  /** Entrée signal: les métriques à afficher */
  stats = input.required<StatMetric[]>();

  /** Locale courante pour le formatage */
  private readonly locale = computed(() => this.translate.currentLang || 'en');

  /** Vue formatée */
  readonly formattedStats = computed<StatViewModel[]>(() => {
    const loc = this.locale();
    const list = this.stats();
    return list.map((s) => {
      const display =
        s.kind === 'money'
          ? (this.currency.transform(s.value, 'CAD', 'symbol', '1.0-1', loc) ?? String(s.value))
          : new Intl.NumberFormat(loc, {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(s.value);

      const vm: StatViewModel = { ...s, display, rawValue: s.value };

      if (s.series && s.series.length >= 2) {
        const { path, area } = makeSparkPaths(s.series, 120, 28);
        vm.sparkPath = path;
        vm.sparkArea = area;
      }

      return vm;
    });
  });

  trackId = (_: number, item: StatMetric) => item.id;
}

/** Génère des paths SVG (ligne + aire) pour une mini sparkline. */
function makeSparkPaths(series: number[], width = 120, height = 28) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const n = series.length;
  const stepX = width / (n - 1);

  const points = series.map((v, i) => {
    const x = Math.round(i * stepX * 100) / 100;
    const yNorm = (v - min) / span;
    const y = Math.round((height - yNorm * height) * 100) / 100;
    return [x, y] as const;
  });

  const path = 'M ' + points.map((p) => `${p[0]} ${p[1]}`).join(' L ');
  const area =
    `M 0 ${height} L ` +
    points.map((p) => `${p[0]} ${p[1]}`).join(' L ') +
    ` L ${width} ${height} Z`;

  return { path, area };
}
