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

import React from "react";
import { Button, ButtonProps } from "react-bootstrap";
import { useAsyncFn } from "react-use";
import { Asyncify } from "type-fest";

export type AsyncEventHandler = Asyncify<React.MouseEventHandler>;
export type AsyncButtonProps = ButtonProps & {
  onClick: AsyncEventHandler;
  // TODO: Actually follow this, it's currently ignored
  autoFocus?: boolean;
};

const AsyncButton: React.FunctionComponent<AsyncButtonProps> = ({
  onClick,
  children,
  disabled: manualDisabled = false,
  ...buttonProps
}) => {
  const [state, handleClick] = useAsyncFn(onClick, []);

  return (
    <Button
      disabled={manualDisabled || state.loading}
      {...buttonProps}
      onClick={(event) => {
        event.stopPropagation();
        handleClick(event);
      }}
    >
      {children}
    </Button>
  );
};

export default AsyncButton;
