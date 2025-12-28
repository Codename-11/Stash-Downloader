/**
 * Stash theme colors - shared across plugins
 * These colors match Stash's dark theme
 */

export const stashColors = {
  // Background colors
  cardBg: '#30404d',
  headerBg: '#243340',
  inputBg: '#243340',

  // Border colors
  border: '#394b59',

  // Text colors
  text: '#fff',
  mutedText: '#8b9fad',

  // Status colors
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  primary: '#007bff',

  // Rating colors (for booru content)
  safe: '#28a745',
  questionable: '#ffc107',
  explicit: '#dc3545',
} as const;

/**
 * CSS custom properties for Stash theme
 * Can be injected into a style element
 */
export const stashCssVars = `
  --stash-card-bg: ${stashColors.cardBg};
  --stash-header-bg: ${stashColors.headerBg};
  --stash-input-bg: ${stashColors.inputBg};
  --stash-border: ${stashColors.border};
  --stash-text: ${stashColors.text};
  --stash-muted: ${stashColors.mutedText};
  --stash-success: ${stashColors.success};
  --stash-warning: ${stashColors.warning};
  --stash-danger: ${stashColors.danger};
  --stash-info: ${stashColors.info};
  --stash-primary: ${stashColors.primary};
`;

/**
 * Common inline style objects for Stash components
 */
export const stashStyles = {
  card: {
    backgroundColor: stashColors.cardBg,
    borderColor: stashColors.border,
    color: stashColors.text,
  },
  header: {
    backgroundColor: stashColors.headerBg,
    borderColor: stashColors.border,
  },
  input: {
    backgroundColor: stashColors.inputBg,
    borderColor: stashColors.border,
    color: stashColors.text,
  },
  modal: {
    backgroundColor: stashColors.cardBg,
    color: stashColors.text,
  },
  modalHeader: {
    backgroundColor: stashColors.headerBg,
    borderColor: stashColors.border,
  },
  modalFooter: {
    backgroundColor: stashColors.headerBg,
    borderColor: stashColors.border,
  },
  mutedText: {
    color: stashColors.mutedText,
  },
} as const;
