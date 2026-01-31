import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration/email',
        'configuration/environment',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/import',
        'features/search',
        'features/review',
        'features/export',
      ],
    },
    {
      type: 'category',
      label: 'Administration',
      items: [
        'admin/settings',
        'admin/email-setup',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/architecture',
        'development/api',
      ],
    },
  ],
};

export default sidebars;
