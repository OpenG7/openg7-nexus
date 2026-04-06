import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';

import { createSilentHttpContext } from '../http/error.interceptor.tokens';
import { HttpClientService } from '../http/http-client.service';
import { PartnerProfile } from '../models/partner-profile';

interface StrapiPartnerProfileResponse {
  readonly data: StrapiPartnerProfileEntity | null;
}

interface StrapiPartnerProfileEntity {
  readonly id: number;
  readonly attributes: PartnerProfileAttributes | null;
}

type PartnerProfileAttributes = Omit<Partial<PartnerProfile>, 'role' | 'legalName' | 'displayName'> & {
  readonly legalName?: string | null;
  readonly displayName?: string | null;
  readonly role?: PartnerProfile['role'] | null;
};

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Partner Profile ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PartnerProfileService gérée par le framework.
 */
export class PartnerProfileService {
  private readonly http = inject(HttpClientService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly cache = new Map<string, Observable<PartnerProfile | null>>();

  /**
   * Contexte : Called by partner detail views to load the profile summary for a match participant.
   * Raison d’être : Fetches and caches profiles, falling back to demo fixtures when unavailable.
   * @param id Identifier of the partner profile.
   * @param role Optional role override to coerce the returned profile role.
   * @returns Observable emitting the partner profile or null when not found.
   */
  getProfile(id: string, role?: PartnerProfile['role']) {
    const key = id?.toString().trim();
    if (!key) {
      return of<PartnerProfile | null>(null);
    }

    let cached = this.cache.get(key);
    if (!cached) {
      cached = this.fetchProfile(key).pipe(shareReplay({ bufferSize: 1, refCount: true }));
      this.cache.set(key, cached);
    }

    return cached.pipe(
      map((profile) => {
        if (!profile) {
          return this.demoFallback(key, role);
        }
        if (role && profile.role !== role) {
          return { ...profile, role };
        }
        return profile;
      }),
      catchError(() => this.profileFallback(key, role))
    );
  }

  /**
   * Contexte : Triggered by download actions to retrieve a printable snapshot of the partner profile.
   * Raison d’être : Issues a blob request while suppressing the global error toast.
   * @param id Identifier of the partner profile to download.
   * @param role Optional role hint to include in the download request.
   * @returns Observable emitting the binary document as a Blob.
   */
  downloadProfile(id: string, role?: PartnerProfile['role']): Observable<Blob> {
    const key = id?.toString().trim();
    if (!key) {
      return throwError(() => new Error('invalid_partner_profile_id'));
    }

    const params = role ? { role } : undefined;
    return this.http.get(`/api/partner-profiles/${key}/download`, {
      params,
      context: createSilentHttpContext(),
      responseType: 'blob',
    });
  }

  private fetchProfile(id: string): Observable<PartnerProfile | null> {
    if (!this.browser) {
      return of(null);
    }
    const params = { populate: 'deep' } as const;
    return this.http
      .get<StrapiPartnerProfileResponse>(`/api/partner-profiles/${id}`, {
        params,
        context: createSilentHttpContext(),
      })
      .pipe(map((response) => this.mapResponse(response)));
  }

  private profileFallback(id: string, role?: PartnerProfile['role']): Observable<PartnerProfile | null> {
    return of(this.demoFallback(id, role));
  }

  private mapResponse(response: StrapiPartnerProfileResponse | null): PartnerProfile | null {
    const entity = response?.data;
    if (!entity?.attributes) {
      return null;
    }
    const attributes = entity.attributes;
    const legalName = attributes.legalName ?? null;
    if (!legalName) {
      return null;
    }

    return {
      id: entity.id,
      role: this.normalizeRole(attributes.role),
      legalName,
      displayName: attributes.displayName ?? undefined,
      sector: attributes.sector ?? undefined,
      province: attributes.province ?? undefined,
      logoUrl: attributes.logoUrl ?? null,
      registrationIds: attributes.registrationIds?.map((item) => ({ ...item })) ?? undefined,
      address: attributes.address ?? undefined,
      phone: attributes.phone ?? null,
      email: attributes.email ?? null,
      website: attributes.website ?? null,
      socials: attributes.socials?.map((link) => ({ ...link })) ?? undefined,
      leadership: attributes.leadership?.map((leader) => ({ ...leader })) ?? undefined,
      mission: attributes.mission ?? null,
      highlights: attributes.highlights ? [...attributes.highlights] : undefined,
      verificationStatus: this.normalizeVerificationStatus(attributes.verificationStatus),
      trustScore: attributes.trustScore ?? null,
      verificationSources: attributes.verificationSources?.map((item) => ({ ...item })) ?? undefined,
      trustHistory: attributes.trustHistory?.map((item) => ({ ...item })) ?? undefined,
    } satisfies PartnerProfile;
  }

  private normalizeRole(role?: PartnerProfile['role'] | null): PartnerProfile['role'] {
    return role === 'buyer' ? 'buyer' : 'supplier';
  }

  private normalizeVerificationStatus(
    value: PartnerProfile['verificationStatus'] | null | undefined
  ): PartnerProfile['verificationStatus'] {
    if (
      value === 'pending' ||
      value === 'verified' ||
      value === 'correctionRequested' ||
      value === 'rejected' ||
      value === 'suspended'
    ) {
      return value;
    }
    return 'unverified';
  }

  private demoFallback(id: string, role?: PartnerProfile['role']): PartnerProfile | null {
    const base = DEMO_PARTNER_PROFILES.get(id);
    if (!base) {
      return null;
    }
    const normalizedRole = role ?? base.role;
    return { ...base, role: normalizedRole };
  }
}

const DEMO_PARTNER_PROFILES: Map<string, PartnerProfile> = new Map([
  [
    '201',
    {
      id: 201,
      role: 'buyer',
      legalName: 'Hydro Québec Transition',
      displayName: 'HQ Transition',
      sector: 'energy',
      province: 'QC',
      logoUrl: 'assets/home.png',
      registrationIds: [
        { type: 'NEQ', value: '1145678901' },
        { type: 'BN', value: '84523-0987' },
      ],
      address: {
        line1: '75 boul. René-Lévesque Ouest',
        city: 'Montréal',
        province: 'QC',
        postalCode: 'H2Z 1A4',
        country: 'Canada',
      },
      phone: '+1 514-555-1045',
      email: 'transition@hydroqc.ca',
      website: 'https://hydroquebec.com/transition',
      socials: [
        { type: 'linkedin', url: 'https://linkedin.com/company/hydro-transition' },
        { type: 'website', url: 'https://hydroquebec.com' },
      ],
      leadership: [{ name: 'Sophie Lemay', title: 'CEO', email: 'slemay@hydroqc.ca' }],
      mission: {
        fr: 'Accélérer l’intégration des solutions hydrogène dans les grands projets industriels québécois.',
        en: 'Accelerate hydrogen integration for Quebec’s large-scale industrial projects.',
      },
      highlights: ['500 M$ investis dans l’hydrogène vert', 'Plateforme de conformité ESG dédiée'],
      verificationStatus: 'verified',
      trustScore: 88,
      verificationSources: [
        {
          id: 1,
          name: 'Registraire des entreprises du Québec',
          type: 'registry',
          status: 'validated',
          referenceId: '1145678901',
          url: 'https://www.registreentreprises.gouv.qc.ca',
          issuedAt: '2024-01-12T00:00:00.000Z',
          lastCheckedAt: '2024-06-30T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'Chambre de commerce de Montréal',
          type: 'chamber',
          status: 'pending',
          issuedAt: '2024-05-10T00:00:00.000Z',
          notes: 'Audit en cours sur le programme ESG.',
        },
      ],
      trustHistory: [
        {
          id: 11,
          label: 'Contrat d’approvisionnement en hydrogène vert',
          type: 'transaction',
          direction: 'outbound',
          occurredAt: '2024-03-15T00:00:00.000Z',
          amount: 520,
          score: 94,
          notes: 'Livraison complétée sans incident.',
        },
        {
          id: 12,
          label: 'Évaluation ESG annuelle',
          type: 'evaluation',
          direction: 'inbound',
          occurredAt: '2024-07-02T00:00:00.000Z',
          score: 82,
        },
      ],
    },
  ],
  [
    '301',
    {
      id: 301,
      role: 'supplier',
      legalName: 'Prairie Electrolyzers Inc.',
      sector: 'manufacturing',
      province: 'AB',
      logoUrl: 'assets/logo-openg7-souverainete-en-action.png',
      registrationIds: [{ type: 'BN', value: '76421-5543' }],
      address: {
        line1: '4800 99 Ave NW',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T6N 1K2',
        country: 'Canada',
      },
      phone: '+1 587-555-2214',
      email: 'contact@prairie-electrolyzers.ca',
      website: 'https://prairie-electrolyzers.ca',
      socials: [
        { type: 'linkedin', url: 'https://linkedin.com/company/prairie-electrolyzers' },
        { type: 'youtube', url: 'https://youtube.com/@prairie-electrolyzers' },
      ],
      leadership: [
        { name: 'Mark Ellison', title: 'Founder & CTO', email: 'mellison@prairie-electrolyzers.ca' },
        { name: 'Jenna Park', title: 'VP Partnerships', email: 'jpark@prairie-electrolyzers.ca' },
      ],
      mission: {
        fr: 'Produire des électrolyseurs modulaires robustes adaptés aux climats extrêmes canadiens.',
        en: 'Deliver modular electrolyzers built for Canada’s harsh climates.',
      },
      highlights: ['Production 100 % alimentée en énergie renouvelable', 'Certification CSA et ISO 14001'],
      verificationStatus: 'verified',
      trustScore: 92,
      verificationSources: [
        {
          id: 31,
          name: 'Alberta Chambers of Commerce',
          type: 'chamber',
          status: 'validated',
          issuedAt: '2023-11-03T00:00:00.000Z',
          lastCheckedAt: '2024-07-05T00:00:00.000Z',
          evidenceUrl: 'https://albertachambers.ca/certifications/prairie-electrolyzers',
        },
        {
          id: 32,
          name: 'CleanTech Audit Canada',
          type: 'audit',
          status: 'pending',
          issuedAt: '2024-06-01T00:00:00.000Z',
          notes: 'Rapport final attendu en août 2024.',
        },
      ],
      trustHistory: [
        {
          id: 21,
          label: 'Livraison d’électrolyseurs pour projet pilote AB-North',
          type: 'transaction',
          direction: 'outbound',
          occurredAt: '2024-04-22T00:00:00.000Z',
          amount: 18,
          score: 96,
        },
        {
          id: 22,
          label: 'Audit qualité interne',
          type: 'evaluation',
          direction: 'inbound',
          occurredAt: '2024-05-30T00:00:00.000Z',
          score: 88,
        },
      ],
    },
  ],
  [
    '202',
    {
      id: 202,
      role: 'buyer',
      legalName: 'Pacific Logistics Co-op',
      sector: 'services',
      province: 'BC',
      logoUrl: null,
      registrationIds: [{ type: 'BN', value: '88976-1234' }],
      address: {
        line1: '1280 Terminal Avenue',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6A 2Y3',
        country: 'Canada',
      },
      phone: '+1 604-555-8801',
      email: 'hello@pacificlogistics.ca',
      website: 'https://pacificlogistics.ca',
      socials: [{ type: 'linkedin', url: 'https://linkedin.com/company/pacific-logistics-coop' }],
      leadership: [{ name: 'Avery Singh', title: 'Chair', email: 'asingh@pacificlogistics.ca' }],
      mission: {
        fr: 'Optimiser la décarbonation des chaînes logistiques côtières.',
        en: 'Decarbonize coastal logistics corridors with data-driven solutions.',
      },
      highlights: ['Réseau de 180 membres coopératifs', 'Programme carbone neutre 2030'],
      verificationStatus: 'pending',
      trustScore: 74,
      verificationSources: [
        {
          id: 41,
          name: 'BC Registry Services',
          type: 'registry',
          status: 'pending',
          referenceId: '88976-1234',
          issuedAt: '2024-05-18T00:00:00.000Z',
          notes: 'Documents transmis, validation en attente.',
        },
      ],
      trustHistory: [
        {
          id: 31,
          label: 'Contrat de logistique côtière',
          type: 'transaction',
          direction: 'outbound',
          occurredAt: '2024-02-08T00:00:00.000Z',
          amount: 6.5,
          score: 80,
        },
      ],
    },
  ],
  [
    '302',
    {
      id: 302,
      role: 'supplier',
      legalName: 'Ontario Advanced Storage',
      sector: 'manufacturing',
      province: 'ON',
      logoUrl: 'assets/accueil.png',
      registrationIds: [{ type: 'NEQ', value: '2263344559' }],
      address: {
        line1: '44 Innovation Drive',
        city: 'Kingston',
        province: 'ON',
        postalCode: 'K7K 5Z8',
        country: 'Canada',
      },
      phone: '+1 613-555-4433',
      email: 'info@advancedstorage.ca',
      website: 'https://advancedstorage.ca',
      socials: [
        { type: 'linkedin', url: 'https://linkedin.com/company/advanced-storage' },
        { type: 'twitter', url: 'https://x.com/advancedstorage' },
      ],
      leadership: [{ name: 'Lina Moretti', title: 'President', email: 'lmoretti@advancedstorage.ca' }],
      mission: {
        fr: 'Déployer des batteries solides haute densité pour la mobilité lourde canadienne.',
        en: 'Deploy high-density solid-state batteries for heavy mobility fleets.',
      },
      highlights: ['4 lignes de production en Ontario', 'Programme pilote avec BC Ferries'],
      verificationStatus: 'suspended',
      trustScore: 61,
      verificationSources: [
        {
          id: 51,
          name: 'Ontario Business Registry',
          type: 'registry',
          status: 'validated',
          referenceId: '2263344559',
          lastCheckedAt: '2024-04-12T00:00:00.000Z',
        },
        {
          id: 52,
          name: 'Programme de certification ISO',
          type: 'audit',
          status: 'revoked',
          issuedAt: '2023-02-01T00:00:00.000Z',
          lastCheckedAt: '2024-05-01T00:00:00.000Z',
          notes: 'Suspension temporaire en attente d’un audit de suivi.',
        },
      ],
      trustHistory: [
        {
          id: 41,
          label: 'Livraison retardée – stockage maritime',
          type: 'transaction',
          direction: 'outbound',
          occurredAt: '2024-01-14T00:00:00.000Z',
          amount: 9.2,
          score: 55,
          notes: 'Retard dû à un rappel qualité.',
        },
        {
          id: 42,
          label: 'Audit qualité interne de suivi',
          type: 'evaluation',
          direction: 'inbound',
          occurredAt: '2024-05-18T00:00:00.000Z',
          score: 68,
        },
      ],
    },
  ],
]);
