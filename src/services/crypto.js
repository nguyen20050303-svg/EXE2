export const normalizeSecretCode = (value) => value?.trim().toLowerCase() ?? '';

export const isValidSecretCode = (value) => normalizeSecretCode(value).length >= 4;

export const maskSecretCode = (value) => {
  const normalized = normalizeSecretCode(value);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= 2) {
    return '•'.repeat(normalized.length);
  }

  return `${normalized[0]}${'•'.repeat(Math.max(1, normalized.length - 2))}${normalized[normalized.length - 1]}`;
};
