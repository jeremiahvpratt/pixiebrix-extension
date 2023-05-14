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
import databaseSchema from "@schemas/database.json";
import googleSheetIdSchema from "@schemas/googleSheetId.json";
import { recipeFactory } from "@/testUtils/factories/recipeFactories";
import {
  addToRegistry,
  clearRegistryFake,
  setupRegistryRedux,
} from "@/testUtils/registryFake";
import { appApiMock } from "@/testUtils/appApiMock";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { type RecipeDefinition } from "@/types/recipeTypes";

beforeEach(() => {
  registerDefaultWidgets();
  clearRegistryFake();
  appApiMock.reset();
});

function renderRecipe(recipe: RecipeDefinition) {
  addToRegistry(recipe);

  return render(<RecipeOptionsValues />, {
    setupRedux(dispatch) {
      setupRegistryRedux(dispatch);

      dispatch(
        extensionsSlice.actions.installRecipe({
          recipe,
          extensionPoints: recipe.extensionPoints,
        })
      );

      dispatch(editorSlice.actions.selectRecipeId(recipe.metadata.id));
    },
  });
}

describe("ActivationOptions", () => {
  test("renders empty options", async () => {
    const recipe = recipeFactory();

    const rendered = renderRecipe(recipe);

    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options", async () => {
    const recipe = recipeFactory({
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

    const rendered = renderRecipe(recipe);

    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options with additional props", async () => {
    const recipe = recipeFactory({
      options: {
        schema: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
      },
    });

    const rendered = renderRecipe(recipe);

    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders blueprint options with uiSchema sort order", async () => {
    const recipe = recipeFactory({
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

    renderRecipe(recipe);

    await waitForEffect();

    const allInputs = await screen.findAllByLabelText(/^Input.+/);
    const numInput = await screen.findByLabelText("Input Number");
    const boolInput = await screen.findByLabelText("Input Boolean");
    const strInput = await screen.findByLabelText("Input String");

    expect(allInputs).toStrictEqual([numInput, boolInput, strInput]);
  });

  it("renders google sheets field type option", async () => {
    const recipe = recipeFactory({
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

    renderRecipe(recipe);

    await waitForEffect();

    const input = screen.getByLabelText("mySheet");
    expect(input).toBeInTheDocument();
    const selectButton = screen.getByRole("button", { name: "Select" });
    expect(selectButton).toBeInTheDocument();
    expect(input.parentElement).toContainElement(selectButton);
  });
});
