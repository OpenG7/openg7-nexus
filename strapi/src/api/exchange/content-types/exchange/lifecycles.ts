import { removeExchangeFromIndex, syncExchangeToIndex } from '../../../../services/search.service';

interface ExchangeEventResult {
  id?: number | string;
}

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
};

const lifecycle = {
  async afterCreate(event) {
    await syncExchangeToIndex(event.result ?? null);
  },

  async afterUpdate(event) {
    await syncExchangeToIndex(event.result ?? null);
  },

  async afterDelete(event) {
    const results = ensureArray<ExchangeEventResult>(event.result as any);
    await Promise.all(results.filter(Boolean).map((record) => removeExchangeFromIndex(record)));
  },
};

export default lifecycle;
