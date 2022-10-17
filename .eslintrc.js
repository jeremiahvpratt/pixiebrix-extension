const contexts = [
  "background",
  "contentScript",
  "pageEditor",
  "options",
  "sidebar",
  // "pageScript", // TODO: After Messenger migration
];

const restrictedZones = [];
for (const exporter of contexts) {
  for (const importer of contexts) {
    if (exporter !== importer) {
      restrictedZones.push({
        target: `./src/${importer}/**/*`,
        from: `./src/${exporter}`,
        except: [
          `../${exporter}/messenger/api.ts`,
          `../${exporter}/types.ts`,
          `../${exporter}/nativeEditor/types.ts`,
        ],
      });
    }
  }
}

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    // TODO: It duplicates imports, wait for https://github.com/typescript-eslint/typescript-eslint/issues/4338
    "@typescript-eslint/consistent-type-imports": "off",

    "import/no-restricted-paths": [
      "error",
      {
        zones: restrictedZones,
      },
    ],

    // Avoid imports with side effects
    "import/no-unassigned-import": [
      "error",
      {
        allow: [
          "**/*.css",
          "**/*.scss",
          "@/globals/*", // Must be run before other code
          "@/development/*",
          "@/background/messenger/external/api",
          "@testing-library/jest-dom",
          "urlpattern-polyfill",
          "webext-dynamic-content-scripts", // Automatic registration
          "regenerator-runtime/runtime", // Automatic registration
        ],
      },
    ],

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",

    // Enabled for the IDE, but it's disabled in the `lint` script
    "import/no-cycle": "warn",
  },
  overrides: [
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "**/testUtils/testEnv.js",
        "**/__mocks__/**",
        "*.test.js",
        "*.test.ts",
        "*.test.tsx",
      ],
      env: {
        node: true,
        jest: true,
      },
      // Overridden rules: https://github.com/pixiebrix/eslint-config-pixiebrix/blob/main/server.js
      extends: ["pixiebrix/server"],
    },
  ],
};
