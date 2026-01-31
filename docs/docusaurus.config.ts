import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Lektr Documentation",
  tagline: "Stop forgetting what you read",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: "https://lektr.app",
  baseUrl: "/docs/",

  organizationName: "lektr",
  projectName: "lektr",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/", // Docs at root
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/lektr/lektr/tree/main/docs/",
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/lektr-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Lektr",
      logo: {
        alt: "Lektr Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/lektr/lektr",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/",
            },
            {
              label: "Installation",
              to: "/getting-started/installation",
            },
            {
              label: "Configuration",
              to: "/configuration/email",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/lektr/lektr",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Lektr. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "yaml", "tsx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
