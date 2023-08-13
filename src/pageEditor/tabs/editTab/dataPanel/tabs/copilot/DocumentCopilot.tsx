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
import { useDispatch, useSelector } from "react-redux";
import { useRecommendDocPanelMutation } from "@/services/api";
import { selectActiveNodeInfo } from "@/pageEditor/slices/editorSelectors";
import { useField } from "formik";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Form from "@/components/form/Form";
import { Button } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const DocumentCopilot: React.FC = () => {
  const dispatch = useDispatch();
  const [recommend] = useRecommendDocPanelMutation();
  const node = useSelector(selectActiveNodeInfo);

  const [field, , { setValue }] = useField(node.path);

  const onSubmit = useCallback(
    async (values: { description: string }) => {
      const result = await recommend({ ...values, max_tries: 5 }).unwrap();

      const config = result.doc_panel;

      dispatch(editorSlice.actions.setNodePreviewActiveElement(null));
      await setValue({ ...field.value, config });
      dispatch(
        editorSlice.actions.setNodeDataPanelTabSelected(DataPanelTabKey.Preview)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setValue reference changes on every render
    [field.value, dispatch, recommend]
  );

  return (
    <div>
      <div>
        Create Panel from Description. Will overwrite any existing content.
        Currently only supports static text layouts.
      </div>

      <Form
        initialValues={{ description: "" }}
        onSubmit={onSubmit}
        renderSubmit={({ isSubmitting, isValid, handleSubmit }) => (
          <Button disabled={!isValid || isSubmitting} onClick={handleSubmit}>
            Create Panel
          </Button>
        )}
      >
        <ConnectedFieldTemplate
          name="description"
          label="Description"
          as="textarea"
        />
      </Form>
    </div>
  );
};

export default DocumentCopilot;
