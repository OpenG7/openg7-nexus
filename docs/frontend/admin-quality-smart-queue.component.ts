import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroCheckCircle, 
  heroExclamationTriangle, 
  heroClock, 
  heroCubeTransparent,
  heroArrowPath
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'og7-admin-quality-smart-queue',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      heroCheckCircle, 
      heroExclamationTriangle, 
      heroClock, 
      heroCubeTransparent,
      heroArrowPath 
    })
  ],
  template: `
    <div class="space-y-6" data-og7="admin-quality-smart-queue">
      <!-- Health Cockpit -->
      <div [class]="healthClass()" class="p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors shadow-sm">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
             <ng-icon [name]="healthIcon()" class="text-2xl"></ng-icon>
          </div>
          <div>
            <p class="font-bold text-base tracking-tight">{{ healthTitle() }}</p>
            <p class="text-xs opacity-80 leading-relaxed max-w-md">{{ healthDescription() }}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3 bg-white/10 p-2 rounded-xl border border-white/10">
          <div class="flex flex-col gap-1">
             <label for="qa-scope" class="text-[10px] uppercase font-bold px-1 opacity-60">Scope d'analyse</label>
             <select #scopeSelect id="qa-scope" class="text-xs bg-slate-900/40 border border-white/20 rounded-lg px-3 py-2 outline-none cursor-pointer">
               <option value="refresh-required">Signaux récents uniquement</option>
               <option value="all">Audit toute la matrice (Global)</option>
             </select>
          </div>
          <button (click)="recalculate.emit(scopeSelect.value)" 
                  class="mt-auto text-xs font-bold px-5 py-2.5 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all shadow-md active:scale-95">
            Générer le plan QA
          </button>
        </div>
      </div>

      <!-- Localhost Impact Simulator -->
      <div class="bg-slate-900/5 border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h4 class="text-xs font-bold uppercase text-slate-600 tracking-wider">Simulateur d'impact local</h4>
          </div>
          <span class="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded border italic">Mode Localhost</span>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
          <input #fileInput type="text" 
                 (keyup.enter)="onManualSync(fileInput.value); fileInput.value = ''"
                 placeholder="Chemin du fichier (ex: openg7-org/src/app/domains/feed/feature/feed.page.ts)" 
                 class="flex-grow text-xs px-4 py-3 border border-slate-200 rounded-xl shadow-inner outline-none bg-white focus:ring-2 focus:ring-blue-500/20">
          <button (click)="onManualSync(fileInput.value); fileInput.value = ''" 
                  class="text-xs font-bold px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all shadow-sm active:scale-95 flex items-center gap-2">
            <ng-icon name="heroArrowPath" class="text-sm"></ng-icon>
            Ingérer manuellement
          </button>
        </div>
        <p class="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
           <ng-icon name="heroCubeTransparent"></ng-icon>
           Force l'état "Refresh" sur les lignes de matrice impactées par ce fichier.
        </p>
      </div>

      <!-- Smart Backlog Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        @for (bucket of buckets(); track bucket.label) {
          <div class="bg-slate-50/50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div class="px-5 py-4 border-b border-slate-200/60 bg-white flex items-center justify-between">
              <h3 class="font-bold text-[11px] uppercase tracking-[0.12em] text-slate-500">{{ bucket.label }}</h3>
              <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm">{{ bucket.items.length }}</span>
            </div>
            
            <div class="p-3 space-y-3 flex-grow overflow-y-auto max-h-[500px]">
              @for (item of bucket.items; track item.id) {
                <div class="p-4 border border-slate-200 rounded-xl hover:border-primary/40 hover:shadow-md cursor-pointer transition-all bg-white group relative overflow-hidden">
                  <div *ngIf="item.priority === 'haute'" class="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold truncate pr-2 text-slate-800">{{ item.domain }}</span>
                    <ng-icon *ngIf="item.priority === 'haute'" name="heroExclamationTriangle" class="text-rose-500 text-sm"></ng-icon>
                  </div>
                  
                  <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">{{ item.nextMove }}</p>
                  
                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100">ID: {{ item.id }}</span>
                    @if (item.isRefresh) {
                      <span class="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                        <span class="h-1 w-1 rounded-full bg-blue-600 animate-ping"></span>
                        REFRESH
                      </span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60 text-center">
                  <ng-icon name="heroCheckCircle" class="text-3xl"></ng-icon>
                  <p class="text-xs italic text-balance px-4">Aucune tâche en attente dans ce bucket</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminQualitySmartQueueComponent {
  matrixItems = input.required<any[]>();
  isStale = input<boolean>(false);
  
  recalculate = output<string>(); 
  manualSync = output<string[]>();

  hasRefresh = computed(() => this.matrixItems().some(i => i.isRefresh));
  
  healthClass = computed(() => {
    if (this.isStale()) return 'bg-rose-600 border-rose-500 text-white';
    if (this.hasRefresh()) return 'bg-amber-500 border-amber-400 text-slate-900';
    return 'bg-emerald-600 border-emerald-500 text-white';
  });

  healthIcon = computed(() => this.isStale() ? 'heroExclamationTriangle' : (this.hasRefresh() ? 'heroArrowPath' : 'heroCheckCircle'));
  healthTitle = computed(() => this.isStale() ? 'Matrice désynchronisée' : (this.hasRefresh() ? 'Nouveaux signaux détectés' : 'Cockpit synchronisé'));
  healthDescription = computed(() => this.isStale() ? 'Les données locales sont expirées par rapport au dépôt.' : (this.hasRefresh() ? 'Des modifications de code récentes impactent la matrice. Relancez l\'analyse.' : 'La couverture est alignée avec les dernières modifications.'));

  buckets = computed(() => [
    { label: 'Prêt à développer', items: this.matrixItems().filter(i => i.managementBucket === 'product-gap') },
    { label: 'Preuve requise', items: this.matrixItems().filter(i => i.managementBucket === 'proof-gap') },
    { label: 'Décision produit', items: this.matrixItems().filter(i => i.managementBucket === 'scope-limit') },
    { label: 'Prêt à clôturer', items: this.matrixItems().filter(i => i.managementBucket === 'covered' && i.isRefresh) }
  ]);

  onManualSync(files: string) {
    if (!files?.trim()) return;
    this.manualSync.emit(files.split(',').map(f => f.trim()).filter(Boolean));
  }
}