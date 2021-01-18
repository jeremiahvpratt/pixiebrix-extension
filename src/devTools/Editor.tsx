/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { Formik, FormikValues } from "formik";
import ElementWizard from "@/devTools/editor/ElementWizard";
import {
  EditorState,
  editorSlice,
  FormState,
} from "@/devTools/editor/editorSlice";
import { EditablePackage, useCreate } from "@/devTools/editor/useCreate";
import Sidebar from "@/devTools/editor/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/pages/InstalledPage";
import { RootState } from "@/devTools/store";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import SplitPane from "react-split-pane";
import { isEqual } from "lodash";
import { useAsyncState } from "@/hooks/common";
import axios from "axios";
import { makeURL } from "@/hooks/fetch";
import { getExtensionToken } from "@/auth/token";

const { updateElement } = editorSlice.actions;

const Effect: React.FunctionComponent<{
  values: FormikValues;
  onChange: (values: FormikValues) => void;
}> = ({ values, onChange }) => {
  const [prev, setPrev] = useState(values);
  // debounce a bit, because isEqual is not inexpensive
  const [debounced] = useDebounce(values, 25, {
    leading: true,
    trailing: true,
  });
  useEffect(() => {
    // Formik changing the reference, so can't use reference equality here
    if (!isEqual(prev, debounced)) {
      onChange(debounced);
      setPrev(debounced);
    }
  }, [prev, setPrev, debounced, onChange]);
  return null;
};

const Editor: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const installed = useSelector(selectExtensions);

  const {
    inserting,
    elements,
    activeElement,
    error,
    knownEditable,
  } = useSelector<RootState, EditorState>((x) => x.editor);

  const updateHandler = useDebouncedCallback(
    (values: FormState) => {
      dispatch(updateElement(values));
    },
    100,
    { trailing: true, leading: false }
  );

  const selectedElement = useMemo(() => {
    return activeElement
      ? elements.find((x) => x.uuid === activeElement)
      : null;
  }, [elements, activeElement]);

  const create = useCreate();

  const [initialEditable] = useAsyncState(async () => {
    const { data } = await axios.get<EditablePackage[]>(
      await makeURL("api/bricks/"),
      {
        headers: { Authorization: `Token ${await getExtensionToken()}` },
      }
    );
    console.debug("Fetch editable bricks", { editable: initialEditable });
    return new Set(data.map((x) => x.name));
  }, []);

  const editable = useMemo<Set<string>>(() => {
    const rv = new Set<string>(initialEditable ?? new Set());
    for (const x of knownEditable) {
      rv.add(x);
    }
    return rv;
  }, [initialEditable, knownEditable]);

  const body = useMemo(() => {
    if (inserting) {
      return (
        <div className="p-2">
          <h3>Select a position</h3>
          <p>
            Click on a web page element to select the position for the new
            element.
          </p>
        </div>
      );
    } else if (error) {
      return (
        <div className="p-2">
          <span className="text-danger">{error}</span>
        </div>
      );
    } else if (selectedElement) {
      return (
        <Formik
          key={`${selectedElement.uuid}-${selectedElement.installed}`}
          initialValues={selectedElement}
          onSubmit={create}
        >
          {({ values }) => (
            <>
              <Effect values={values} onChange={updateHandler.callback} />
              <ElementWizard element={values} editable={editable} />
            </>
          )}
        </Formik>
      );
    } else if (elements.length) {
      return (
        <div className="p-2">
          <span>No element selected</span>
        </div>
      );
    } else {
      return (
        <div className="p-2">
          <span>No elements added to page yet</span>
        </div>
      );
    }
  }, [inserting, selectedElement, elements?.length, error, editable]);

  return (
    <Container fluid className="h-100">
      <SplitPane split="vertical" allowResize minSize={225} defaultSize={225}>
        <Sidebar
          installed={installed}
          elements={elements}
          activeElement={activeElement}
          inserting={inserting}
        />
        {body}
      </SplitPane>
    </Container>
  );
};

export default Editor;
