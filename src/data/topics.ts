export type Topic = {
  slug: string;
  title: string;
  description: string;
  matchTags: string[];
};

export const topics = [
  {
    slug: "automation",
    title: "Infrastructure Automation Posts",
    description:
      "Terraform, OpenTofu, GitLab, and automation notes for repeatable infrastructure delivery.",
    matchTags: ["automation", "terraform", "opentofu", "gitlab"],
  },
  {
    slug: "devops-culture",
    title: "DevOps Culture Posts",
    description:
      "Operating-model notes on platform teams, ownership, self-service, and sustainable delivery.",
    matchTags: ["devops-culture", "platform-engineering", "operating-models"],
  },
  {
    slug: "gitlab",
    title: "GitLab Posts",
    description:
      "GitLab notes on CI/CD, platform workflows, automation, and delivery ergonomics.",
    matchTags: ["gitlab", "ci-cd", "automation", "opentofu", "terraform"],
  },
  {
    slug: "kubernetes",
    title: "Kubernetes Posts",
    description:
      "Kubernetes notes covering operators, control planes, KMS integration, and operational failure modes.",
    matchTags: ["kubernetes", "operators", "kms", "platform-engineering"],
  },
  {
    slug: "openbao",
    title: "OpenBao Posts",
    description:
      "Notes on OpenBao, Transit, identity, secret management, and Kubernetes integrations.",
    matchTags: ["openbao", "vault", "kms", "security"],
  },
  {
    slug: "platform-engineering",
    title: "Platform Engineering Posts",
    description:
      "Field notes on internal platforms, golden paths, self-service, and operating models.",
    matchTags: ["platform-engineering", "devops-culture", "automation"],
  },
  {
    slug: "security",
    title: "Security Posts",
    description:
      "Security engineering notes for infrastructure platforms, identity, defaults, reviews, and control planes.",
    matchTags: ["security", "openbao", "kms", "operators"],
  },
  {
    slug: "virtualization",
    title: "Virtualization Posts",
    description:
      "Notes on Harvester, SUSE Virtualization, migration planning, storage, networking, and operations.",
    matchTags: ["virtualization", "harvester", "suse-virtualization"],
  },
] satisfies Topic[];
