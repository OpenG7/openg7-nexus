import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type ReactorInputState = 'ok' | 'stable' | 'scanning' | 'attention' | 'critical' | 'excellent';
type ReactorVisualState = Exclude<ReactorInputState, 'ok'>;
type OrbitDirection = 'cw' | 'ccw';
type ParticleDepth = 'back' | 'mid' | 'front';

interface ReactorCategory {
  readonly key: string;
  readonly label: string;
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
  readonly label: string;
  readonly color: string;
  readonly message: string;
}

@Component({
  selector: 'og7-admin-quality-reactor',
  standalone: true,
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
          label: 'Excellent',
          color: '#34d399',
          message: 'La matrice est synchronis\u00e9e, lisible et fortement couverte.',
        };
      case 'critical':
        return {
          label: 'Critique',
          color: '#fb7185',
          message: 'Des \u00e9carts critiques n\u00e9cessitent une intervention imm\u00e9diate.',
        };
      case 'attention':
        return {
          label: 'Attention',
          color: '#fbbf24',
          message:
            'Des \u00e9carts prioritaires n\u00e9cessitent votre attention pour maintenir la r\u00e9silience du syst\u00e8me.',
        };
      case 'scanning':
        return {
          label: 'Scan actif',
          color: '#67e8f9',
          message:
            'Le r\u00e9acteur analyse les signaux de couverture et de preuve en temps r\u00e9el.',
        };
      default:
        return {
          label: 'Stable',
          color: '#22d3ee',
          message: 'Tous les indicateurs sont dans les normes attendues.',
        };
    }
  });

  readonly reactorStateLabel = computed(() => this.stateTone().label);
  readonly reactorStateColorHex = computed(() => this.stateTone().color);
  readonly reactorStateMessage = computed(() => this.stateTone().message);

  readonly categories = computed<readonly ReactorCategory[]>(() => [
    { key: 'covered', label: 'Couverts', count: this.coveredCount(), color: '#22d3ee' },
    { key: 'proof-gap', label: 'Proof-Gap', count: this.proofGapCount(), color: '#fbbf24' },
    { key: 'product-gap', label: 'Product-Gap', count: this.productGapCount(), color: '#fb7185' },
    {
      key: 'not-aligned',
      label: 'Non align\u00e9s',
      count: this.notAlignedCount(),
      color: '#a78bfa',
    },
    {
      key: 'not-evaluated',
      label: 'Non \u00e9valu\u00e9s',
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
