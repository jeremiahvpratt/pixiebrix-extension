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

import { VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { BlockPosition, BlockConfig } from "@/blocks/types";
import { BlockArgContext } from "@/core";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { makeServiceContext } from "@/services/serviceUtils";
import { AnalysisVisitor } from "./baseAnalysisVisitors";

enum VarExistence {
  MAYBE = "MAYBE",
  DEFINITELY = "DEFINITELY",
}

type BlockVars = Map<string, VarExistence>;
type ExtensionVars = Map<string, BlockVars>;
type PreviousVisitedBlock = {
  vars: BlockVars;
  output: BlockVars | null;
};
class VarAnalysis extends AnalysisVisitor {
  knownVars: ExtensionVars = new Map<string, BlockVars>();
  previousVisitedBlock: PreviousVisitedBlock = null;

  get id() {
    return "var";
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ) {
    const currentBlockVars = new Map<string, VarExistence>([
      ...this.previousVisitedBlock.vars,
      ...(this.previousVisitedBlock.output ?? []),
    ]);
    this.knownVars.set(position.path, currentBlockVars);

    const currentBlockOutput = new Map<string, VarExistence>();

    if (blockConfig.outputKey) {
      currentBlockOutput.set(blockConfig.outputKey, VarExistence.DEFINITELY);

      // TODO: revisit the wildcard/regex format of MAYBE vars
      currentBlockOutput.set(`${blockConfig.outputKey}.*`, VarExistence.MAYBE);
    }

    this.previousVisitedBlock = {
      vars: currentBlockVars,
      output: currentBlockOutput,
    };

    super.visitBlock(position, blockConfig, extra);
  }

  override async run(extension: FormState): Promise<void> {
    let context = {} as BlockArgContext;

    const serviceContext = extension.services?.length
      ? await makeServiceContext(extension.services)
      : null;
    if (serviceContext) {
      context = {
        ...context,
        ...serviceContext,
      };
    }

    // TODO: properly get reader context,
    // see @/extensionPoints/sidebarExtension.ts#L242
    const readerContext = {
      icon: "",
      title: "",
      url: "",
    };
    context["@input"] = readerContext;

    // TODO: should we check the blueprint definition instead?
    if (extension.optionsArgs) {
      context["@options"] = extension.optionsArgs;
    }

    const definitelyVars = getVarsFromObject(context);
    this.previousVisitedBlock = {
      vars: new Map<string, VarExistence>(
        definitelyVars.map((x) => [x, VarExistence.DEFINITELY])
      ),
      output: null,
    };
    super.run(extension);

    console.log("varMap", this.knownVars);
  }
}

export function getVarsFromObject(obj: unknown): string[] {
  const vars: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    vars.push(key);
    if (typeof value === "object") {
      const nestedVars = getVarsFromObject(value);
      vars.push(...nestedVars.map((x) => `${key}.${x}`));
    }
  }

  return vars;
}

export default VarAnalysis;
