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
import React, { useRef, useState } from "react";
import { expectContext } from "@/utils/expectContext";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import { Stylesheets } from "@/components/Stylesheets";
import ReactDOM from "react-dom";

const PAGE_EDITOR_WALKTHROUGH_MODAL_CONTAINER_ID =
  "page-editor-walkthrough-modal";

export const WalkthroughModalApp: React.FunctionComponent = () => {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);
  const handleClose = () => setShow(false);

  const ref = useRef(null);

  const carouselItem = (body) => (
    <Carousel.Item>
      <Modal.Header closeButton>Step {index + 1} of 3</Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <button
          onClick={() => {
            setIndex(index - 1);
          }}
        >
          Prev
        </button>
        <button
          onClick={() => {
            setIndex(index + 1);
          }}
        >
          Next
        </button>
      </Modal.Footer>
    </Carousel.Item>
  );

  return (
    <Stylesheets href={[bootstrap]}>
      <Modal
        show={show}
        onHide={handleClose}
        container={document
          .querySelector("#page-editor-walkthrough-modal")
          .shadowRoot.querySelector("#WUMBO")}
      >
        <Carousel
          activeIndex={index}
          slide={false}
          controls={false}
          interval={null}
          ref={ref}
        >
          {carouselItem(
            <>
              <h3>Opening the Chrome Dev Tools</h3>
              <p>
                The Page Editor lives in the Chrome Dev tools. So the first step
                is to open them. You can open it in two different ways.
              </p>
            </>
          )}
          {carouselItem(<div>2</div>)}
          {carouselItem(<div>3</div>)}
        </Carousel>
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
