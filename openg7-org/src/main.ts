import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

interface RuntimeConfigWindow extends Window {
  __OG7_CONFIG__?: unknown;
}

function ensureRuntimeConfigLoaded(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const runtimeWindow = window as RuntimeConfigWindow;
  const hasConfig = typeof runtimeWindow.__OG7_CONFIG__ !== 'undefined';
  if (hasConfig) {
    return;
  }

  const message = 'Runtime configuration manifest not found. Ensure runtime-config.js is loaded before bootstrapping Angular.';
  if (isDevMode()) {
    console.warn(message);
    return;
  }

  throw new Error(message);
}

registerLocaleData(localeFr);

ensureRuntimeConfigLoaded();

async function bootstrap(): Promise<void> {
  try {
    await bootstrapApplication(AppComponent, appConfig);
  } catch (err) {
    console.error(err);
  }
}

void bootstrap();
