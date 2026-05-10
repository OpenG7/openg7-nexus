import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'og7-access-denied-page',
  imports: [TranslateModule],
  templateUrl: './access-denied.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Access Denied » du dossier « domains/auth/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AccessDeniedPage gérée par le framework.
 */
export class AccessDeniedPage {}
