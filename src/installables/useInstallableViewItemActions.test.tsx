/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* eslint-disable jest/expect-expect -- assertions in expectActions helper function */
/// <reference types="jest-extended" />

import useInstallableViewItemActions, {
  type InstallableViewItemActions,
} from "@/installables/useInstallableViewItemActions";
import useFlags from "@/hooks/useFlags";
import {
  type InstallableStatus,
  type InstallableViewItem,
  type SharingType,
} from "@/installables/installableTypes";
import useInstallablePermissions from "@/installables/useInstallablePermissions";
import { uniq } from "lodash";
import { uuidv4 } from "@/types/helpers";
import { uninstallExtensions, uninstallRecipe } from "@/store/uninstallUtils";
import { renderHook } from "@/extensionConsole/testHelpers";
import { actions as extensionActions } from "@/store/extensionsSlice";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type IExtension } from "@/types/extensionTypes";
import {
  cloudExtensionFactory,
  extensionFactory,
} from "@/testUtils/factories/extensionFactories";
import { recipeFactory } from "@/testUtils/factories/recipeFactories";

jest.mock("@/hooks/useFlags", () => jest.fn());
jest.mock("@/installables/useInstallablePermissions", () => jest.fn());

const expectActions = (
  expectedActions: string[],
  actualActions: InstallableViewItemActions
) => {
  // Union both set of keys to ensure all possible keys are covered
  const allActions = uniq([...Object.keys(actualActions), ...expectedActions]);
  const expected = Object.fromEntries(
    allActions.map((action) => [
      action,
      expectedActions.includes(action)
        ? expect.not.toBeNil()
        : expect.toBeNil(),
    ])
  );
  expect(actualActions).toStrictEqual(expected);
};

const mockHooks = ({
  restricted = false,
  hasPermissions = true,
}: { restricted?: boolean; hasPermissions?: boolean } = {}) => {
  (useFlags as jest.Mock).mockImplementation(() => ({
    permit: () => !restricted,
    restrict: () => restricted,
  }));

  (useInstallablePermissions as jest.Mock).mockImplementation(() => ({
    hasPermissions,
    requestPermissions() {},
  }));
};

const installableItemFactory = ({
  isExtension,
  sharingType,
  status,
  unavailable = false,
}: {
  isExtension: boolean;
  sharingType: SharingType;
  status: InstallableStatus;
  unavailable?: boolean;
}) =>
  ({
    installable: isExtension ? extensionFactory() : recipeFactory(),
    sharing: {
      source: {
        type: sharingType,
      },
    },
    status,
    unavailable,
  } as InstallableViewItem);

afterEach(() => {
  jest.resetAllMocks();
});

