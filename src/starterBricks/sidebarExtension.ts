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

import {
  type InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import { propertiesToSchema } from "@/validators/generic";
import {
  type CustomEventOptions,
  type DebounceOptions,
  StarterBrickABC,
  type StarterBrickConfig,
  type StarterBrickDefinition,
} from "@/starterBricks/types";
import { type Permissions } from "webextension-polyfill";
import { checkAvailable } from "@/bricks/available";
import notify from "@/utils/notify";
import {
  removeExtensionPoint,
  reservePanels,
  sidebarShowEvents,
  updateHeading,
  upsertPanel,
} from "@/contentScript/sidebarController";
import Mustache from "mustache";
import { uuidv4 } from "@/types/helpers";
import { HeadlessModeError } from "@/bricks/errors";
import {
  makeShouldRunExtensionForStateChange,
  selectExtensionContext,
} from "@/starterBricks/helpers";
import { cloneDeep, debounce, stubTrue } from "lodash";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { selectAllBlocks } from "@/bricks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { NoRendererError } from "@/errors/businessErrors";
import { serializeError } from "serialize-error";
import { isSidebarFrameVisible } from "@/contentScript/sidebarDomControllerLite";
import { type Schema } from "@/types/schemaTypes";
import {
  type ModComponentBase,
  type ResolvedModComponent,
} from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type JsonObject } from "type-fest";
import { type UUID } from "@/types/stringTypes";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";

export type SidebarConfig = {
  heading: string;
  body: BrickConfig | BrickPipeline;
};

export type Trigger =
  // `load` is page load/navigation (default for backward compatability)
  | "load"
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  | "selectionchange"
  // A change in the shared page state
  | "statechange"
  // Manually, e.g., via the Page Editor or Show Sidebar brick
  | "manual"
  // A custom event configured by the user
  | "custom";

export abstract class SidebarStarterBrickABC extends StarterBrickABC<SidebarConfig> {
  abstract get trigger(): Trigger;

  abstract get debounceOptions(): DebounceOptions;

  abstract get customTriggerOptions(): CustomEventOptions;

  readonly permissions: Permissions.Permissions = {};

  /**
   * Controller to drop all listeners and timers
   * @private
   */
  private abortController = new AbortController();

  private installedListeners = false;

  inputSchema: Schema = propertiesToSchema(
    {
      heading: {
        type: "string",
        description: "The heading for the panel",
      },
      body: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/renderer#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
    },
    ["heading", "body"]
  );

  // Historical context: in the browser API, the toolbar icon is bound to an action. This is a panel that's shown
  // when the user toggles the toolbar icon. Hence: actionPanel
  public get kind(): "actionPanel" {
    return "actionPanel";
  }

  async getBlocks(
    extension: ResolvedModComponent<SidebarConfig>
  ): Promise<Brick[]> {
    return selectAllBlocks(extension.config.body);
  }

  clearExtensionInterfaceAndEvents(): void {
    this.extensions.splice(0, this.extensions.length);
  }

  public override uninstall(): void {
    this.clearExtensionInterfaceAndEvents();
    removeExtensionPoint(this.id);
    console.debug(
      "SidebarStarterBrick:uninstall: stop listening for sidebarShowEvents"
    );
    sidebarShowEvents.remove(this.run);
    this.cancelListeners();
  }

  /**
   * HACK: a version of uninstall that keeps the panel for extensionId in the sidebar so the tab doesn't flicker
   * @param extensionId the panel to preserve
   * @see uninstall
   */
  public HACK_uninstallExceptExtension(extensionId: UUID): void {
    this.clearExtensionInterfaceAndEvents();
    removeExtensionPoint(this.id, { preserveExtensionIds: [extensionId] });
    console.debug(
      "SidebarStarterBrick:HACK_uninstallExceptExtension: stop listening for sidebarShowEvents"
    );
    sidebarShowEvents.remove(this.run);
  }

