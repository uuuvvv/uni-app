import path from 'path'
import type { Plugin, ResolvedConfig } from 'vite'

import { OutputChunk } from 'rollup'

import { parseRpx2UnitOnce } from '@dcloudio/uni-cli-shared'

import {
  isSsr,
  initSsrDefine,
  rewriteSsrVue,
  rewriteSsrResolve,
  rewriteSsrNativeTag,
  rewriteSsrRenderStyle,
  generateSsrDefineCode,
  generateSsrEntryServerCode,
} from '../utils'

const ENTRY_SERVER_JS = 'entry-server.js'

export function uniSSRPlugin(): Plugin {
  let entryServerJs: string
  let resolvedConfig: ResolvedConfig
  const entryServerJsCode = generateSsrEntryServerCode()
  return {
    name: 'uni:h5-ssr',
    config(userConfig, env) {
      if (isSsr(env.command, userConfig)) {
        rewriteSsrVue()
        rewriteSsrResolve()
        rewriteSsrNativeTag()
        rewriteSsrRenderStyle(process.env.UNI_INPUT_DIR)
      }
    },
    configResolved(config: ResolvedConfig) {
      resolvedConfig = config
      entryServerJs = path.join(process.env.UNI_INPUT_DIR, ENTRY_SERVER_JS)
      if (isSsr(resolvedConfig.command, resolvedConfig)) {
        initSsrDefine(resolvedConfig)
      }
    },
    resolveId(id) {
      if (id.endsWith(ENTRY_SERVER_JS)) {
        return entryServerJs
      }
    },
    load(id) {
      if (id.endsWith(ENTRY_SERVER_JS)) {
        return entryServerJsCode
      }
    },
    generateBundle(_options, bundle) {
      const chunk = bundle['entry-server.js'] as OutputChunk
      if (chunk) {
        chunk.code =
          generateSsrDefineCode(
            resolvedConfig,
            parseRpx2UnitOnce(
              process.env.UNI_INPUT_DIR,
              process.env.UNI_PLATFORM
            )
          ) +
          '\n' +
          chunk.code
      }
    },
  }
}
