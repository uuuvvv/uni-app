import { watch, watchEffect, computed, ref, Ref } from 'vue'
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router'
import { invokeHook, updatePageCssVar } from '@dcloudio/uni-core'
import {
  API_ON_TAB_BAR_MID_BUTTON_TAP,
  OnTabBarMidButtonTap,
} from '@dcloudio/uni-api'
import { addLeadingSlash } from '@dcloudio/uni-shared'
import { defineSystemComponent } from '@dcloudio/uni-components'
import { getRealPath } from '../../../platform'
import { useTabBar } from '../../setup/state'
import { cssBackdropFilter } from '../../../service/api/base/canIUse'
import { normalizeWindowBottom } from '../../../helpers/cssVar'

export default /*#__PURE__*/ defineSystemComponent({
  name: 'TabBar',
  setup() {
    const visibleList = ref<UniApp.TabBarItemOptions[]>([])
    const tabBar = useTabBar()!
    useVisibleList(tabBar, visibleList)
    useTabBarCssVar(tabBar)
    const onSwitchTab = useSwitchTab(useRoute(), tabBar, visibleList)
    const { style, borderStyle, placeholderStyle } = useTabBarStyle(tabBar)
    return () => {
      const tabBarItemsTsx = createTabBarItemsTsx(
        tabBar,
        onSwitchTab,
        visibleList
      )
      return (
        <uni-tabbar class={'uni-tabbar-' + tabBar.position}>
          <div class="uni-tabbar" style={style.value}>
            <div class="uni-tabbar-border" style={borderStyle.value}></div>
            {tabBarItemsTsx}
          </div>
          <div class="uni-placeholder" style={placeholderStyle.value}></div>
        </uni-tabbar>
      )
    }
  },
})

function useTabBarCssVar(tabBar: UniApp.TabBarOptions) {
  watch(
    () => tabBar.shown,
    (value) => {
      updatePageCssVar({
        '--window-bottom': normalizeWindowBottom(
          value ? parseInt(tabBar.height!) : 0
        ),
      })
    }
  )
}

function useVisibleList(
  tabBar: UniApp.TabBarOptions,
  visibleList: Ref<UniApp.TabBarItemOptions[]>
) {
  function setVisibleList() {
    let tempList = []
    tempList = tabBar.list.filter((item) => item.visible !== false)

    if (__UNI_FEATURE_TABBAR_MIDBUTTON__) {
      tempList = tempList.filter((item) => !isMidButton(item))

      if (tempList.length % 2 === 0) {
        tempList.splice(
          Math.floor(tempList.length / 2),
          0,
          tabBar.list[Math.floor(tabBar.list.length / 2)]
        )
      }
    }

    visibleList.value = tempList
  }

  watchEffect(setVisibleList)
}

function useSwitchTab(
  route: RouteLocationNormalizedLoaded,
  tabBar: UniApp.TabBarOptions,
  visibleList: Ref<UniApp.TabBarItemOptions[]>
) {
  watchEffect(() => {
    const meta = route.meta
    if (meta.isTabBar) {
      const pagePath = meta.route
      const index = visibleList.value.findIndex(
        (item) => item.pagePath === pagePath
      )
      tabBar.selectedIndex = index
    }
  })
  return (tabBarItem: UniApp.TabBarItemOptions, index: number) => {
    const { type } = tabBarItem
    return () => {
      if (__UNI_FEATURE_TABBAR_MIDBUTTON__ && type === 'midButton') {
        return UniServiceJSBridge.invokeOnCallback<OnTabBarMidButtonTap>(
          API_ON_TAB_BAR_MID_BUTTON_TAP
        )
      }
      const { pagePath, text } = tabBarItem
      let url = addLeadingSlash(pagePath)
      if (url === __uniRoutes[0].alias) {
        url = '/'
      }
      if (route.path !== url) {
        uni.switchTab({ from: 'tabBar', url } as any)
      } else {
        invokeHook('onTabItemTap', {
          index,
          text,
          pagePath,
        })
      }
    }
  }
}

type OnSwtichTab = ReturnType<typeof useSwitchTab>

const DEFAULT_BG_COLOR = '#f7f7fa'

const BLUR_EFFECT_COLOR_DARK = 'rgb(0, 0, 0, 0.8)'
const BLUR_EFFECT_COLOR_LIGHT = 'rgb(250, 250, 250, 0.8)'
const BLUR_EFFECT_COLORS = {
  dark: BLUR_EFFECT_COLOR_DARK,
  light: BLUR_EFFECT_COLOR_LIGHT,
  extralight: BLUR_EFFECT_COLOR_LIGHT,
}

const BORDER_COLORS = {
  white: 'rgba(255, 255, 255, 0.33)',
  black: 'rgba(0, 0, 0, 0.33)',
}
function useTabBarStyle(tabBar: UniApp.TabBarOptions) {
  const style = computed(() => {
    let backgroundColor = tabBar.backgroundColor
    const blurEffect = tabBar.blurEffect
    if (!backgroundColor) {
      if (cssBackdropFilter && blurEffect && blurEffect !== 'none') {
        backgroundColor = BLUR_EFFECT_COLORS[blurEffect]
      }
    }
    return {
      backgroundColor: backgroundColor || DEFAULT_BG_COLOR,
      backdropFilter: blurEffect !== 'none' ? 'blur(10px)' : blurEffect,
    }
  })
  const borderStyle = computed(() => {
    const { borderStyle } = tabBar
    return {
      backgroundColor: BORDER_COLORS[borderStyle!] || borderStyle,
    }
  })
  const placeholderStyle = computed(() => {
    return {
      height: tabBar.height!,
    }
  })
  return {
    style,
    borderStyle,
    placeholderStyle,
  }
}

