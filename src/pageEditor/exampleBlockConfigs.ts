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

import { type UnknownObject } from "@/types/objectTypes";
import { COMPONENT_READER_ID } from "@/bricks/transformers/component/ComponentReader";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import { DocumentRenderer } from "@/bricks/renderers/document";
import {
  makePipelineExpression,
  makeTemplateExpression,
} from "@/runtime/expressionCreators";
import { type BrickConfig } from "@/bricks/types";
import { uuidv4 } from "@/types/helpers";
import { defaultBlockConfig } from "@/bricks/util";
import TourStep from "@/bricks/transformers/tourStep/tourStep";
import { getMinimalUiSchema } from "@/components/formBuilder/formBuilderHelpers";
import { type RegistryId } from "@/types/registryTypes";
import { type Schema } from "@/types/schemaTypes";
import { JavaScriptTransformer } from "@/bricks/transformers/javascript";

/**
 * Get a default block config for a block
 * @param blockId the block id to add
 * @param parentBlockId the parent block id, or null if in the root pipeline
 */
export function getExampleBlockConfig(
  blockId: RegistryId,
  { parentBlockId }: { parentBlockId?: RegistryId } = {}
): UnknownObject | null {
  switch (blockId) {
    case COMPONENT_READER_ID: {
      return {
        selector: "",
        optional: false,
      };
    }

    case "@pixiebrix/jquery-reader": {
      return {
        selectors: {
          property: {
            selector: "",
            isMulti: false,
          },
        },
      };
    }

    case FormTransformer.BLOCK_ID: {
      return {
        schema: {
          title: "Example Form",
          type: "object",
          properties: {
            example: {
              title: "Example Field",
              type: "string",
              description: "An example form field",
            },
          },
        },
        uiSchema: getMinimalUiSchema(),
        cancelable: true,
        submitCaption: "Submit",
        location: "modal",
      };
    }

    case CustomFormRenderer.BLOCK_ID: {
      return {
        storage: {
          type: "state",
          namespace: "blueprint",
        },
        submitCaption: "Submit",
        successMessage: "Successfully submitted form",
        schema: {
          title: "Example Form",
          type: "object",
          properties: {
            notes: {
              title: "Example Notes Field",
              type: "string",
              description: "An example notes field",
            },
          },
        },
        uiSchema: {
          notes: {
            "ui:widget": "textarea",
          },
        },
      };
    }

    case "@pixiebrix/document": {
      if (parentBlockId === "@pixiebrix/tour/step") {
        // Single row with text markdown
        const container = createNewElement("container");

        // Adding text to the second row
        const text = createNewElement("text");
        text.config.text = "Example step content. **Markdown** is supported.";
        container.children[0].children[0].children.push(text);

        return {
          body: [container],
        };
      }

      // Creating container with 2 rows and 1 column in each row
      const container = createNewElement("container");
      container.children.push(createNewElement("row"));

      // Adding Header to the first row
      const header = createNewElement("header");
      header.config.title = "Example document";
      container.children[0].children[0].children.push(header);

      // Adding text to the second row
      const text = createNewElement("text");
      text.config.text = "Example text element. **Markdown** is supported.";
      container.children[1].children[0].children.push(text);

      return {
        body: [container],
      };
    }

    case "@pixiebrix/forms/set": {
      return {
        isRootAware: true,
        inputs: [{ selector: null, value: "" }],
      };
    }

    case "@pixiebrix/state/set": {
      return {
        namespace: "blueprint",
        mergeStrategy: "shallow",
        data: {},
      };
    }

    case "@pixiebrix/state/get": {
      return {
        namespace: "blueprint",
      };
    }

    case "@pixiebrix/state/assign": {
      return {
        variableName: "",
        value: makeTemplateExpression("nunjucks", ""),
      };
    }

    case DisplayTemporaryInfo.BLOCK_ID: {
      return {
        title: "Example Info",
        location: "panel",
        body: makePipelineExpression([
          createNewBlock(DocumentRenderer.BLOCK_ID),
        ]),
        isRootAware: true,
      };
    }

    case TourStep.BLOCK_ID: {
      return {
        title: "Example Step",
        body: "Step content. **Markdown** is supported.",
        appearance: {
          showOverlay: true,
          scroll: {
            behavior: "smooth",
          },
          // Supply empty appearance configs to avoid errors when rendering
          wait: {},
          highlight: {},
          popover: {},
          controls: {},
        },
      };
    }

    case JavaScriptTransformer.BRICK_ID: {
      return {
        function: `function (args) {
  const { x } = args;
  return x;
}`,
        arguments: { x: "Hello from PixieBrix!" },
      };
    }

    default: {
      return null;
    }
  }
}

export function createNewBlock(
  blockId: RegistryId,
  {
    parentBlockId,
    blockInputSchema,
  }: { parentBlockId?: RegistryId; blockInputSchema?: Schema } = {}
): BrickConfig {
  return {
    id: blockId,
    instanceId: uuidv4(),
    // @since 1.7.16 -- use "document" as the default root mode because it's the easiest to understand
    rootMode: "document",
    config:
      getExampleBlockConfig(blockId, { parentBlockId }) ??
      (blockInputSchema == null ? {} : defaultBlockConfig(blockInputSchema)),
  };
}
