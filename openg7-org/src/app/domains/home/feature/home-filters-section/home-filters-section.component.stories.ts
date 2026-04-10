import { FiltersService } from '@app/core/filters.service';
import { provideStorybookEnTranslations } from '@app/core/i18n/storybook-translate.providers';
import { TranslateModule } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { HomeFiltersSectionComponent } from './home-filters-section.component';


const meta: Meta<HomeFiltersSectionComponent> = {
  title: 'Features/Home/FiltersSection',
  component: HomeFiltersSectionComponent,
  decorators: [
    moduleMetadata({
      imports: [TranslateModule.forRoot()],
      providers: [FiltersService, ...provideStorybookEnTranslations()],
    }),
  ],
};

export default meta;

export const Default: StoryObj<HomeFiltersSectionComponent> = {
  render: () => ({ props: {} }),
};