function isMidButton(item: unknown): item is UniApp.TabBarMidButtonOptions {
  return (item as any).type === 'midButton'
}

function createTabBarItemsTsx(
  tabBar: UniApp.TabBarOptions,
  onSwitchTab: OnSwtichTab,
  visibleList: Ref<UniApp.TabBarItemOptions[]>
) {
  const { selectedIndex, selectedColor, color } = tabBar
  return visibleList.value.map((item, index) => {
    const selected = selectedIndex === index
    const textColor = selected ? selectedColor : color
    const iconPath =
      (selected ? item.selectedIconPath || item.iconPath : item.iconPath) || ''
    if (!__UNI_FEATURE_TABBAR_MIDBUTTON__) {
      return createTabBarItemTsx(
        textColor,
        iconPath,
        item,
        tabBar,
        index,
        onSwitchTab
      )
    }
    return isMidButton(item)
      ? createTabBarMidButtonTsx(
          textColor,
          iconPath,
          item,
          tabBar,
          index,
          onSwitchTab
        )
      : createTabBarItemTsx(
          textColor,
          iconPath,
          item,
          tabBar,
          index,
          onSwitchTab
        )
  })
}

function createTabBarItemTsx(
  color: string,
  iconPath: string,
  tabBarItem: UniApp.TabBarItemOptions,
  tabBar: UniApp.TabBarOptions,
  index: number,
  onSwitchTab: OnSwtichTab
) {
  return (
    <div
      key={index}
      class="uni-tabbar__item"
      onClick={onSwitchTab(tabBarItem, index)}
    >
      {createTabBarItemBdTsx(color, iconPath || '', tabBarItem, tabBar)}
    </div>
  )
}

function createTabBarItemBdTsx(
  color: string,
  iconPath: string,
  tabBarItem: UniApp.TabBarItemOptions,
  tabBar: UniApp.TabBarOptions
) {
  const { height } = tabBar
  return (
    <div class="uni-tabbar__bd" style={{ height: height }}>
      {iconPath && createTabBarItemIconTsx(iconPath, tabBarItem, tabBar)}
      {tabBarItem.text && createTabBarItemTextTsx(color, tabBarItem, tabBar)}
    </div>
  )
}

function createTabBarItemIconTsx(
  iconPath: string,
  tabBarItem: UniApp.TabBarItemOptions,
  tabBar: UniApp.TabBarOptions
) {
  const { type, text, redDot } = tabBarItem
  const { iconWidth } = tabBar
  const clazz = 'uni-tabbar__icon' + (text ? ' uni-tabbar__icon__diff' : '')
  const style = { width: iconWidth, height: iconWidth }
  return (
    <div class={clazz} style={style}>
      {type !== 'midButton' && <img src={getRealPath(iconPath)} />}
      {redDot && createTabBarItemRedDotTsx(tabBarItem.badge)}
    </div>
  )
}

function createTabBarItemTextTsx(
  color: string,
  tabBarItem: UniApp.TabBarItemOptions,
  tabBar: UniApp.TabBarOptions
) {
  const { redDot, iconPath, text } = tabBarItem
  const { fontSize, spacing } = tabBar
  const style = {
    color,
    fontSize: fontSize,
    lineHeight: !iconPath ? 1.8 : 'normal',
    marginTop: !iconPath ? 'inherit' : spacing,
  }
  return (
    <div class="uni-tabbar__label" style={style}>
      {text}
      {redDot && !iconPath && createTabBarItemRedDotTsx(tabBarItem.badge)}
    </div>
  )
}

function createTabBarItemRedDotTsx(badge?: string) {
  const clazz = 'uni-tabbar__reddot' + (badge ? ' uni-tabbar__badge' : '')
  return <div class={clazz}>{badge}</div>
}

function createTabBarMidButtonTsx(
  color: string,
  iconPath: string,
  midButton: UniApp.TabBarMidButtonOptions,
  tabBar: UniApp.TabBarOptions,
  index: number,
  onSwitchTab: OnSwtichTab
) {
  const { width, height, backgroundImage, iconWidth } = midButton
  return (
    <div
      key="midButton"
      class="uni-tabbar__item"
      style={{ flex: '0 0 ' + width, position: 'relative' }}
      onClick={onSwitchTab(midButton, index)}
    >
      <div
        class="uni-tabbar__mid"
        style={{
          width: width,
          height: height,
          backgroundImage: backgroundImage
            ? "url('" + getRealPath(backgroundImage) + "')"
            : 'none',
        }}
      >
        {iconPath && (
          <img
            style={{ width: iconWidth, height: iconWidth }}
            src={getRealPath(iconPath)}
          />
        )}
      </div>
      {createTabBarItemBdTsx(color, iconPath, midButton, tabBar)}
    </div>
  )
}
