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

import { type UiSchema } from "@rjsf/core";
import { type UnknownObject } from "@/types/objectTypes";
import {
  type Definition,
  type InnerDefinitionRef,
  type InnerDefinitions,
  type RegistryId,
} from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type Permissions } from "webextension-polyfill";
import { type OutputKey, type TemplateEngine } from "@/types/runtimeTypes";

/**
 * A section defining which options are available during recipe activation
 * @see RecipeDefinition.options
 */
export type OptionsDefinition = {
  schema: Schema;
  uiSchema?: UiSchema;
};

/**
 * An extension defined in a recipe.
 * @see RecipeDefinition.extensionPoints
 */
export type ExtensionDefinition = {
  /**
   * The id of the ExtensionPoint.
   */
  id: RegistryId | InnerDefinitionRef;

  /**
   * Human-readable name for the extension to display in the UI.
   */
  label: string;

  /**
   * Additional permissions required by the configured extension. This section will generally be missing/blank unless
   * the permissions need to be declared to account for dynamic URLs accessed by the extension.
   */
  permissions?: Permissions.Permissions;

  /**
   * Services to make available to the extension. During activation, the user will be prompted to select a credential
   * for each service entry.
   */
  services?: Record<OutputKey, RegistryId>;

  /**
   * The default template engine for the extension.
   * @deprecated in apiVersion v3 the expression engine is controlled explicitly
   */
  templateEngine?: TemplateEngine;

  /**
   * The extension configuration.
   */
  config: UnknownObject;
};

/**
 * An ExtensionDefinition with all inner definition references resolved.
 * @see resolveDefinitions
 */
export type ResolvedExtensionDefinition = ExtensionDefinition & {
  // Known to be a registry id instead of an InnerDefinitionRef
  id: RegistryId;

  _resolvedExtensionDefinitionBrand: never;
};

/**
 * A version of RecipeDefinition without the metadata properties that should not be included with the submitted
 * YAML/JSON config for the recipe.
 *
 * When creating a recipe definition locally, this is probably what you want.
 *
 * @see RecipeDefinition
 * @see PackageUpsertResponse
 */
export interface UnsavedRecipeDefinition extends Definition {
  kind: "recipe";
  extensionPoints: ExtensionDefinition[];
  definitions?: InnerDefinitions;
  options?: OptionsDefinition;
}

/**
 * Information about who a package has been shared with. Currently used only on recipes in the interface to indicate
 * which team they were shared from
 */
// Not exported -- use RecipeDefinition["sharing"] instead to reference
type SharingDefinition = {
  /**
   * True fi the package has been shared publicly on PixieBrix
   */
  public: boolean;
  /**
   * Organizations the package has been shared with. Only includes the organizations that are visible to the user.
   */
  organizations: UUID[];
};

/**
 * Config of a Package returned from the PixieBrix API. Used to install extensions.
 *
 * If you are creating a recipe definition locally, you probably want UnsavedRecipeDefinition, which doesn't include
 * the `sharing` and `updated_at` fields which aren't stored on the YAML/JSON, but are added by the server on responses.
 *
 * There is no auto-generated swagger Type for this because config is saved in a single JSON field on the server.
 *
 * @see UnsavedRecipeDefinition
 */
export interface RecipeDefinition extends UnsavedRecipeDefinition {
  /**
   * Who the recipe is shared with. NOTE: does not appear in the recipe's YAML/JSON config -- the API endpoint's
   * serializer adds it to the response.
   */
  sharing: SharingDefinition;

  /**
   * When the recipe was last updated. Can be used to detect updates where the version number of the recipe was
   * not bumped. NOTE: does not appear in the recipe's YAML/JSON config -- the API endpoint's
   * serializer adds it to the response.
   */
  updated_at: Timestamp;
}