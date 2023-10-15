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

import { type Nominal } from "@/utils/typeUtils";

/**
 * A known UUID v4 string
 * @see uuidv4
 * @see isUUID
 */
export type UUID = Nominal<string, "UUID">;

/**
 * An ISO timestamp string
 */
export type Timestamp = Nominal<string, "Timestamp">;

/**
 * A string known not to be tainted with user-generated input.
 */
export type SafeString = Nominal<string, "SafeString">;

/**
 * Rendered HTML that has been sanitized.
 * @see sanitize
 */
export type SafeHTML = Nominal<string, "SafeHTML">;
