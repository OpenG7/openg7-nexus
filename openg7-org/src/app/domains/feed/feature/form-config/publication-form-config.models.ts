import { FeedComposerDraft, FeedItemType, FlowMode, QuantityUnit } from '../models/feed.models';

export type PublicationActorType =
  | 'utility'
  | 'manufacturer'
  | 'government'
  | 'distributor'
  | 'port'
  | 'logistics'
  | 'other';

export type PublicationFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'email';

export type PublicationValidatorType =
  | 'required'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'dateOrder'
  | 'custom';

export type PublicationConditionOperator = 'equals' | 'notEquals' | 'in' | 'notIn' | 'truthy' | 'falsy';

export interface PublicationFieldOption {
  readonly value: string | number | boolean;
  readonly labelKey: string;
  readonly hintKey?: string;
}

export interface PublicationFieldValidator {
  readonly type: PublicationValidatorType;
  readonly value?: string | number | boolean | readonly string[];
  readonly compareWithField?: string;
  readonly errorKey: string;
}

export interface PublicationFieldCondition {
  readonly field: string;
  readonly operator: PublicationConditionOperator;
  readonly value?: string | number | boolean | readonly string[];
}

export interface PublicationFieldConfig {
  readonly key: string;
  readonly type: PublicationFieldType;
  readonly labelKey: string;
  readonly placeholderKey?: string;
  readonly helpKey?: string;
  readonly required?: boolean;
  readonly defaultValue?: string | number | boolean | readonly string[] | null;
  readonly options?: readonly PublicationFieldOption[];
  readonly validators?: readonly PublicationFieldValidator[];
  readonly visibleWhen?: readonly PublicationFieldCondition[];
  readonly width?: 'full' | 'half';
}

export interface PublicationFormSection {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey?: string;
  readonly fields: readonly PublicationFieldConfig[];
}

export interface PublicationConstantBinding {
  readonly kind: 'constant';
  readonly value: string | number | boolean | null;
}

export interface PublicationFieldBinding {
  readonly kind: 'field';
  readonly field: string;
}

export interface PublicationArrayBinding {
  readonly kind: 'array';
  readonly fields: readonly string[];
}

export type PublicationBinding =
  | PublicationConstantBinding
  | PublicationFieldBinding
  | PublicationArrayBinding;

export interface PublicationDraftMapping {
  readonly defaults?: Partial<FeedComposerDraft> & {
    readonly type?: FeedItemType | null;
    readonly mode?: FlowMode;
    readonly quantity?: { readonly unit?: QuantityUnit } | null;
  };
  readonly bindings: Partial<Record<keyof FeedComposerDraft | 'quantity.value' | 'quantity.unit', PublicationBinding>>;
  readonly extensions?: Readonly<Record<string, PublicationBinding>>;
}

export interface PublicationFormConfig {
  readonly formKey: string;
  readonly schemaVersion: number;
  readonly titleKey: string;
  readonly descriptionKey?: string;
  readonly actorTypes: readonly PublicationActorType[];
  readonly sectorId: string;
  readonly tags?: readonly string[];
  readonly sections: readonly PublicationFormSection[];
  readonly draftMapping: PublicationDraftMapping;
}
