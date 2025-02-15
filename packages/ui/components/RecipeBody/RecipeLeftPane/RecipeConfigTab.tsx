import { useContext, useEffect, useState } from "react";
import classNames from "classnames";

import { RecipeAuthType } from "types/enums";
import {
  RecipeContext,
  RecipeOutputTab,
  RecipeProjectContext,
  useRecipeSessionStore,
} from "../../../state/recipeSession";
import { DOC_LINKS } from "../../../utils/docLinks";
import { Database } from "types/database";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "../../Providers/SupabaseProvider";
import { deleteSecret, getSecret, saveSecret } from "../../../state/apiSession";

export function RecipeConfigTab() {
  const selectedRecipe = useContext(RecipeContext)!;
  const needsAuth = selectedRecipe.auth !== null;
  const supabase = useSupabaseClient();
  const router = useRouter();
  const user = useRecipeSessionStore((state) => state.user);
  const currentSession = useRecipeSessionStore((state) => state.currentSession);
  const project = useContext(RecipeProjectContext)!;

  const canDelete = selectedRecipe.author_id === user?.user_id;

  return (
    <div className="flex-1 relative px-4 py-6">
      <div className="alert flex flex-col items-start w-full bg-gray-400 dark:bg-base-200">
        <div className="w-full space-y-4 text-start">
          <h1 className="text-xl font-bold">Config</h1>
          {needsAuth && (
            <>
              <hr />
              <RecipeNeedsAuth />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecipeNeedsAuth({
  onboardingFlow = false,
}: {
  onboardingFlow?: boolean;
}) {
  const selectedRecipe = useContext(RecipeContext)!;

  const authConfig = {
    project: selectedRecipe.project,
    auth: selectedRecipe.auth!,
  };
  const [secret, setSecret] = useState("");
  const [oldSecret, setOldSecret] = useState("");

  useEffect(() => {
    getSecret({ secretId: selectedRecipe.id }).then((secret) => {
      setSecret(secret || "");
      setOldSecret(secret || "");
    });
  }, [selectedRecipe.id]);

  const [showAuthFlow, setShowAuthFlow] = useState(!onboardingFlow);

  const hasChanged = oldSecret !== secret;
  const docLink =
    selectedRecipe.options?.docs?.auth || DOC_LINKS[selectedRecipe.project];

  const setOutputTab = useRecipeSessionStore((state) => state.setOutputTab);

  let authNote = <></>;

  // if (selectedRecipe.auth === RecipeAuthType.Custom) {
  //   return <CustomAuthConfig onboardingFlow={onboardingFlow} />;
  // }

  const generalDocLink = docLink ? (
    <span>
      Read{" "}
      <a className="link tooltip" href={docLink} target="_blank">
        the guide
      </a>{" "}
      on getting auth for this project.
    </span>
  ) : null;

  authNote = (
    <p>
      This recipe authorizes with a {selectedRecipe.auth} param token that you
      can add below. {generalDocLink}
    </p>
  );

  return (
    <>
      <div className="text-start">
        <h3 className="font-bold mb-2">Setup</h3>
        <p>
          <span>
            This recipe authorizes with a {selectedRecipe.auth} param token that
            you can add below.
          </span>
          {docLink && (
            <span>
              {" Read "}
              <a className="link tooltip" href={docLink} target="_blank">
                the guide
              </a>{" "}
              on getting auth for this project.
            </span>
          )}
        </p>
        {showAuthFlow ? (
          <div className="sm:space-x-2 mt-2 flex gap-2 flex-col sm:block">
            <input
              type="text"
              placeholder="api_key_here"
              className="input input-sm input-bordered max-w-xs"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button
              className={classNames(
                "btn btn-sm",
                hasChanged && secret ? "btn-neutral" : "btn-disabled"
              )}
              onClick={() => {
                saveSecret({
                  secretId: selectedRecipe.id,
                  secretValue: secret,
                }).then(() => {
                  setOutputTab(RecipeOutputTab.Docs);
                  setOldSecret(secret);
                });
              }}
            >
              Submit
            </button>
            {!onboardingFlow && (
              <button
                className={classNames(
                  "btn btn-sm",
                  secret ? "btn-neutral" : "btn-disabled"
                )}
                onClick={() => {
                  deleteSecret({ secretId: selectedRecipe.id }).then(() => {
                    setOldSecret("");
                    setSecret("");
                  });
                }}
              >
                Clear
              </button>
            )}
            <span
              className="text-sm mt-1 text-gray-600 tooltip"
              data-tip="We store no tokens online. Tokens are only stored locally."
            >
              How are tokens stored?
            </span>
          </div>
        ) : (
          <div className="mt-2">
            <button
              className="btn btn-sm btn-neutral"
              onClick={() => {
                setShowAuthFlow(true);
              }}
            >
              Configure
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// function CustomAuthConfig({ onboardingFlow }: { onboardingFlow: boolean }) {
//   const selectedRecipe = useContext(RecipeContext)!;
//   const { simpleHeaders } = getHeaderTypes(selectedRecipe.options?.auth || []);

//   const docLink =
//     selectedRecipe.options?.docs?.auth || DOC_LINKS[selectedRecipe.project];

//   const [showAuthFlow, setShowAuthFlow] = useState(!onboardingFlow);

//   return (
//     <div className="text-start">
//       <h3 className="font-bold mb-2">Setup</h3>
//       <p>
//         This API has a custom authentication setup. Read{" "}
//         <a
//           href={docLink}
//           target="_blank"
//           className="underline underline-offset-2"
//         >
//           the guide
//         </a>{" "}
//         on getting setup with this project.
//       </p>
//       {showAuthFlow ? (
//         <div>
//           {simpleHeaders.map((h, i) => {
//             return (
//               <AuthInput header={h} onboardingFlow={onboardingFlow} key={i} />
//             );
//           })}
//           <span
//             className="text-sm mt-2 text-gray-600 tooltip"
//             data-tip="We store no tokens online. Tokens are only stored locally."
//           >
//             How are tokens stored?
//           </span>
//         </div>
//       ) : (
//         <div className="mt-2">
//           <button
//             className="btn btn-sm btn-neutral"
//             onClick={() => {
//               setShowAuthFlow(true);
//             }}
//           >
//             Configure
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// function AuthInput({
//   header,
//   onboardingFlow,
// }: {
//   header: string;
//   onboardingFlow: boolean;
// }) {
//   const selectedRecipe = useContext(RecipeContext)!;
//   const authConfig = {
//     project: selectedRecipe.project,
//     auth: header,
//   };
//   const [apiKey, setAPIKey] = useState<string>(sm.getSecret(authConfig) || "");

//   const existingSecret = sm.getSecret(authConfig);
//   const hasChanged = apiKey !== sm.getSecret(authConfig);
//   const setOutputTab = useRecipeSessionStore((state) => state.setOutputTab);

//   return (
//     <div className="mt-4">
//       <label className="text-sm">{header}</label>
//       <div className="sm:space-x-2 mt-2 flex gap-2 flex-col sm:block">
//         <input
//           type="text"
//           placeholder={`${header}`}
//           className="input input-sm input-bordered max-w-xs"
//           value={apiKey}
//           onChange={(e) => setAPIKey(e.target.value)}
//         />
//         <button
//           className={classNames(
//             "btn btn-sm",
//             hasChanged && apiKey ? "btn-neutral" : "btn-disabled"
//           )}
//           onClick={() => {
//             sm.updateSecret(authConfig, apiKey);
//             setOutputTab(RecipeOutputTab.Docs);
//           }}
//         >
//           Submit
//         </button>
//         {!onboardingFlow && (
//           <button
//             className={classNames(
//               "btn btn-sm",
//               apiKey ? "btn-neutral" : "btn-disabled"
//             )}
//             onClick={() => {
//               sm.deleteSecret(authConfig);
//               setAPIKey("");
//             }}
//           >
//             Clear
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }
