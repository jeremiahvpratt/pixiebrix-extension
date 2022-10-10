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

import { useEffect } from "react";
import { AbortViaUnmount } from "@/errors/genericErrors";

export default function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<unknown>,
  inputs?: unknown[]
) {
  useEffect(() => {
    const controller = new AbortController();
    void effect(controller.signal);

    return () => {
      controller.abort(new AbortViaUnmount());
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps -- Rule is enforced in the caller
  }, inputs);
}
