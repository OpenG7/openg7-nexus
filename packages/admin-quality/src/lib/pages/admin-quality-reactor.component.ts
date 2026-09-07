import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type ReactorInputState = 'ok' | 'stable' | 'scanning' | 'attention' | 'critical' | 'excellent';
type ReactorVisualState = Exclude<ReactorInputState, 'ok'>;
type OrbitDirection = 'cw' | 'ccw';
type ParticleDepth = 'back' | 'mid' | 'front';

interface ReactorCategory {
  readonly key: string;
  readonly labelKey: string;
  readonly count: number;
  readonly color: string;
}

interface ReactorParticle {
  readonly key: string;
  readonly diameter: number;
  readonly scaleY: number;
  readonly tilt: string;
  readonly size: number;
  readonly color: string;
  readonly glow: string;
  readonly duration: string;
  readonly delay: string;
  readonly direction: OrbitDirection;
  readonly depth: ParticleDepth;
}

interface StateTone {
  readonly labelKey: string;
  readonly color: string;
  readonly messageKey: string;
}

interface MetricTone {
  readonly labelKey: string;
  readonly className: string;
}

@Component({
  selector: 'og7-admin-quality-reactor',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './admin-quality-reactor.component.html',
  styleUrl: './admin-quality-reactor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityReactorComponent {
  readonly coveredCount = input.required<number>();
  readonly proofGapCount = input.required<number>();
  readonly productGapCount = input.required<number>();
  readonly notAlignedCount = input.required<number>();
  readonly notEvaluatedCount = input.required<number>();
  readonly isAnalysisRunning = input(false);
  readonly reactorState = input<ReactorInputState>('stable');
  readonly viewPriorityGaps = output<void>();

  readonly radialLineAngles = Array.from({ length: 8 }, (_, index) => index * 45);
  readonly waveHeights = [4, 7, 11, 6, 4, 10, 14, 9, 5, 8, 13, 8, 4, 7, 11, 6];

  readonly totalCount = computed(
    () =>
      this.coveredCount() +
      this.proofGapCount() +
      this.productGapCount() +
      this.notAlignedCount() +
      this.notEvaluatedCount(),
  );

  readonly coveragePercent = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.coveredCount() / total) * 100) : 0;
  });

  readonly coherencePercent = computed(() => {
    const total = this.totalCount();
    const aligned = this.coveredCount() + this.proofGapCount() + this.productGapCount();
    return total > 0 ? Math.round((aligned / total) * 100) : 0;
  });

  readonly completudePercent = computed(() => {
    const total = this.totalCount();
    const evaluated = total - this.notEvaluatedCount();
    return total > 0 ? Math.round((evaluated / total) * 100) : 0;
  });

  readonly visualState = computed<ReactorVisualState>(() => {
    const rawState = this.reactorState();
    const state: ReactorVisualState = rawState === 'ok' ? 'stable' : rawState;
    return state === 'stable' && this.isAnalysisRunning() ? 'scanning' : state;
  });

  readonly stateTone = computed<StateTone>(() => {
    switch (this.visualState()) {
      case 'excellent':
        return {
          labelKey: 'admin.quality.reactor.states.excellent.label',
          color: '#34d399',
          messageKey: 'admin.quality.reactor.states.excellent.message',
        };
      case 'critical':
        return {
          labelKey: 'admin.quality.reactor.states.critical.label',
          color: '#fb7185',
          messageKey: 'admin.quality.reactor.states.critical.message',
        };
      case 'attention':
        return {
          labelKey: 'admin.quality.reactor.states.attention.label',
          color: '#fbbf24',
          messageKey: 'admin.quality.reactor.states.attention.message',
        };
      case 'scanning':
        return {
          labelKey: 'admin.quality.reactor.states.scanning.label',
          color: '#67e8f9',
          messageKey: 'admin.quality.reactor.states.scanning.message',
        };
      default:
        return {
          labelKey: 'admin.quality.reactor.states.stable.label',
          color: '#22d3ee',
          messageKey: 'admin.quality.reactor.states.stable.message',
        };
    }
  });

  readonly reactorStateLabelKey = computed(() => this.stateTone().labelKey);
  readonly reactorStateColorHex = computed(() => this.stateTone().color);
  readonly reactorStateMessageKey = computed(() => this.stateTone().messageKey);

  readonly trendTone = computed<MetricTone>(() => {
    switch (this.visualState()) {
      case 'excellent':
        return {
          labelKey: 'admin.quality.reactor.trends.improving',
          className: 'tone-good',
        };
      case 'critical':
        return {
          labelKey: 'admin.quality.reactor.trends.degrading',
          className: 'tone-danger',
        };
      case 'attention':
        return {
          labelKey: 'admin.quality.reactor.trends.watch',
          className: 'tone-warm',
        };
      case 'scanning':
        return {
          labelKey: 'admin.quality.reactor.trends.analyzing',
          className: 'tone-cyan',
        };
      default:
        return {
          labelKey: 'admin.quality.reactor.trends.stable',
          className: 'tone-good',
        };
    }
  });

  readonly riskTone = computed<MetricTone>(() => {
    switch (this.visualState()) {
      case 'excellent':
        return {
          labelKey: 'admin.quality.reactor.risks.minimal',
          className: 'tone-good',
        };
      case 'critical':
        return {
          labelKey: 'admin.quality.reactor.risks.high',
          className: 'tone-danger',
        };
      case 'attention':
        return {
          labelKey: 'admin.quality.reactor.risks.moderate',
          className: 'tone-warm',
        };
      case 'scanning':
        return {
          labelKey: 'admin.quality.reactor.risks.assessing',
          className: 'tone-cyan',
        };
      default:
        return {
          labelKey: 'admin.quality.reactor.risks.low',
          className: 'tone-good',
        };
    }
  });

  readonly categories = computed<readonly ReactorCategory[]>(() => [
    {
      key: 'covered',
      labelKey: 'admin.quality.reactor.categories.covered',
      count: this.coveredCount(),
      color: '#22d3ee',
    },
    {
      key: 'proof-gap',
      labelKey: 'admin.quality.reactor.categories.proofGap',
      count: this.proofGapCount(),
      color: '#fbbf24',
    },
    {
      key: 'product-gap',
      labelKey: 'admin.quality.reactor.categories.productGap',
      count: this.productGapCount(),
      color: '#fb7185',
    },
    {
      key: 'not-aligned',
      labelKey: 'admin.quality.reactor.categories.notAligned',
      count: this.notAlignedCount(),
      color: '#a78bfa',
    },
    {
      key: 'not-evaluated',
      labelKey: 'admin.quality.reactor.categories.notEvaluated',
      count: this.notEvaluatedCount(),
      color: '#94a3b8',
    },
  ]);

  readonly particles: readonly ReactorParticle[] = [
    {
      key: 'cyan-prime',
      diameter: 384,
      scaleY: 0.28,
      tilt: '0deg',
      size: 13,
      color: '#67e8f9',
      glow: 'rgba(34, 211, 238, 0.98)',
      duration: '15s',
      delay: '-3.4s',
      direction: 'cw',
      depth: 'front',
    },
    {
      key: 'orange-proof',
      diameter: 354,
      scaleY: 0.36,
      tilt: '-24deg',
      size: 10,
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.88)',
      duration: '21s',
      delay: '-9.6s',
      direction: 'ccw',
      depth: 'mid',
    },
    {
      key: 'violet-scope',
      diameter: 314,
      scaleY: 0.56,
      tilt: '34deg',
      size: 9,
      color: '#c4b5fd',
      glow: 'rgba(167, 139, 250, 0.82)',
      duration: '24s',
      delay: '-12s',
      direction: 'ccw',
      depth: 'back',
    },
    {
      key: 'red-risk',
      diameter: 332,
      scaleY: 0.44,
      tilt: '28deg',
      size: 8,
      color: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.74)',
      duration: '19s',
      delay: '-6.8s',
      direction: 'cw',
      depth: 'mid',
    },
    {
      key: 'blue-audit',
      diameter: 424,
      scaleY: 0.46,
      tilt: '-18deg',
      size: 7,
      color: '#93c5fd',
      glow: 'rgba(147, 197, 253, 0.72)',
      duration: '28s',
      delay: '-16s',
      direction: 'cw',
      depth: 'back',
    },
  ];

  particleTrackStyle(particle: ReactorParticle): Record<string, string> {
    return {
      '--particle-diameter': `${particle.diameter}px`,
      '--particle-scale-y': String(particle.scaleY),
      '--particle-tilt': particle.tilt,
      '--particle-duration': particle.duration,
      '--particle-delay': particle.delay,
    };
  }

  particleDotStyle(particle: ReactorParticle): Record<string, string> {
    return {
      '--particle-size': `${particle.size}px`,
      '--particle-color': particle.color,
      '--particle-glow': particle.glow,
      '--particle-counter-scale-y': (1 / particle.scaleY).toFixed(3),
    };
  }

  categoryStyle(category: ReactorCategory): Record<string, string> {
    return {
      '--category-color': category.color,
    };
  }

  categorySignalClass(category: ReactorCategory): string {
    switch (category.key) {
      case 'covered':
        return 'signal-covered';
      case 'proof-gap':
        return 'signal-proof-gap';
      case 'product-gap':
        return 'signal-product-gap';
      case 'not-aligned':
        return 'signal-scope-limit';
      case 'not-evaluated':
        return 'signal-non-evaluated';
      default:
        return '';
    }
  }
}
