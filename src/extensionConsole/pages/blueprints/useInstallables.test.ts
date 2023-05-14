/* eslint-disable new-cap -- test file */
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

import { renderHook } from "@/extensionConsole/testHelpers";
import useInstallables from "@/extensionConsole/pages/blueprints/useInstallables";
import extensionsSlice from "@/store/extensionsSlice";
import { appApiMock, mockAllApiEndpoints } from "@/testUtils/appApiMock";
import {
  cloudExtensionFactory,
  installedRecipeMetadataFactory,
  persistedExtensionFactory,
} from "@/testUtils/factories/extensionFactories";
import { recipeDefinitionFactory } from "@/testUtils/factories/recipeFactories";
import { selectSourceRecipeMetadata } from "@/types/extensionTypes";
import { array } from "cooky-cutter";

describe("useInstallables", () => {
  beforeEach(() => {
    mockAllApiEndpoints();
  });

  it("handles empty state", async () => {
    const wrapper = renderHook(() => useInstallables());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [],
      error: false,
    });
  });

  it("handles unavailable", async () => {
    const metadata = installedRecipeMetadataFactory();

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setExtensions([
            persistedExtensionFactory({
              _recipe: metadata,
            }),
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: false,
    });
  });

  it("multiple unavailable are single installable", async () => {
    const metadata = installedRecipeMetadataFactory();

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setExtensions(
            array(
              persistedExtensionFactory,
              3
            )({
              _recipe: metadata,
            })
          )
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: false,
    });
  });

  it("handles known remote recipe", async () => {
    const recipe = recipeDefinitionFactory();
    appApiMock.reset();
    appApiMock.onGet("/api/extensions/").reply(200, []);
    appApiMock.onGet("/api/registry/bricks/").reply(200, [recipe]);

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setExtensions([
            persistedExtensionFactory({
              _recipe: selectSourceRecipeMetadata(recipe),
            }),
          ])
        );
      },
    });

    // On initial render, will be a stub
    await wrapper.waitForEffect();
    expect(wrapper.result.current.installables[0]).toHaveProperty("isStub");

    // Will be the real thing once the remote registry is fetched
    await wrapper.waitForValueToChange(
      () => (wrapper.result.current.installables[0] as any)?.isStub
    );

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          kind: "recipe",
        }),
      ],
      error: false,
    });

    expect(wrapper.result.current.installables[0]).not.toHaveProperty("isStub");
  });

  it("handles inactive cloud extension", async () => {
    appApiMock.onGet("/api/extensions/").reply(200, [cloudExtensionFactory()]);

    const wrapper = renderHook(() => useInstallables());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          active: false,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: false,
    });
  });

  it("handles active cloud extension", async () => {
    const cloudExtension = cloudExtensionFactory();
    appApiMock.reset();
    appApiMock.onGet("/api/extensions/").reply(200, [cloudExtension]);
    appApiMock.onGet("/api/registry/bricks/").reply(200, []);

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setExtensions([
            // Content doesn't matter, just need to match the ID
            persistedExtensionFactory({ id: cloudExtension.id }),
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          active: true,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: false,
    });
  });
});
