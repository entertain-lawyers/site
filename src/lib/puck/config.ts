import type { Config } from '@measured/puck';
import {
  Hero,
  Heading,
  Text,
  ImageBlock,
  CardGrid,
  CtaBanner,
  StatsRow,
  Spacer,
} from './blocks';

/**
 * Puck page-builder configuration — the "Elementor-like" editor used in
 * /admin/pages. Blocks come from ./blocks and reuse the site's navy/accent
 * design tokens; root fields hold the page title + SEO metadata.
 */
export const builderConfig: Config = {
  components: {
    Hero,
    Heading,
    Text,
    ImageBlock,
    CardGrid,
    CtaBanner,
    StatsRow,
    Spacer,
  },
  root: {
    fields: {
      title: { type: 'text', label: 'Page title (admin list & browser tab)' },
      metaTitle: { type: 'text', label: 'SEO title' },
      metaDesc: { type: 'textarea', label: 'SEO description' },
    },
    defaultProps: {
      title: 'Untitled page',
      metaTitle: '',
      metaDesc: '',
    },
  },
};
