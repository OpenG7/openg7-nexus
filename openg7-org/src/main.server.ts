import './ssr-polyfills';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfigServer } from './app/app.config.server';

registerLocaleData(localeFr);

export default function bootstrap(ctx: BootstrapContext) {
  return bootstrapApplication(AppComponent, appConfigServer, ctx);
}
