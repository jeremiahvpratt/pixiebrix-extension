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

import React from "react";
import AppendSpreadsheetOptions from "./AppendSpreadsheetOptions";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { getToggleOptions } from "@/components/fields/schemaFields/getToggleOptions";
import { dereference } from "@/validators/generic";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import SheetsFileWidget from "@/contrib/google/sheets/ui/SheetsFileWidget";
import { render } from "@/pageEditor/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { services, sheets } from "@/background/messenger/api";
import { selectSchemaFieldType } from "@/testUtils/formHelpers";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";

const TEST_SPREADSHEET_ID = uuidSequence(1);
const OTHER_TEST_SPREADSHEET_ID = uuidSequence(2);
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");

const servicesLocateMock = services.locate as jest.MockedFunction<
  typeof services.locate
>;

jest.mock("@/contrib/google/initGoogle", () => ({
  isGoogleInitialized: jest.fn().mockReturnValue(true),
  isGAPISupported: jest.fn().mockReturnValue(true),
  subscribe: jest.fn().mockImplementation(() => () => {}),
}));

jest.mock("@/hooks/auth", () => ({
  __esModule: true,
  useAuthOptions: jest.fn().mockReturnValue([[], () => {}]),
}));

const getSheetPropertiesMock = jest.mocked(sheets.getSheetProperties);
const getTabNamesMock = jest.mocked(sheets.getTabNames);
const getHeadersMock = jest.mocked(sheets.getHeaders);

beforeAll(() => {
  registerDefaultWidgets();
  servicesLocateMock.mockResolvedValue(
    sanitizedIntegrationConfigFactory({
      serviceId: GOOGLE_SHEET_SERVICE_ID,
      // @ts-expect-error -- The type here is a record with a _brand field, so casting doesn't work
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
      },
    })
  );
  getSheetPropertiesMock.mockImplementation(async (spreadsheetId: string) =>
    spreadsheetId === TEST_SPREADSHEET_ID
      ? { title: "Test Sheet" }
      : { title: "Other Sheet" }
  );
  getTabNamesMock.mockImplementation(async (spreadsheetId: string) =>
    spreadsheetId === TEST_SPREADSHEET_ID
      ? ["Tab1", "Tab2"]
      : ["OtherTab1", "OtherTab2"]
  );
  getHeadersMock.mockImplementation(async ({ tabName }) => {
    switch (tabName) {
      case "Tab1": {
        return ["Column1", "Column2"];
      }

      case "Tab2": {
        return ["Foo", "Bar"];
      }

      case "OtherTab1": {
        return ["OtherColumn1", "OtherColumn2"];
      }

      default: {
        return ["OtherFoo", "OtherBar"];
      }
    }
  });
});

describe("getToggleOptions", () => {
  // Sanity check getToggleOptions returning expected values, because that would cause problems in the snapshot tests
  it("should include file picker and variable toggle options", async () => {
    const baseSchema = await dereference(BASE_SHEET_SCHEMA);

    const result = getToggleOptions({
      fieldSchema: baseSchema,
      customToggleModes: [],
      isRequired: true,
      allowExpressions: true,
      isObjectProperty: false,
      isArrayItem: false,
    });

    expect(result).toEqual([
      // The Google File Picker
      expect.objectContaining({
        Widget: SheetsFileWidget,
        value: "string",
      }),
      // Variable
      expect.objectContaining({
        value: "var",
      }),
    ]);
  });
});

