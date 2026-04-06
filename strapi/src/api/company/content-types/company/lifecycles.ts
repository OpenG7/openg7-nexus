import {
  removeCompanyFromIndex,
  syncCompanyToIndex,
} from '../../../../services/search.service';

type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'correctionRequested'
  | 'rejected'
  | 'suspended';
type VerificationSourceStatus = 'pending' | 'validated' | 'revoked';

interface VerificationSource {
  status?: VerificationSourceStatus | null;
}

interface TrustRecord {
  score?: unknown;
}

interface CompanyLifecycleEntity {
  trustHistory?: TrustRecord[] | null;
  verificationSources?: VerificationSource[] | null;
  verificationStatus?: VerificationStatus | null;
}

const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value * 100) / 100;
};

const parseScore = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value);
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return clampScore(Number(value));
  }
  return null;
};

const averageScore = (items: readonly TrustRecord[]): number => {
  let total = 0;
  let count = 0;
  for (const item of items) {
    const parsed = parseScore(item?.score);
    if (parsed != null) {
      total += parsed;
      count += 1;
    }
  }
  if (!count) {
    return 0;
  }
  return clampScore(total / count);
};

const deriveStatus = (
  current: VerificationStatus | null,
  sources: readonly VerificationSource[]
): VerificationStatus => {
  if (
    current === 'suspended' ||
    current === 'correctionRequested' ||
    current === 'rejected'
  ) {
    return current;
  }
  const validated = sources.some((source) => source?.status === 'validated');
  if (validated) {
    return 'verified';
  }
  const pending = sources.some((source) => source?.status === 'pending');
  if (pending) {
    return 'pending';
  }
  return current === 'pending' || current === 'verified' ? 'pending' : 'unverified';
};

const lifecycle = {
  async beforeCreate(event) {
    const data = event.params?.data ?? {};
    const trustHistory = Array.isArray(data.trustHistory) ? data.trustHistory : [];
    const verificationSources = Array.isArray(data.verificationSources)
      ? data.verificationSources
      : [];

    data.trustScore = averageScore(trustHistory);
    data.verificationStatus = deriveStatus(
      typeof data.verificationStatus === 'string'
        ? (data.verificationStatus as VerificationStatus)
        : null,
      verificationSources
    );
  },

  async beforeUpdate(event) {
    const data = event.params?.data ?? {};
    const id = event.params?.where?.id ?? null;
    const previous = id
      ? await strapi.entityService.findOne('api::company.company', id, {
          populate: ['trustHistory', 'verificationSources'],
        })
      : null;

    const previousCompany = previous as CompanyLifecycleEntity | null;

    const trustHistory = Array.isArray(data.trustHistory)
      ? data.trustHistory
      : previousCompany?.trustHistory ?? [];

    const verificationSources = Array.isArray(data.verificationSources)
      ? data.verificationSources
      : previousCompany?.verificationSources ?? [];

    data.trustScore = averageScore(trustHistory);
    const currentStatus = (data.verificationStatus ?? previousCompany?.verificationStatus ?? null) as
      | VerificationStatus
      | null;
    data.verificationStatus = deriveStatus(currentStatus, verificationSources);
  },

  async afterCreate(event) {
    await syncCompanyToIndex(event.result ?? null);
  },

  async afterUpdate(event) {
    await syncCompanyToIndex(event.result ?? null);
  },

  async afterDelete(event) {
    const results = Array.isArray(event.result) ? event.result : [event.result];
    await Promise.all(results.filter(Boolean).map((record) => removeCompanyFromIndex(record)));
  },
};

export default lifecycle;
