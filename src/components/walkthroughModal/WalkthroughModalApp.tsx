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

import { Carousel, Modal } from "react-bootstrap";
import React, { useRef } from "react";
import { expectContext } from "@/utils/expectContext";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import { Stylesheets } from "@/components/Stylesheets";
import ReactDOM from "react-dom";

const PAGE_EDITOR_WALKTHROUGH_MODAL_CONTAINER_ID =
  "page-editor-walkthrough-modal";

export const WalkthroughModalApp: React.FunctionComponent = () => {
  const ref = useRef(null);
  return (
    <Stylesheets href={[bootstrap]}>
      <Modal
        show={true}
        container={document
          .querySelector("#page-editor-walkthrough-modal")
          .shadowRoot.querySelector("#WUMBO")}
      >
        <Modal.Body>
          <Carousel slide={false} controls={false} ref={ref}>
            <Carousel.Item>step 1</Carousel.Item>
            <Carousel.Item>step 2</Carousel.Item>
            <Carousel.Item>step 3</Carousel.Item>
          </Carousel>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => {
              ref.current.prev();
            }}
          >
            Prev
          </button>
          <button
            onClick={() => {
              ref.current.next();
            }}
          >
            Next
          </button>
        </Modal.Footer>
      </Modal>
    </Stylesheets>
  );
};

const initWalkthroughModalApp = async () => {
  expectContext("contentScript");

  const container = document.createElement("div");
  container.id = PAGE_EDITOR_WALKTHROUGH_MODAL_CONTAINER_ID;
  document.body.prepend(container);

  const shadow = container.attachShadow({ mode: "open" });
  const innerContainer = document.createElement("div");
  innerContainer.id = "WUMBO";
  shadow.append(innerContainer);

  ReactDOM.render(<WalkthroughModalApp />, innerContainer);
};

export const showWalkthroughModal = async () => {
  await initWalkthroughModalApp();
};