  private async runExtension(
    readerContext: JsonObject,
    extension: ResolvedModComponent<SidebarConfig>
  ) {
    // Generate our own run id so that we know it (to pass to upsertPanel)
    const runId = uuidv4();

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    const serviceContext = await makeServiceContext(extension.services);
    const extensionContext = { ...readerContext, ...serviceContext };

    const { heading: rawHeading, body } = extension.config;

    const heading = Mustache.render(rawHeading, extensionContext);

    updateHeading(extension.id, heading);

    const initialValues: InitialValues = {
      input: readerContext,
      optionsArgs: extension.optionsArgs,
      root: document,
      serviceContext,
    };

    /**
     * Renderers need to be run with try-catch, catch the HeadlessModeError, and
     * use that to send the panel payload to the sidebar (or other target)
     * @see runRendererBlock
     * @see executeBlockWithValidatedProps
     *  starting on line 323, the runRendererPipeline() function
     */
    try {
      await reduceExtensionPipeline(body, initialValues, {
        headless: true,
        logger: extensionLogger,
        ...apiVersionOptions(extension.apiVersion),
        runId,
      });
      // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
      // noinspection ExceptionCaughtLocallyJS
      throw new NoRendererError();
    } catch (error) {
      const ref = {
        extensionId: extension.id,
        extensionPointId: this.id,
        blueprintId: extension._recipe?.id,
      };

      const meta = {
        runId,
        extensionId: extension.id,
      };

      if (error instanceof HeadlessModeError) {
        upsertPanel(ref, heading, {
          blockId: error.blockId,
          key: uuidv4(),
          ctxt: error.ctxt,
          args: error.args,
          ...meta,
        });
      } else {
        extensionLogger.error(error);
        upsertPanel(ref, heading, {
          key: uuidv4(),
          error: serializeError(error),
          ...meta,
        });
      }
    }
  }

  /**
   * DO NOT CALL DIRECTLY - call debouncedRefreshPanels
   */
  private readonly refreshPanels = async ({
    shouldRunExtension = stubTrue,
  }: {
    shouldRunExtension?: (extension: ModComponentBase) => boolean;
  }): Promise<void> => {
    const extensionsToRefresh = this.extensions.filter((extension) =>
      shouldRunExtension(extension)
    );

    if (extensionsToRefresh.length === 0) {
      // Skip overhead of calling reader if no extensions should run
      return;
    }

    const reader = await this.defaultReader();

    const readerContext = await reader.read(document);

    const errors: unknown[] = [];

    // OK to run in parallel because we've fixed the order the panels appear in reservePanels
    await Promise.all(
      extensionsToRefresh.map(async (extension) => {
        try {
          await this.runExtension(readerContext, extension);
        } catch (error) {
          errors.push(error);
          this.logger
            .childLogger({
              deploymentId: extension._deployment?.id,
              extensionId: extension.id,
            })
            .error(error);
        }
      })
    );

    if (errors.length > 0) {
      notify.error(`An error occurred adding ${errors.length} panels(s)`);
    }
  };

  /**
   * Refresh all panels for the StarterBrick
   * @private
   */
  private debouncedRefreshPanels = this.refreshPanels; // Default to un-debounced

  addCancelHandler(callback: () => void): void {
    this.abortController.signal.addEventListener("abort", callback);
  }

  cancelListeners(): void {
    // Inform registered listeners
    this.abortController.abort();

    // Allow new registrations
    this.abortController = new AbortController();

    this.installedListeners = false;
  }

  /**
   * Shared event handler for DOM event triggers
   */
  private readonly eventHandler: JQuery.EventHandler<unknown> = async (
    event
  ) => {
    await this.debouncedRefreshPanels({
      shouldRunExtension:
        this.trigger === "statechange"
          ? makeShouldRunExtensionForStateChange(event.originalEvent)
          : stubTrue,
    });
  };

  private attachEventTrigger(eventName: string): void {
    const $document = $(document);

    $document.off(eventName, this.eventHandler);

    // Install the DOM trigger
    $document.on(eventName, this.eventHandler);

    this.addCancelHandler(() => {
      $document.off(eventName, this.eventHandler);
    });
  }