describe("useInstallableViewItemActions", () => {
  beforeEach(() => {
    window.location.pathname = "/options.html";
  });

  test("cloud extension", () => {
    mockHooks();
    const cloudExtensionItem = installableItemFactory({
      isExtension: true,
      sharingType: "Personal",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(cloudExtensionItem));
    expectActions(
      ["viewPublish", "viewShare", "activate", "deleteExtension"],
      actions
    );
  });

  test("active personal extension", () => {
    mockHooks();
    const personalExtensionItem = installableItemFactory({
      isExtension: true,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalExtensionItem));
    expectActions(
      ["viewPublish", "viewShare", "deactivate", "viewLogs"],
      actions
    );

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(personalExtensionItem));

    expectActions(["deactivate", "viewPublish"], sidebarActions);
  });

  test("active personal blueprint", () => {
    mockHooks();
    const personalBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalBlueprintItem));
    expectActions(
      ["viewPublish", "viewShare", "deactivate", "viewLogs", "reactivate"],
      actions
    );

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(personalBlueprintItem));

    expectActions(["deactivate", "viewPublish", "reactivate"], sidebarActions);
  });

  test("inactive personal blueprint", () => {
    mockHooks();
    const personalBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(personalBlueprintItem));
    expectActions(["viewPublish", "viewShare", "activate"], actions);
  });

  test("active team blueprint", () => {
    mockHooks();
    const teamBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(teamBlueprintItem));
    expectActions(
      ["viewPublish", "viewShare", "deactivate", "viewLogs", "reactivate"],
      actions
    );

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(teamBlueprintItem));

    expectActions(["deactivate", "viewPublish", "reactivate"], sidebarActions);
  });

  test("inactive team blueprint", () => {
    mockHooks();
    const teamBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Inactive",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(teamBlueprintItem));
    expectActions(["viewPublish", "viewShare", "activate"], actions);
  });

  test("public blueprint", () => {
    mockHooks();
    const publicBlueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Personal",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(publicBlueprintItem));
    expectActions(
      ["viewPublish", "viewShare", "reactivate", "viewLogs", "deactivate"],
      actions
    );

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(publicBlueprintItem));

    expectActions(["deactivate", "viewPublish", "reactivate"], sidebarActions);
  });

  test("team deployment for unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(["reactivate", "deactivate", "viewLogs"], actions);

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    expectActions(["deactivate", "reactivate"], sidebarActions);
  });

  test("restricted team deployment", () => {
    mockHooks({ restricted: true });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(["viewLogs"], actions);
  });

  test("blueprint with missing permissions", () => {
    mockHooks({ hasPermissions: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Active",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));
    expectActions(
      [
        "viewPublish",
        "viewShare",
        "deactivate",
        "viewLogs",
        "requestPermissions",
        "reactivate",
      ],
      actions
    );

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    expectActions(
      ["deactivate", "requestPermissions", "viewPublish", "reactivate"],
      sidebarActions
    );
  });

  test("blueprint with access revoked", () => {
    mockHooks();
    const blueprintItem = installableItemFactory({
      isExtension: false,
      sharingType: "Team",
      status: "Active",
      unavailable: true,
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(blueprintItem));
    expectActions(["deactivate", "viewLogs"], actions);

    window.location.pathname = "/sidebar.html";
    const {
      result: { current: sidebarActions },
    } = renderHook(() => useInstallableViewItemActions(blueprintItem));

    expectActions(["deactivate"], sidebarActions);
  });

  test("paused deployment with unrestricted user", () => {
    mockHooks({ restricted: false });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    // Unrestricted users (e.g., developers) need to be able to deactivate/reactivate a deployment to use a later
    // version of the blueprint for development/testing.
    expectActions(["viewLogs", "deactivate", "reactivate"], actions);
  });

  test("paused deployment with restricted user", () => {
    mockHooks({ restricted: true });
    const deploymentItem = installableItemFactory({
      isExtension: false,
      sharingType: "Deployment",
      status: "Paused",
    });

    const {
      result: { current: actions },
    } = renderHook(() => useInstallableViewItemActions(deploymentItem));

    expectActions(["viewLogs"], actions);
  });

  describe("public blueprint", () => {
    let blueprintItem: InstallableViewItem;
    beforeEach(() => {
      mockHooks();

      blueprintItem = {
        installable: recipeFactory({
          sharing: { public: true, organizations: [] },
        }),
        sharing: {
          source: {
            type: "Personal",
          },
        },
        status: "Active",
      } as InstallableViewItem;
    });

    test("pending publish", () => {
      const {
        result: { current: actions },
      } = renderHook(() => useInstallableViewItemActions(blueprintItem));
      expectActions(
        ["viewPublish", "viewShare", "deactivate", "viewLogs", "reactivate"],
        actions
      );

      window.location.pathname = "/sidebar.html";
      const {
        result: { current: sidebarActions },
      } = renderHook(() => useInstallableViewItemActions(blueprintItem));

      expectActions(
        ["deactivate", "viewPublish", "reactivate"],
        sidebarActions
      );
    });

    test("published", () => {
      blueprintItem.sharing.listingId = uuidv4();

      const {
        result: { current: actions },
      } = renderHook(() => useInstallableViewItemActions(blueprintItem));
      expectActions(
        [
          "viewInMarketplaceHref",
          "viewShare",
          "deactivate",
          "viewLogs",
          "reactivate",
        ],
        actions
      );

      window.location.pathname = "/sidebar.html";
      const {
        result: { current: sidebarActions },
      } = renderHook(() => useInstallableViewItemActions(blueprintItem));

      expectActions(
        ["viewInMarketplaceHref", "deactivate", "reactivate"],
        sidebarActions
      );
    });
  });
});

describe("actions", () => {
  describe("uninstall", () => {
    beforeEach(() => {
      mockHooks();
    });

    test("calls uninstallRecipe for a blueprint", () => {
      mockHooks();
      const blueprintInstallable = installableItemFactory({
        isExtension: false,
        sharingType: "Personal",
        status: "Active",
      });

      const {
        result: {
          current: { deactivate },
        },
      } = renderHook(() => useInstallableViewItemActions(blueprintInstallable));

      deactivate();

      expect(uninstallRecipe).toHaveBeenCalledWith(
        (blueprintInstallable.installable as RecipeDefinition).metadata.id,
        expect.any(Array),
        expect.any(Function)
      );
      expect(uninstallExtensions).not.toHaveBeenCalled();
    });

    test("calls uninstallExtensions for an extension", () => {
      mockHooks();

      const extension = cloudExtensionFactory();

      const extensionInstallable = installableItemFactory({
        isExtension: true,
        sharingType: "Personal",
        status: "Active",
      });
      (extensionInstallable.installable as IExtension).id = extension.id;

      const {
        result: {
          current: { deactivate },
        },
      } = renderHook(
        () => useInstallableViewItemActions(extensionInstallable),
        {
          setupRedux(dispatch) {
            dispatch(extensionActions.installCloudExtension({ extension }));
            dispatch(
              extensionActions.installCloudExtension({
                extension: cloudExtensionFactory(),
              })
            );
          },
        }
      );

      deactivate();

      expect(uninstallRecipe).not.toHaveBeenCalled();
      expect(uninstallExtensions).toHaveBeenCalledWith(
        [extension.id],
        expect.any(Function)
      );
    });
  });
});