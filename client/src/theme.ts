import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

/**
 * Every button carries a visible 1px edge in its own palette's emphasised
 * shade, so it reads as a control against both the cream card and the felt
 * rather than dissolving into the background.
 */
const buttonRecipe = defineRecipe({
  base: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'colorPalette.emphasized',
    borderRadius: 'pill',
    fontWeight: '800',
    transition: 'background .18s, border-color .18s, transform .12s',
    _disabled: { opacity: 0.4, cursor: 'not-allowed' },
  },
});

/**
 * The app's Chakra system.
 *
 * Chakra owns component styling: colours come from these tokens via
 * `colorPalette`, never from utility classes, which Chakra's generated styles
 * would override anyway.
 *
 * `brand` defines every palette slot Chakra's recipes read (`solid`,
 * `contrast`, `fg`, `muted`, `subtle`, `emphasized`, `focusRing`), so
 * `colorPalette="brand"` resolves correctly for every variant — a solid button
 * gets white on coral, an outline button coral on cream.
 */
const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'bg.canvas',
      color: 'fg',
      fontFamily: 'body',
    },
    '*::selection': {
      bg: 'brand.muted',
    },
  },
  theme: {
    recipes: {
      button: buttonRecipe,
    },
    tokens: {
      colors: {
        cream: { value: '#f8f3e8' },
        ink: { value: '#142f2c' },
        coral: { value: '#e86e4b' },
        coralDeep: { value: '#d85e3d' },
        felt: { value: '#18534d' },
        feltDeep: { value: '#123f3a' },
      },
      fonts: {
        heading: { value: '"DM Serif Display", Georgia, serif' },
        body: { value: '"Manrope", ui-sans-serif, system-ui, sans-serif' },
      },
      radii: {
        card: { value: '18px' },
        pill: { value: '999px' },
      },
    },
    semanticTokens: {
      colors: {
        'bg.canvas': { value: '{colors.cream}' },
        'bg.surface': { value: 'rgba(255, 255, 255, 0.72)' },
        'bg.felt': { value: '{colors.felt}' },
        fg: { value: '{colors.ink}' },
        'fg.muted': { value: 'rgba(20, 47, 44, 0.62)' },
        'fg.subtle': { value: 'rgba(20, 47, 44, 0.45)' },
        'fg.onFelt': { value: 'rgba(255, 255, 255, 0.92)' },
        'fg.onFeltMuted': { value: 'rgba(255, 255, 255, 0.62)' },
        'border.subtle': { value: 'rgba(20, 47, 44, 0.12)' },

        brand: {
          solid: { value: '{colors.coral}' },
          contrast: { value: '#ffffff' },
          fg: { value: '{colors.coralDeep}' },
          muted: { value: 'rgba(232, 110, 75, 0.16)' },
          subtle: { value: 'rgba(232, 110, 75, 0.09)' },
          emphasized: { value: '{colors.coralDeep}' },
          focusRing: { value: '{colors.coral}' },
        },

        // Used for secondary controls so they read as ink, not grey mush.
        forest: {
          solid: { value: '{colors.ink}' },
          contrast: { value: '{colors.cream}' },
          fg: { value: '{colors.ink}' },
          muted: { value: 'rgba(20, 47, 44, 0.12)' },
          subtle: { value: 'rgba(20, 47, 44, 0.06)' },
          emphasized: { value: '#224b46' },
          focusRing: { value: '{colors.ink}' },
        },
      },
      shadows: {
        card: { value: '0 10px 30px rgba(20, 47, 44, 0.10)' },
        lifted: { value: '0 25px 70px rgba(0, 0, 0, 0.20)' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