  // Use arrow syntax to avoid having to bind when passing as listener to `sidebarShowEvents.add`
  run = async ({ reason }: RunArgs): Promise<void> => {
    if (!(await this.isAvailable())) {
      console.debug(
        "SidebarStarterBrick:run calling sidebarController:removeExtensionPoint because StarterBrick is not available for URL",
        this.id
      );

      // Keep sidebar entries up-to-date regardless of trigger policy
      removeExtensionPoint(this.id);
      return;
    }

    if (this.extensions.length === 0) {
      console.debug(
        "SidebarStarterBrick:run Sidebar StarterBrick %s has no installed extensions",
        this.id
      );

      return;
    }

    // Reserve placeholders in the sidebar for when it becomes visible. `Run` is called from lifecycle.ts on navigation;
    // the sidebar won't be visible yet on initial page load.
    reservePanels(
      this.extensions.map((extension) => ({
        extensionId: extension.id,
        extensionPointId: this.id,
        blueprintId: extension._recipe?.id,
      }))
    );

    if (!isSidebarFrameVisible()) {
      console.debug(
        "SidebarStarterBrick:run Skipping run for %s because sidebar is not visible",
        this.id
      );
      return;
    }

    // On the initial run or a manual run, run directly
    if (
      this.trigger === "load" ||
      [
        RunReason.MANUAL,
        RunReason.INITIAL_LOAD,
        RunReason.PAGE_EDITOR,
      ].includes(reason)
    ) {
      void this.debouncedRefreshPanels({
        shouldRunExtension: stubTrue,
      });
    }

    if (!this.installedListeners) {
      if (
        this.trigger === "selectionchange" ||
        this.trigger === "statechange"
      ) {
        this.attachEventTrigger(this.trigger);
      } else if (
        this.trigger === "custom" &&
        this.customTriggerOptions?.eventName
      ) {
        this.attachEventTrigger(this.customTriggerOptions?.eventName);
      }

      this.installedListeners = true;
    }
  };

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      // Reserve the panels, so the sidebarController knows about them prior to the sidebar showing.
      // Previously we were just relying on the sidebarShowEvents event listeners, but that caused race conditions
      // with how other content is loaded in the sidebar
      reservePanels(
        this.extensions.map((extension) => ({
          extensionId: extension.id,
          extensionPointId: this.id,
          blueprintId: extension._recipe?.id,
        }))
      );

      // Add event listener so content for the panel is calculated/loaded when the sidebar opens
      console.debug(
        "SidebarStarterBrick:install: listen for sidebarShowEvents"
      );
      sidebarShowEvents.add(this.run);
    } else {
      removeExtensionPoint(this.id);
    }

    if (this.debounceOptions?.waitMillis) {
      const { waitMillis, ...options } = this.debounceOptions;
      this.debouncedRefreshPanels = debounce(
        this.refreshPanels,
        waitMillis,
        options
      );
    }

    return available;
  }
}

export interface PanelDefinition extends StarterBrickDefinition {
  /**
   * The trigger to refresh the panel
   *
   * @since 1.6.5
   */
  trigger?: Trigger;

  /**
   * For `custom` trigger, the custom event trigger options.
   *
   * @since 1.6.5
   */
  customEvent?: CustomEventOptions;

  /**
   * Options for debouncing the overall refresh of the panel
   *
   * @since 1.6.5
   */
  debounce?: DebounceOptions;
}

class RemotePanelExtensionPoint extends SidebarStarterBrickABC {
  private readonly definition: PanelDefinition;

  public readonly rawConfig: StarterBrickConfig;

  constructor(config: StarterBrickConfig) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(cloned.metadata, new BackgroundLogger());
    this.rawConfig = cloned;
    this.definition = cloned.definition;
  }

  public override get syncInstall() {
    // Panels must be reserved for the page to be considered ready. Otherwise, there are race conditions with whether
    // the sidebar panels have been reserved by the time the user clicks the browserAction.
    return true;
  }

  override async defaultReader(): Promise<Reader> {
    return mergeReaders(this.definition.reader);
  }

  get debounceOptions(): DebounceOptions | null {
    return this.definition.debounce;
  }

  get customTriggerOptions(): CustomEventOptions | null {
    return this.definition.customEvent;
  }

  get trigger(): Trigger {
    // Default to load for backward compatability
    return this.definition.trigger ?? "load";
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this.definition.isAvailable);
  }
}

export function fromJS(config: StarterBrickConfig): StarterBrick {
  const { type } = config.definition;
  if (type !== "actionPanel") {
    throw new Error(`Expected type=actionPanel, got ${type}`);
  }

  return new RemotePanelExtensionPoint(config);
}