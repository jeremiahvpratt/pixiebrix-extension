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

import { type RecipeDefinition } from "@/types/recipeTypes";
import { appApiMock } from "@/testUtils/appApiMock";
import { recipesActions } from "@/recipes/recipesSlice";
import { clear } from "@/registry/localRegistry";

const remoteItems: RecipeDefinition[] = [];
const localItems: RecipeDefinition[] = [];

/**
 * Add an item to the local and remote registry. Currently only supports RecipeDefinitions.
 * @param item the item to add
 */
export function addToRegistry(item: RecipeDefinition): void {
  addToRemoteRegistry(item);
  addToLocalRegistry(item);
}

/**
 * Add an item to the remote registry. Setups up the axios mock to return the item when /api/registry/bricks/ is called.
 * @param item
 */
export function addToRemoteRegistry(item: RecipeDefinition): void {
  remoteItems.push(item);
  appApiMock.onGet("/api/registry/bricks/").reply(() => [200, remoteItems]);
}

export function addToLocalRegistry(item: RecipeDefinition): void {
  localItems.push(item);
}

export function setupRegistryRedux(dispatch: (action: any) => void): void {
  dispatch(recipesActions.startFetchingFromCache());
  dispatch(
    recipesActions.setRecipesFromCache(
      localItems.filter((item) => item.kind === "recipe")
    )
  );
}

export async function clearRegistryFake(): Promise<void> {
  remoteItems.splice(0, remoteItems.length);
  localItems.splice(0, localItems.length);
  await clear();
}
