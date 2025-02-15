"use client";
import MonacoEditor, {
  BeforeMount,
  Monaco,
  OnMount,
} from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { useDarkMode, useDebounce } from "usehooks-ts";
import {
  DARKTHEME_SETTINGS,
  DEFAULT_MONACO_OPTIONS,
  EditorParamView,
  LIGHTTHEME_SETTINGS,
} from "./common";
import { JSONSchema6, JSONSchema6Definition } from "json-schema";
import classNames from "classnames";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRecipeSessionStore } from "../../../../ui/state/recipeSession";
import { produce } from "immer";
import { RecipeMutationContentType } from "types/enums";
import { API_SAMPLES, API_TYPE_NAMES } from "../../../utils/constants/recipe";

export function EditorViewWithSchema({
  value,
  setValue,
  jsonSchema,
  typeName,
}: {
  value: string;
  setValue: (value: string) => void;
  jsonSchema: JSONSchema6 | null;
  typeName: (typeof API_TYPE_NAMES)[keyof typeof API_TYPE_NAMES];
}) {
  const { isDarkMode } = useDarkMode();
  const monacoRef = useRef<Monaco>();

  function renderModelMarkers() {
    if (!monacoRef.current) return;

    monacoRef.current.editor.getModels().forEach((model) => {
      if (model.getLanguageId() === "json") {
        const matches = model?.findMatches(
          '"<<.*?>>"',
          true,
          true,
          false,
          null,
          true
        );

        monacoRef.current!.editor.setModelMarkers(
          model,
          "me",
          matches.map((match) => ({
            startLineNumber: match.range.startLineNumber,
            startColumn: match.range.startColumn,
            endColumn: match.range.endColumn,
            endLineNumber: match.range.endLineNumber,
            message: "ENV: This is an environment variable",
            severity: monacoRef.current!.MarkerSeverity.Info,
          }))
        );
      }
    });
  }

  useEffect(() => {
    if (!monacoRef.current) return;

    setJSONDiagnosticOptions(monacoRef.current, typeName, jsonSchema);
  }, [jsonSchema]);

  // const debouncedMatching = useDebounce(value, 500);

  // useEffect(() => {
  //   renderModelMarkers();
  // }, [debouncedMatching]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;

    setJSONDiagnosticOptions(monaco, typeName, jsonSchema);
    renderModelMarkers();

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  };

  return (
    <MonacoEditor
      className="pt-2"
      language="json"
      keepCurrentModel={false}
      theme={isDarkMode ? DARKTHEME_SETTINGS.name : LIGHTTHEME_SETTINGS.name}
      value={value}
      onChange={(newCode) => {
        setValue(newCode || "");
      }}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorMount}
      options={DEFAULT_MONACO_OPTIONS}
    />
  );
}

export function AutoSaveError({
  hasChanged,
  hasError,
  refreshing,
}: {
  hasChanged: boolean;
  hasError: boolean;
  refreshing: boolean;
}) {
  if (!hasChanged && !hasError) return null;

  return (
    <div
      className={classNames(
        "absolute top-3 right-8",
        "animate-pulse btn btn-sm opacity-0 transition-opacity duration-1000 delay-1000",
        hasError ? "btn-error" : "btn-accent"
      )}
    >
      {hasChanged &&
        (refreshing ? (
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
        ) : (
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
        ))}
      {hasError && "Bad types"}
    </div>
  );
}

export const handleEditorWillMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(
    DARKTHEME_SETTINGS.name,
    DARKTHEME_SETTINGS.config as any
  );
  monaco.editor.defineTheme(
    LIGHTTHEME_SETTINGS.name,
    LIGHTTHEME_SETTINGS.config as any
  );
};

