import { ProvinceCode, SectorType } from './opportunity';

export interface LocalizedText {
  readonly fr: string;
  readonly en: string;
}

export interface PartnerIdentifier {
  readonly type: string;
  readonly value: string;
}

export interface PartnerAddress {
  readonly line1: string;
  readonly line2?: string | null;
  readonly city: string;
  readonly province: ProvinceCode;
  readonly postalCode?: string | null;
  readonly country?: string | null;
}

export type SocialLinkType =
  | 'website'
  | 'linkedin'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'email'
  | 'phone'
  | 'custom';

export interface SocialLink {
  readonly type: SocialLinkType;
  readonly url: string;
  readonly label?: string;
}

export interface LeadershipContact {
  readonly name: string;
  readonly title?: string;
  readonly email?: string;
  readonly phone?: string;
}

export type PartnerVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'correctionRequested'
  | 'rejected'
  | 'suspended';

export type PartnerVerificationSourceType = 'registry' | 'chamber' | 'audit' | 'other';

export type PartnerVerificationBadgeStatus = 'pending' | 'validated' | 'revoked';

export interface PartnerVerificationSource {
  readonly id?: number | null;
  readonly name: string;
  readonly type: PartnerVerificationSourceType;
  readonly status: PartnerVerificationBadgeStatus;
  readonly referenceId?: string | null;
  readonly url?: string | null;
  readonly evidenceUrl?: string | null;
  readonly issuedAt?: string | null;
  readonly lastCheckedAt?: string | null;
  readonly notes?: string | null;
}

export type PartnerTrustRecordType = 'transaction' | 'evaluation';

export type PartnerTrustDirection = 'inbound' | 'outbound';

export interface PartnerTrustRecord {
  readonly id?: number | null;
  readonly label: string;
  readonly type: PartnerTrustRecordType;
  readonly direction: PartnerTrustDirection;
  readonly occurredAt: string;
  readonly amount?: number | null;
  readonly score?: number | null;
  readonly notes?: string | null;
}

export interface PartnerProfile {
  readonly id: number;
  readonly role: 'buyer' | 'supplier';
  readonly legalName: string;
  readonly displayName?: string;
  readonly sector?: SectorType;
  readonly province?: ProvinceCode;
  readonly logoUrl?: string | null;
  readonly registrationIds?: readonly PartnerIdentifier[];
  readonly address?: PartnerAddress;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly website?: string | null;
  readonly socials?: readonly SocialLink[];
  readonly leadership?: readonly LeadershipContact[];
  readonly mission?: LocalizedText | null;
  readonly highlights?: readonly string[];
  readonly verificationStatus?: PartnerVerificationStatus;
  readonly trustScore?: number | null;
  readonly verificationSources?: readonly PartnerVerificationSource[];
  readonly trustHistory?: readonly PartnerTrustRecord[];
}

export interface FinancingBanner {
  readonly id: string;
  readonly province: ProvinceCode;
  readonly sector: SectorType;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly ctaLabel: LocalizedText;
  readonly ctaUrl: string;
}
