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

import React, { useEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import initGoogle, {
  subscribe,
  isGoogleInitialized,
  isGAPISupported,
} from "@/contrib/google/initGoogle";
import AsyncButton from "@/components/AsyncButton";
import useUserAction from "@/hooks/useUserAction";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { detectBrowser } from "@/vendors/mixpanel";

/**
 * Wrapper component to require that the Google API is initialized before rendering its children.
 * @constructor
 * @see initGoogle
 */
export const RequireGoogleApi: React.FC = ({ children }) => {
  const isInitialized = useSyncExternalStore(subscribe, isGoogleInitialized);
  const isSupported = isGAPISupported();

  const initGoogleAction = useUserAction(
    initGoogle,
    {
      errorMessage: "Error initializing Google API",
    },
    []
  );

  // Report to help provide customer support
  useEffect(() => {
    if (!isSupported) {
      reportEvent(Events.UNSUPPORTED_BROWSER_GATE_VIEW, {
        $browser: detectBrowser(navigator.userAgent, navigator.vendor),
      });
    } else if (!isInitialized) {
      reportEvent(Events.UNINITIALIZED_GAPI_GATE_VIEW, {
        $browser: detectBrowser(navigator.userAgent, navigator.vendor),
      });
    }
  }, [isSupported, isInitialized]);

  if (!isSupported) {
    return (
      <div>
        The Google API is not supported in this browser. Please use Google
        Chrome.
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div>
        <div>
          The Google API is not initialized. Please click the button to
          initialize it.
        </div>
        <div className="mt-2">
          <AsyncButton onClick={initGoogleAction}>Connect</AsyncButton>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export function requireGoogleHOC<InferredProps>(
  Component: React.ComponentType<InferredProps>
): React.FunctionComponent<InferredProps> {
  const WrappedComponent: React.FunctionComponent<InferredProps> = (props) => (
    <RequireGoogleApi>
      <Component {...props} />
    </RequireGoogleApi>
  );

  WrappedComponent.displayName = `RequireGoogleApi(${
    Component.displayName ?? Component.name
  })`;
  return WrappedComponent;
}

export default RequireGoogleApi;
