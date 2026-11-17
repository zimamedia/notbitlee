declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

export const PROJECT = {
  repo: "https://github.com/zimamedia/notbitlee",
  releases: "https://github.com/zimamedia/notbitlee/releases",
  changelog: "https://github.com/zimamedia/notbitlee/blob/main/CHANGELOG.md",
  bug: "https://github.com/zimamedia/notbitlee/issues/new?template=bug_report.yml",
  feature: "https://github.com/zimamedia/notbitlee/issues/new?template=feature_request.yml",
  contributing: "https://github.com/zimamedia/notbitlee/blob/main/CONTRIBUTING.md",
  updating: "https://github.com/zimamedia/notbitlee#updating",
  security: "https://github.com/zimamedia/notbitlee/security/advisories/new",
  license: "https://github.com/zimamedia/notbitlee/blob/main/LICENSE",
  maker: "https://zimamedia.com",
} as const;
