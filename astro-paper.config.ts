import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://decort.tech",
    title: "Roel de Cort",
    description:
      "Technical field notes on platform engineering, OpenBao, Kubernetes, GitLab, infrastructure automation, and open-source security tooling.",
    author: "Roel de Cort",
    profile: "https://decort.tech/about/",
    ogImage: "default-og.svg",
    lang: "en",
    timezone: "Europe/Amsterdam",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    showBackButton: true,
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/dc-tec",
      linkTitle: "Roel de Cort on GitHub",
    },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/in/roel-de-cort/",
      linkTitle: "Roel de Cort on LinkedIn",
    },
    {
      name: "rss",
      url: "/rss.xml",
      linkTitle: "RSS feed",
    },
    {
      name: "mail",
      url: "mailto:roel@decort.tech",
      linkTitle: "Email Roel de Cort",
    },
  ],
});
