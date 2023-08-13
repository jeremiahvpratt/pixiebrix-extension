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

import React from "react";
import { useSelector } from "react-redux";
import { selectActiveNodeInfo } from "@/pageEditor/slices/editorSelectors";
import { DocumentRenderer } from "@/bricks/renderers/document";
import DocumentCopilot from "@/pageEditor/tabs/editTab/dataPanel/tabs/copilot/DocumentCopilot";
import { RegexTransformer } from "@/bricks/transformers/regex";
import RegexCopilot from "@/pageEditor/tabs/editTab/dataPanel/tabs/copilot/RegexCopilot";

const CopilotTab: React.FC = () => {
  const node = useSelector(selectActiveNodeInfo);

  if (node.blockId === DocumentRenderer.BLOCK_ID) {
    return <DocumentCopilot />;
  }

  if (node.blockId === RegexTransformer.BRICK_ID) {
    return <RegexCopilot />;
  }

  return <div>Copilot is not available for this brick</div>;
};

export default CopilotTab;
