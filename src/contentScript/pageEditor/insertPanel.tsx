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

// https://github.com/facebook/react/blob/7559722a865e89992f75ff38c1015a865660c3cd/packages/react-devtools-shared/src/backend/views/Highlighter/index.js

import { uuidv4 } from "@/types/helpers";
import { userSelectElement } from "./elementPicker";
import * as pageScript from "@/pageScript/messenger/api";
import { findContainer } from "@/utils/inference/selectorInference";
import { type PanelSelectionResult } from "@/contentScript/pageEditor/types";
import { inferPanelHTML } from "@/utils/inference/markupInference";

const DEFAULT_PANEL_HEADING = "PixieBrix Panel";

export async function insertPanel(): Promise<PanelSelectionResult> {
  // Dynamically import because it's a large package (130kb minified) that's only used by Page Editor
  const { beautifyHTML } = await import(
    /* webpackChunkName: "js-beautify" */
    "./beautify"
  );

  const { elements: selected } = await userSelectElement();
  const { container, selectors } = findContainer(selected);

  return {
    uuid: uuidv4(),
    panel: {
      heading: DEFAULT_PANEL_HEADING,
      shadowDOM: true,
    },
    foundation: {
      type: "panel",
      containerSelector: selectors[0],
      template: beautifyHTML(inferPanelHTML(container, selected), {
        indent_handlebars: true,
        wrap_line_length: 80,
        wrap_attributes: "force",
      }),
      position: "prepend",
    },
    containerInfo: await pageScript.getElementInfo({ selector: selectors[0] }),
  };
}
