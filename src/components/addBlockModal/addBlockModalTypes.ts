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

import type React from "react";
import { type Brick } from "@/types/brickTypes";
import { type RegistryId } from "@/types/registryTypes";

export type BlockResult = Brick & {
  isPopular?: boolean;
};

export type BlockOption = {
  blockResult: BlockResult;
  value: RegistryId;
  label: string;
};

export type BlockGridData = {
  blockOptions: BlockOption[];
  invalidBlockMessages: Map<RegistryId, React.ReactNode>;
  onSetDetailBlock: (block: Brick) => void;
  onSelectBlock: (block: Brick) => void;
};

export type ItemKeyInput = {
  columnIndex: number;
  data: BlockGridData;
  rowIndex: number;
};
