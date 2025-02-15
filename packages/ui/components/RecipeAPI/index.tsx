"use client";

import {
  RecipeContext,
  RecipeProjectContext,
  useRecipeSessionStore,
} from "../../state/recipeSession";
import classNames from "classnames";

import { Recipe, RecipeProject } from "types/database";
import { useEffect } from "react";
import { PLAYGROUND_SESSION_ID } from "../../utils/constants/main";
import { RecipeBodySearch } from "../RecipeBody/RecipeBodySearch";
import { RecipeBody } from "../RecipeBody";
import { Loading } from "../Loading";
import { OutputAPI } from "../../state/apiSession";

export function RecipeAPI({
  recipe,
  project,
}: {
  project?: RecipeProject | null;
  recipe?: Recipe | null;
}) {
  const setCurrentSession = useRecipeSessionStore(
    (state) => state.setCurrentSession
  );
  const currentSession = useRecipeSessionStore((state) => state.currentSession);

  useEffect(() => {
    if (recipe) {
      setCurrentSession(
        {
          id: PLAYGROUND_SESSION_ID,
          name: recipe.title,
          apiMethod: recipe.method,
          recipeId: recipe.id,
        },
        false
      );
    }
    OutputAPI.clearOutput(PLAYGROUND_SESSION_ID);
  }, []);

  if (!project || !recipe) {
    return (
      <div className="flex items-center space-x-4 px-4 pt-4">
        <span className="text-xl font-bold">
          Unable to fetch recipe details. Recipe no long exists or you do not
          have enough access.
        </span>
        <span className="loading loading-bars loading-lg"></span>
      </div>
    );
  }

  if (!currentSession) {
    return <Loading />;
  }

  return (
    <div className={classNames("flex-1 flex flex-col z-0")}>
      <RecipeContext.Provider value={recipe}>
        <RecipeProjectContext.Provider value={project}>
          <RecipeBodySearch />
          <RecipeBody />
        </RecipeProjectContext.Provider>
      </RecipeContext.Provider>
    </div>
  );
}
