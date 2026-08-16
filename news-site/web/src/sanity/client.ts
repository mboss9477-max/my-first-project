import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // The `production` dataset is public-read, so no token is required.
  useCdn: true,
});
