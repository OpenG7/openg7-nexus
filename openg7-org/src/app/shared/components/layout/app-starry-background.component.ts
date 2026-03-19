import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxStarrySkyComponent } from '@omnedia/ngx-starry-sky';

@Component({
  selector: 'og7-app-starry-background',
  standalone: true,
  imports: [NgxStarrySkyComponent],
  host: {
    'data-og7': 'app-background',
  },
  template: `
    <div class="particles">
      <om-starry-sky
        class="app-starry-sky"
        [skyColor]="skyColor"
        [starsBackgroundConfig]="starsBackgroundConfig"
        [shootingStarsConfig]="shootingStarsConfig"
        [disableShootingStars]="false"
        styleClass="app-starry-sky"
        aria-hidden="true"
      ></om-starry-sky>
      <div class="particles-gradient"></div>
    </div>
  `,
  styles: [
    `
      .particles {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }

      .particles om-starry-sky {
        display: block;
        width: 100%;
        height: 100%;
        opacity: 0.6;
        position: absolute;
        inset: 0;
      }

      .particles-gradient {
        position: absolute;
        width: 100%;
        height: 100%;
        -webkit-mask-image: radial-gradient(350px 200px at top, transparent 20%, #fff);
        mask-image: radial-gradient(350px 150px at top, transparent 20%, #fff);
        background-color: rgba(15, 23, 42, 0.08);
        z-index: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStarryBackgroundComponent {
  protected readonly skyColor = 'transparent';
  protected readonly starsBackgroundConfig = {
    starDensity: 0.0002,
    maxStars: 2000,
    twinkleProbability: 0.15,
    milkyWayIntensity: 0.8,
    milkyWayWidth: 0.45,
    milkyWayAngle: -8,
    nebulaIntensity: 0.55,
    colorVariance: 0.35,
    twinkleStrength: 0.25,
  };
  protected readonly shootingStarsConfig = {
    minSpeed: 15,
    maxSpeed: 32,
    minDelay: 1100,
    maxDelay: 5200,
    starColor: '#F6FF0E',
    trailColor: '#7dd3fc',
    starWidth: 12,
    starHeight: 1,
  };
}
