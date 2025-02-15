import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "types/database";
import { redirect } from "next/navigation";
import { fetchHomeRecipe } from "ui/fetchers/home";
import { RecipeAPI } from "ui/components/RecipeAPI";
import { fetchProject } from "ui/fetchers/project";
import { RecipeNativeFetchContext } from "ui/state/recipeSession";
import { ServerFetchProvider } from "ui/components/Providers/ServerFetchProvider";

export const dynamic = "force-dynamic";

export default async function APIPage({
  params,
}: {
  params: {
    api_id: string;
  };
}) {
  const api_id = decodeURIComponent(params.api_id);

  const supabase = createServerComponentClient<Database>({
    cookies,
  });

  const recipe = await fetchHomeRecipe({
    recipeId: api_id,
    supabase,
  });

  const project = recipe
    ? await fetchProject({
        project: recipe.project,
        supabase,
      })
    : null;

  return <RecipeAPI project={project} recipe={recipe} />;
}
