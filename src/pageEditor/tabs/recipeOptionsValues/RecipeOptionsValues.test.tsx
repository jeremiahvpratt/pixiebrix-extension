/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React from "react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "@/pageEditor/testHelpers";
import RecipeOptionsValues from "@/pageEditor/tabs/recipeOptionsValues/RecipeOptionsValues";
import extensionsSlice from "@/store/extensionsSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import {
  useAllModDefinitions,
  useOptionalModDefinition,
} from "@/modDefinitions/modDefinitionHooks";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import databaseSchema from "@schemas/database.json";
import googleSheetIdSchema from "@schemas/googleSheetId.json";
import { valueToAsyncCacheState } from "@/utils/asyncStateUtils";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useOptionalModDefinition: jest.fn(),
  useAllModDefinitions: jest.fn(),
}));

jest.mock("@/contrib/google/initGoogle", () => ({
  __esModule: true,
  isGoogleInitialized: jest.fn().mockReturnValue(true),
  isGAPISupported: jest.fn().mockReturnValue(true),
  subscribe: jest.fn(),
}));

function mockModDefinition(modDefinition: ModDefinition) {
  (useAllModDefinitions as jest.Mock).mockReturnValue(
    valueToAsyncCacheState([modDefinition])
  );
  (useOptionalModDefinition as jest.Mock).mockReturnValue(
    valueToAsyncCacheState(modDefinition)
  );
}

beforeEach(() => {
  registerDefaultWidgets();
});

describe("ActivationOptions", () => {
  test("renders empty options", async () => {
    const modDefinition = defaultModDefinitionFactory();
    mockModDefinition(modDefinition);
    const { asFragment } = render(<RecipeOptionsValues />, {
      setupRedux(dispatch) {
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        });
      },
    });
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options", async () => {
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: {
          type: "object",
          properties: {
            myStr: {
              type: "string",
            },
            myNum: {
              type: "number",
              default: 10,
            },
            myBool: {
              type: "boolean",
              default: true,
            },
            myArray: {
              type: "array",
              additionalItems: {
                type: "number",
              },
            },
            myObject: {
              type: "object",
              properties: {
                foo: {
                  type: "string",
                },
                bar: {
                  type: "number",
                },
              },
            },
            myDatabase: {
              $ref: databaseSchema.$id,
            },
            myGoogleSheet: {
              $ref: googleSheetIdSchema.$id,
            },
          },
        },
      },
    });
    mockModDefinition(modDefinition);
    const { asFragment } = render(<RecipeOptionsValues />, {
      setupRedux(dispatch) {
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        });
      },
    });
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options with additional props", async () => {
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
      },
    });
    mockModDefinition(modDefinition);
    const { asFragment } = render(<RecipeOptionsValues />, {
      setupRedux(dispatch) {
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        });
      },
    });
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options with uiSchema sort order", async () => {
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: {
          type: "object",
          properties: {
            myStr: {
              type: "string",
              title: "Input String",
            },
            myNum: {
              type: "number",
              title: "Input Number",
            },
            myBool: {
              type: "boolean",
              title: "Input Boolean",
            },
          },
        },
        uiSchema: {
          "ui:order": ["myNum", "myBool", "myStr"],
        },
      },
    });
    mockModDefinition(modDefinition);
    render(<RecipeOptionsValues />, {
      setupRedux(dispatch) {
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        });
      },
    });

    await waitForEffect();

    const allInputs = await screen.findAllByLabelText(/^Input.+/);
    const numInput = await screen.findByLabelText("Input Number");
    const boolInput = await screen.findByLabelText("Input Boolean");
    const strInput = await screen.findByLabelText("Input String");

    expect(allInputs).toStrictEqual([numInput, boolInput, strInput]);
  });

  it("renders google sheets field type option if gapi is loaded", async () => {
    const modDefinition = defaultModDefinitionFactory({
      options: {
        schema: {
          type: "object",
          properties: {
            mySheet: {
              $ref: googleSheetIdSchema.$id,
            },
          },
          required: ["mySheet"],
        },
      },
    });
    mockModDefinition(modDefinition);
    render(<RecipeOptionsValues />, {
      setupRedux(dispatch) {
        extensionsSlice.actions.installMod({
          modDefinition,
          screen: "pageEditor",
          isReinstall: false,
        });
      },
    });

    await waitForEffect();

    const input = screen.getByLabelText("mySheet");
    expect(input).toBeInTheDocument();
    const selectButton = screen.getByRole("button", { name: "Select" });
    expect(selectButton).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- TODO: find better query
    expect(input.parentElement).toContainElement(selectButton);
  });
});
