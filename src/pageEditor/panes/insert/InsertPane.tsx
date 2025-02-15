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

import React, { useCallback } from "react";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import InsertMenuItemPane from "@/pageEditor/panes/insert/InsertMenuItemPane";
import InsertPanelPane from "@/pageEditor/panes/insert/InsertPanelPane";
import { useDispatch } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import { cancelSelect } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import useEscapeHandler from "@/pageEditor/hooks/useEscapeHandler";
import useAutoInsert from "@/pageEditor/panes/insert/useAutoInsert";

const InsertPane: React.FC<{ inserting: StarterBrickType }> = ({
  inserting,
}) => {
  // Auto-insert if the StarterBrickType supports it
  useAutoInsert(inserting);

  const dispatch = useDispatch();

  const cancelInsert = useCallback(async () => {
    dispatch(actions.toggleInsert(null));
    await cancelSelect(thisTab);
  }, [dispatch]);

  // Cancel insert with escape key
  useEscapeHandler(cancelInsert, inserting != null);

  switch (inserting) {
    case "menuItem": {
      return <InsertMenuItemPane cancel={cancelInsert} />;
    }

    case "panel": {
      return <InsertPanelPane cancel={cancelInsert} />;
    }

    default: {
      return null;
    }
  }
};

export default InsertPane;