describe("AppendSpreadsheetOptions", () => {
  test("should render successfully with string spreadsheetId value and empty nunjucks tabName", async () => {
    const rendered = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: makeTemplateExpression("nunjucks", ""),
            rowValues: {},
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("should render successfully with string spreadsheetId value and null tabName", async () => {
    const rendered = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: null,
            rowValues: {},
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should render successfully with string spreadsheetId value and selected tabName", async () => {
    const rendered = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: "Tab2",
            rowValues: {},
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("can choose tab and row values will load automatically with empty nunjucks tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: makeTemplateExpression("nunjucks", ""),
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
  });

  it("can choose tab and row values will load automatically with null tabName", async () => {
    const { rerender } = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: null,
            rowValues: {},
          },
        },
      }
    );

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();

    // Should not change on rerender
    rerender(<AppendSpreadsheetOptions name="" configKey="config" />);

    await waitForEffect();

    // Shows the header names for Tab2
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
  });

  it("loads in tab names with spreadsheet service integration and empty nunjucks tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@google"),
          tabName: makeTemplateExpression("nunjucks", ""),
          rowValues: {},
        },
        services: [
          {
            id: GOOGLE_SHEET_SERVICE_ID,
            outputKey: "google",
            config: uuidSequence(2),
          },
        ],
      },
    });

    await waitForEffect();

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("loads in tab names with spreadsheet service integration and null tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@google"),
          tabName: null,
          rowValues: {},
        },
        services: [
          {
            id: GOOGLE_SHEET_SERVICE_ID,
            outputKey: "google",
            config: uuidSequence(2),
          },
        ],
      },
    });

    await waitForEffect();

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("loads in tab names with mod input spreadsheetId and empty nunjucks tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: makeTemplateExpression("nunjucks", ""),
          rowValues: {},
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("loads in tab names with mod input spreadsheetId and null tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: null,
          rowValues: {},
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("allows any rowValues fields for variable tab name", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: makeVariableExpression("@mySheetTab"),
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    // Ensure that no header names have been loaded into the rowValues field
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("does not clear initial values with string spreadsheetId value and nunjucks tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: makeTemplateExpression("nunjucks", "Tab2"),
          rowValues: {
            Foo: makeTemplateExpression("nunjucks", "valueA"),
            Bar: makeTemplateExpression("nunjucks", "valueB"),
          },
        },
      },
    });

    await waitForEffect();

    // Ensure title loaded
    expect(screen.getByDisplayValue("Test Sheet")).toBeVisible();
    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure row values have both names and values
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  it("does not clear initial values with string spreadsheetId value and selected tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: "Tab2",
          rowValues: {
            Foo: makeTemplateExpression("nunjucks", "valueA"),
            Bar: makeTemplateExpression("nunjucks", "valueB"),
          },
        },
      },
    });

    await waitForEffect();

    // Ensure title loaded
    expect(screen.getByDisplayValue("Test Sheet")).toBeVisible();
    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure row values have both names and values
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  it("does not clear initial values on first render with var spreadsheetId value and nunjucks tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: makeTemplateExpression("nunjucks", "Tab2"),
          rowValues: {
            Foo: makeTemplateExpression("nunjucks", "valueA"),
            Bar: makeTemplateExpression("nunjucks", "valueB"),
          },
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure row values have both names and values
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  it("does not clear initial values on first render with var spreadsheetId value and selected tabName", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: "Tab2",
          rowValues: {
            Foo: makeTemplateExpression("nunjucks", "valueA"),
            Bar: makeTemplateExpression("nunjucks", "valueB"),
          },
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure row values have both names and values
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  it("does not automatically toggle the field to select and choose the first item, if the input is focused by the user", async () => {
    const { getFormState } = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: makeVariableExpression("@options.sheetId"),
            tabName: makeTemplateExpression("nunjucks", "Tab2"),
            rowValues: {
              Foo: makeTemplateExpression("nunjucks", "valueA"),
              Bar: makeTemplateExpression("nunjucks", "valueB"),
            },
          },
          optionsArgs: {
            sheetId: TEST_SPREADSHEET_ID,
          },
        },
      }
    );

    await waitForEffect();

    await act(async () => {
      await userEvent.clear(screen.getByLabelText("Tab Name"));
    });

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    const tabNameField = screen.getByLabelText("Tab Name");
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState().config.tabName).toEqual(
      makeTemplateExpression("nunjucks", "")
    );
  });

  it("does not clear selected tabName and rowValues fieldValues until a different spreadsheetId is loaded", async () => {
    const initialValues = {
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    };

    const { updateFormState } = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      { initialValues }
    );

    await waitForEffect();

    // Toggle the field to sheet picker
    await act(async () => {
      // The Google sheet picker uses "string" as the FieldInputMode
      await selectSchemaFieldType("config.spreadsheetId", "string");
    });

    // Ensure other fields have not changed yet. The spreadsheetId field value
    // will be an empty nunjucks template here, and the tab names array has not
    // loaded, so the tab name field will be automatically toggled to text
    // field input mode, and the value preserved.
    expect(screen.getByDisplayValue("Tab2")).toBeVisible();
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();

    // Update the form state value outside the Google sheet picker, so that we don't need to mock that
    await act(async () => {
      updateFormState({
        ...initialValues,
        config: {
          ...initialValues.config,
          spreadsheetId: TEST_SPREADSHEET_ID,
        },
      });
    });

    // SpreadsheetId is the same, ensure other fields have not changed
    // The tab names array will be loaded here, so this will be a react-select text value
    expect(screen.getByText("Tab2")).toBeVisible();
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();

    // Update the form state value to the other test spreadsheet id
    await act(async () => {
      updateFormState({
        ...initialValues,
        config: {
          ...initialValues.config,
          spreadsheetId: OTHER_TEST_SPREADSHEET_ID,
        },
      });
    });

    // Fields should be cleared and the other sheet values loaded
    // The tab names array will be loaded here, so this will be a react-select text value
    expect(screen.getByText("OtherTab1")).toBeVisible();
    // The rowValues object fields should be showing headers for OtherTab1
    expect(screen.getByDisplayValue("OtherColumn1")).toBeVisible();
    expect(screen.getByDisplayValue("OtherColumn2")).toBeVisible();
    // The old rowValues entry values should be cleared
    expect(screen.queryByDisplayValue("valueA")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("valueB")).not.toBeInTheDocument();
  });
});