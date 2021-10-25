import { Plugin } from 'vite'
import { addComponentBindLink, resolveBuiltIn } from '@dcloudio/uni-cli-shared'
import initMiniProgramPlugin, {
  UniMiniProgramPluginOptions,
} from '@dcloudio/uni-mp-vite'

import source from './project.config.json'

const uniMiniProgramWeixinPlugin: Plugin = {
  name: 'vite:uni-mp-weixin',
  config() {
    return {
      define: {
        __VUE_CREATED_DEFERRED__: false,
      },
    }
  },
}

const projectConfigFilename = 'project.config.json'

const options: UniMiniProgramPluginOptions = {
  vite: {
    inject: {
      uni: [
        resolveBuiltIn('@dcloudio/uni-mp-weixin/dist/uni.api.esm.js'),
        'default',
      ],
    },
    alias: {
      'uni-mp-runtime': resolveBuiltIn(
        '@dcloudio/uni-mp-weixin/dist/uni.mp.esm.js'
      ),
    },
    copyOptions: {
      assets: ['wxcomponents'],
      targets: [
        {
          src: [
            'theme.json',
            'sitemap.json',
            'ext.json',
            'custom-tab-bar',
            'functional-pages',
            projectConfigFilename,
          ],
          get dest() {
            return process.env.UNI_OUTPUT_DIR
          },
        },
      ],
    },
  },
  global: 'wx',
  app: {
    darkmode: true,
    subpackages: true,
  },
  project: {
    filename: projectConfigFilename,
    source,
  },
  template: {
    filter: {
      extname: '.wxs',
      lang: 'wxs',
      generate(filter, filename) {
        if (filename) {
          return `<wxs src="${filename}.wxs" module="${filter.name}"/>`
        }
        return `<wxs module="${filter.name}">
${filter.code}
</wxs>`
      },
    },
    slot: {
      fallback: false,
    },
    extname: '.wxml',
    directive: 'wx:',
    compilerOptions: {
      nodeTransforms: [addComponentBindLink],
    },
  },
  style: {
    extname: '.wxss',
  },
}

export default [uniMiniProgramWeixinPlugin, ...initMiniProgramPlugin(options)]
