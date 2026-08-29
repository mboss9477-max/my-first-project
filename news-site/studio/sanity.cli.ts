import {defineCliConfig} from 'sanity/cli'

import {dataset, projectId} from './env'

export default defineCliConfig({
  api: {projectId, dataset},
  // Pins the hosted Studio deployment to https://cs-news.sanity.studio, so
  // future `sanity deploy` runs update that same URL instead of prompting.
  deployment: {
    appId: 'io2ttu59fw9x4dk5dy3u9ord',
  },
})
