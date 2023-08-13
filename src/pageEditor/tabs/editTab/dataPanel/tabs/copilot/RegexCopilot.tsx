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
import { useRecommendRegexMutation } from "@/services/api";
import { selectActiveNodeInfo } from "@/pageEditor/slices/editorSelectors";
import { useField } from "formik";
import Form from "@/components/form/Form";
import { Button } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const RegexCopilot: React.FC = () => {
  const dispatch = useDispatch();
  const [recommend] = useRecommendRegexMutation();
  const node = useSelector(selectActiveNodeInfo);

  const [field, , { setValue }] = useField(node.path);

  const onSubmit = useCallback(
    async (values: { description: string; input: string; output: string }) => {
      const { regex } = await recommend({
        pattern: values.description,
        examples: [{ input: values.input, output: values.output }],
        max_tries: 5,
      }).unwrap();

      await setValue({
        ...field.value,
        config: {
          ...field.value.config,
          regex,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setValue reference changes on every render
    [field.value, dispatch, recommend]
  );

  return (
    <div>
      <div>
        Create Regex from Description. Will overwrite the existing pattern.
      </div>

      <Form
        initialValues={{ description: "", input: "", output: "" }}
        onSubmit={onSubmit}
        renderSubmit={({ isSubmitting, isValid, handleSubmit }) => (
          <Button disabled={!isValid || isSubmitting} onClick={handleSubmit}>
            Generate Regex
          </Button>
        )}
      >
        <ConnectedFieldTemplate
          name="description"
          label="Description"
          as="textarea"
        />

        <ConnectedFieldTemplate name="input" label="Example Input" />

        <ConnectedFieldTemplate name="output" label="Example Output" />
      </Form>
    </div>
  );
};

export default RegexCopilot;