const setJSONDiagnosticOptions = (
  monaco: Monaco,
  typeName: string,
  jsonSchema?: JSONSchema6 | null
) => {
  const wrapSchemaInVariables = (schema: JSONSchema6, variables?: string[]) => {
    if (!variables || variables.length === 0) return schema;

    return produce(schema, (draft) => {
      draft.definitions = {
        ...draft.definitions,
        RecipeEnv: {
          type: "string",
          enum: variables.map((variable) => `<<${variable}>>`),
        },
      };

      const recurSchema = (innerSchema?: JSONSchema6Definition) => {
        if (!innerSchema || typeof innerSchema === "boolean") return;

        if (innerSchema.properties) {
          const properties = Object.keys(innerSchema.properties);
          for (const property of properties) {
            recurSchema(innerSchema.properties[property]);
          }
        }

        if (innerSchema.items) {
          if (Array.isArray(innerSchema.items)) {
            for (const item of innerSchema.items) {
              recurSchema(item);
            }
          } else {
            recurSchema(innerSchema.items);
          }
        }

        if (innerSchema.anyOf) {
          innerSchema.anyOf.push({
            $ref: "#/definitions/RecipeEnv",
          });
        } else {
          const { type, ...properties } = innerSchema;

          innerSchema.anyOf = [
            {
              ...properties,
              type,
            },
            {
              $ref: "#/definitions/RecipeEnv",
            },
          ];

          for (const property of Object.keys(properties)) {
            delete innerSchema[property as keyof typeof innerSchema];
          }

          delete innerSchema.type;
        }
      };

      const properties = Object.keys(draft.properties || {});
      for (const property of properties) {
        recurSchema(draft.properties![property]);
      }
    });
  };

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: "error",
    allowComments: true,
    schemas: jsonSchema
      ? [
          {
            uri: monaco.Uri.parse(typeName).toString(),
            fileMatch: ["*"],
            schema: wrapSchemaInVariables(jsonSchema),
          },
        ]
      : [],
  });
};

export function InitializeSchema({ type }: { type: EditorParamView }) {
  const editQueryType = useRecipeSessionStore(
    (state) => state.setEditorQuerySchemaType
  );
  const editBodyType = useRecipeSessionStore(
    (state) => state.setEditorBodySchemaType
  );

  const setEditorBodySchemaJSON = useRecipeSessionStore(
    (state) => state.setEditorBodySchemaJSON
  );
  const setEditorBodyType = useRecipeSessionStore(
    (state) => state.setEditorBodyType
  );
  const setEditorBody = useRecipeSessionStore((state) => state.setEditorBody);

  const setEditorQuery = useRecipeSessionStore((state) => state.setEditorQuery);

  const setEditorQuerySchemaJSON = useRecipeSessionStore(
    (state) => state.setEditorQuerySchemaJSON
  );
  const setEditorURLSchemaJSON = useRecipeSessionStore(
    (state) => state.setEditorURLSchemaJSON
  );

  const setEditorURLSchemaType = useRecipeSessionStore(
    (state) => state.setEditorURLSchemaType
  );

  const setEditorUrlCode = useRecipeSessionStore(
    (state) => state.setEditorURLCode
  );

  const onSubmit = () => {
    if (type === "query") {
      editQueryType(API_SAMPLES.API_SAMPLE_QUERY_PARAMS_TYPE.TYPE);
      setEditorQuerySchemaJSON(API_SAMPLES.API_SAMPLE_QUERY_PARAMS_TYPE.SCHEMA);
      setEditorQuery(API_SAMPLES.API_SAMPLE_QUERY_PARAMS_TYPE.JSON);
    } else if (type === "body") {
      editBodyType(API_SAMPLES.API_SAMPLE_REQUEST_BODY_TYPE.TYPE);
      setEditorBodyType(RecipeMutationContentType.JSON);
      setEditorBodySchemaJSON(API_SAMPLES.API_SAMPLE_REQUEST_BODY_TYPE.SCHEMA);
      setEditorBody(API_SAMPLES.API_SAMPLE_REQUEST_BODY_TYPE.JSON);
    } else if (type === "url") {
      setEditorURLSchemaType(API_SAMPLES.API_SAMPLE_URL_PARAMS_TYPE.TYPE);
      setEditorURLSchemaJSON({});
      setEditorUrlCode(API_SAMPLES.API_SAMPLE_URL_PARAMS_TYPE.JSON);
    }
  };
  Object;
  return (
    <div className="h-full flex justify-center items-center border-t border-recipe-slate">
      <button
        className="btn btn-outline opacity-30 hover:opacity-100"
        onClick={onSubmit}
      >
        Initialize {type} schema
      </button>
    </div>
  );
}
