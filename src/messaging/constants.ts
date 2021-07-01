/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export const SEARCH_WINDOW = "@@pixiebrix/script/SEARCH_WINDOW";
export const READ_WINDOW = "@@pixiebrix/script/READ_WINDOW";
export const SCRIPT_LOADED = "@@pixiebrix/script/SCRIPT_LOADED";
export const CONNECT_EXTENSION = "@@pixiebrix/script/CONNECT_EXTENSION";
export const DETECT_FRAMEWORK_VERSIONS =
  "@@pixiebrix/script/DETECT_FRAMEWORK_VERSIONS";

export const GET_COMPONENT_DATA = "@@pixiebrix/script/GET_COMPONENT_DATA";
export const SET_COMPONENT_DATA = "@@pixiebrix/script/SET_COMPONENT_DATA";
export const GET_COMPONENT_INFO = "@@pixiebrix/script/GET_COMPONENT_INFO";

export const FORWARD_FRAME_DATA = "@@pixiebrix/script/FORWARD_FRAME_DATA";
export const REQUEST_FRAME_DATA = "@@pixiebrix/script/REQUEST_FRAME_DATA";

type UNKNOWN_VERSION = null;

export const KNOWN_READERS = <const>[
  "react",
  "emberjs",
  "angularjs",
  "vue",
  "jquery",
];

export type Framework = typeof KNOWN_READERS[number];

export interface FrameworkMeta {
  id: Framework;
  version: string | UNKNOWN_VERSION;
}

/** Communicates readiness to `ensureContentScript` */
export const ENSURE_CONTENT_SCRIPT_READY =
  "@@pixiebrix/script/ENSURE_CONTENT_SCRIPT_READY";
