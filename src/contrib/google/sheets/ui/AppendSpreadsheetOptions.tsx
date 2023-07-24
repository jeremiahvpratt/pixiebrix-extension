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
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { sheets } from "@/background/messenger/api";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/bricks/append";
import { isNullOrBlank, joinName } from "@/utils";
import { getErrorMessage } from "@/errors/errorHelpers";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { dereference } from "@/validators/generic";
import Loader from "@/components/Loader";
import { FormErrorContext } from "@/components/form/FormErrorContext";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { isEmpty, isEqual } from "lodash";
import { useOnChangeEffect } from "@/contrib/google/sheets/core/useOnChangeEffect";
import { requireGoogleHOC } from "@/contrib/google/sheets/ui/RequireGoogleApi";
import { type Schema } from "@/types/schemaTypes";
import { isExpression, isTemplateExpression } from "@/utils/expressionUtils";
import { type SpreadsheetTarget } from "@/contrib/google/sheets/core/sheetsApi";

const DEFAULT_FIELDS_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

const PropertiesField: React.FunctionComponent<{
  name: string;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, spreadsheetId, tabName }) => {
  const [sheetSchema, , schemaError] = useAsyncState<Schema>(
    async () => {
      if (spreadsheetId && tabName) {
        if (isExpression(tabName)) {
          return {
            type: "object",
            additionalProperties: true,
          };
        }

        const target: SpreadsheetTarget = {
          googleAccount: null,
          spreadsheetId,
          tabName,
        };
        const headers = await sheets.getHeaders(target);

        return {
          type: "object",
          properties: Object.fromEntries(
            headers
              .filter((x) => !isNullOrBlank(x))
              .map((header) => [header, { type: "string" }])
          ),
        };
      }

      return DEFAULT_FIELDS_SCHEMA;
    },
    [spreadsheetId, tabName],
    DEFAULT_FIELDS_SCHEMA
  );

  return (
    <SchemaField
      name={name}
      label="Row Values"
      isRequired
      description={
        schemaError ? (
          <span className="text-warning">
            Error determining columns: {getErrorMessage(schemaError)}
          </span>
        ) : null
      }
      schema={sheetSchema ?? DEFAULT_FIELDS_SCHEMA}
    />
  );
};

const AppendSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const spreadsheetId = useSpreadsheetId(basePath);

  const [{ value: tabNameValue }] = useField<string | Expression>(
    joinName(basePath, "tabName")
  );

  const [{ value: rowValuesValue }, , { setValue: setRowValuesValue }] =
    useField(joinName(basePath, "rowValues"));

  // Clear row values when tabName changes, if the value is not an expression, or is empty
  useOnChangeEffect(
    tabNameValue,
    () => {
      if (
        !isTemplateExpression(rowValuesValue) ||
        isEmpty(rowValuesValue.__value__)
      ) {
        setRowValuesValue({});
      }
    },
    isEqual
  );

  const [sheetSchema, isLoadingSheetSchema] = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    [],
    BASE_SHEET_SCHEMA
  );

  return (
    <div className="my-2">
      {isLoadingSheetSchema ? (
        <Loader />
      ) : (
        <FormErrorContext.Provider
          value={{
            shouldUseAnalysis: false,
            showUntouchedErrors: true,
            showFieldActions: false,
          }}
        >
          <SchemaField
            name={joinName(basePath, "spreadsheetId")}
            schema={sheetSchema}
            isRequired
          />
          {
            // The problem with including this inside the nested FormErrorContext.Provider is that we
            // would like analysis to run if this is in text/template mode, but not if it's in select mode.
            // Select mode is more important, so we're leaving it like this for now.
            <TabField
              name={joinName(basePath, "tabName")}
              schema={APPEND_SCHEMA.properties.tabName as Schema}
              spreadsheetId={spreadsheetId}
            />
          }
        </FormErrorContext.Provider>
      )}
      <PropertiesField
        name={joinName(basePath, "rowValues")}
        spreadsheetId={spreadsheetId}
        tabName={tabNameValue}
      />
    </div>
  );
};

export default requireGoogleHOC(AppendSpreadsheetOptions);