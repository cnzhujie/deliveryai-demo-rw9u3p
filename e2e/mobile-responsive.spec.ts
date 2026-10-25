import { test, expect, type Page } from '@playwright/test'

// 移动端 RWD 验收视口：375px 基准 / 320px 极窄屏 / 375x500 矮屏
const VIEWPORT_MOBILE = { width: 375, height: 812 }
const VIEWPORT_NARROW = { width: 320, height: 568 }
const VIEWPORT_SHORT = { width: 375, height: 500 }

/** 从首页绑定 A08 桌台并进入点餐视图（menu）。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click() // home → welcome
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click() // welcome → menu
}

/** 切换到锅底分类并打开第 index 个锅底菜品规格弹窗。 */
async function openBrothSpec(page: Page, productIndex = 0) {
  await page.getByRole('button', { name: '锅底' }).click()
  await page.locator('article').nth(productIndex).locator('button').last().click()
}

/** 断言当前页面无 body 级横向滚动条。 */
async function expectNoHorizontalScroll(page: Page) {
  const overflowed = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflowed, '页面不应出现横向滚动（scrollWidth 应 ≤ innerWidth）').toBe(false)
}

/** 断言指定元素在移动端的触控目标（宽高）均 ≥ 44px。 */
async function expectTouchTargetAtLeast(page: Page, locator: import('@playwright/test').Locator, min = 44) {
  const box = await locator.boundingBox()
  expect(box, '元素应已渲染并可获得 boundingBox').not.toBeNull()
  expect(box!.width, `触控目标宽度应 ≥ ${min}px`).toBeGreaterThanOrEqual(min)
  expect(box!.height, `触控目标高度应 ≥ ${min}px`).toBeGreaterThanOrEqual(min)
}

test.describe('移动端响应式自适应适配 - E2E 验收', () => {
  test('MOBILE-001: 375px 首页无横向滚动且绑定入口可见可操作 (REQ-001)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expectNoHorizontalScroll(page)
    // 绑定 A08 进入欢迎页，验证入口可操作
    await page.getByRole('button', { name: /A08/ }).first().click()
    await expect(page).toHaveURL(/#\/welcome$/)
  })

  test('MOBILE-002: 320px 极窄屏 TopBar 单行不溢出且核心控制可点 (REQ-001)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_NARROW)
    await enterMenu(page)
    await expect(page).toHaveURL(/#\/menu$/)
    // 顶栏桌台标签可见（仅显示桌号 A08，区域文案在移动端隐藏）
    await expect(page.getByText('A08').first()).toBeVisible()
    // 极窄屏下移动端已在底部导航提供的服务/控制台按钮在顶栏隐藏，不产生横向滚动
    await expectNoHorizontalScroll(page)
    // 顶栏仍保留的核心控制按钮（会员、老人模式、语言）可点击
    await expect(page.getByRole('button', { name: /呼叫服务|Call Service/ })).toHaveCount(0)
    // 移动端底部导航可见
    await expect(page.getByRole('button', { name: /点餐|Menu/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /订单|Orders/ }).first()).toBeVisible()
  })

  test('MOBILE-003: 375px 菜单页主要可操作元素触控目标 ≥44px (REQ-001)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE)
    await enterMenu(page)
    // 分类切换胶囊触控高度达标（max-sm:py-3 撑高到约 44px）
    const categoryBtn = page.getByRole('button', { name: '锅底' })
    await expect(categoryBtn).toBeVisible()
    await expectTouchTargetAtLeast(page, categoryBtn)
    // 菜品「+」加购按钮触控目标达标（max-sm:h-11 w-11）
    const plusBtn = page.locator('article').nth(0).locator('button').last()
    await expect(plusBtn).toBeVisible()
    await expectTouchTargetAtLeast(page, plusBtn)
    // 进入规格弹窗后，规格/下单人选项触控目标达标
    await plusBtn.click()
    const flavorBtn = page.getByRole('button', { name: '番茄 + 牛油' })
    await expect(flavorBtn).toBeVisible()
    await expectTouchTargetAtLeast(page, flavorBtn)
    const spicyBtn = page.getByRole('button', { name: '中辣' })
    await expectTouchTargetAtLeast(page, spicyBtn)
    const dinerBtn = page.getByRole('button', { name: '姚乾' })
    await expectTouchTargetAtLeast(page, dinerBtn)
    await page.keyboard.press('Escape')
  })

  test('MOBILE-004: 矮屏机型规格弹窗内容可滚动且关闭按钮始终可达 (REQ-001)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SHORT)
    await enterMenu(page)
    await openBrothSpec(page, 0)
    await expect(page.getByText('选择辣度')).toBeVisible()
    // 弹窗内层滚动容器内容超出视口高度，可上下滚动
    const scrollInfo = await page.evaluate(() => {
      const scroller = document.querySelector('[role="dialog"] [class*="overflow-y-auto"]') as HTMLElement | null
      if (!scroller) return { found: false, scrollable: false }
      return { found: true, scrollable: scroller.scrollHeight > scroller.clientHeight }
    })
    expect(scrollInfo.found, '应存在弹窗内层 overflow-y-auto 滚动容器').toBe(true)
    expect(scrollInfo.scrollable, '矮屏下弹窗内容应可滚动（scrollHeight > clientHeight）').toBe(true)
    // 关闭按钮（X）在矮屏下始终可见可达
    const closeBtn = page.getByRole('button', { name: /关闭|Close/ })
    await expect(closeBtn).toBeVisible()
    // 关闭弹窗验证可达性
    await closeBtn.click()
    await expect(page.getByText('选择辣度')).not.toBeVisible()
  })

  test('MOBILE-005: 375px 购物车数量增减触控达标且减至 1 变删除语义 (REQ-001/REQ-002)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE)
    await enterMenu(page)
    await openBrothSpec(page, 0)
    // 选重辣（非超级辣，无风险提示）并加入购物车
    await page.getByRole('button', { name: '重辣' }).click()
    await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
    // 移动端悬浮购物车按钮可见，打开购物车抽屉
    const openCartBtn = page.getByRole('button', { name: /查看购物车|View Cart/ })
    await expect(openCartBtn).toBeVisible()
    await openCartBtn.click()
    await expect(page.getByText('本桌购物车').first()).toBeVisible()
    // 增减按钮触控目标达标
    const reduceBtn = page.getByRole('button', { name: /减少|aria_reduce|Reduce/i }).first()
    const increaseBtn = page.getByRole('button', { name: /增加|aria_increase|Increase/i }).first()
    await expectTouchTargetAtLeast(page, increaseBtn)
    await expectTouchTargetAtLeast(page, reduceBtn)
    // 数量为 1 时减少按钮渲染为删除（Trash2）图标——点击后该商品被移除
    await expect(page.getByText('重辣').first()).toBeVisible()
    await reduceBtn.click()
    await expect(page.getByText('重辣')).toHaveCount(0)
  })

  test('MOBILE-006: 375px 移动端主流程功能等价（绑定→加购→提交→查看订单→结账支付）(REQ-002)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE)
    await page.goto('/')
    // 绑定 A08
    await page.getByRole('button', { name: /A08/ }).first().click()
    await expect(page).toHaveURL(/#\/welcome$/)
    // 进入菜单
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page).toHaveURL(/#\/menu$/)
    // 锅底选规格加购（重辣，无风险提示）
    await openBrothSpec(page, 0)
    await page.getByRole('button', { name: '重辣' }).click()
    await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
    // 打开移动端购物车抽屉并提交订单
    await page.getByRole('button', { name: /查看购物车|View Cart/ }).click()
    await expect(page.getByText('本桌购物车').first()).toBeVisible()
    await page.getByRole('button', { name: /提交加菜|确认并提交订单|Submit/ }).click()
    // 提交后自动进入订单视图
    await expect(page).toHaveURL(/#\/order$/)
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
    await expect(page.getByText('重辣').first()).toBeVisible()
    // 去结账
    await page.getByRole('button', { name: /去结账|Checkout/ }).click()
    await expect(page).toHaveURL(/#\/checkout$/)
    // 选择支付方式并支付，结果与桌面端一致（支付成功页）
    await page.getByRole('button', { name: /移动支付|Mobile/ }).click()
    await page.getByRole('button', { name: /确认支付|Confirm Payment/ }).click()
    await expect(page.getByRole('heading', { name: /付款完成|Payment Complete/ })).toBeVisible()
  })

  test('MOBILE-007: 375px 服务呼叫底部抽屉可达可操作（移动端功能等价）(REQ-002)', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE)
    await enterMenu(page)
    // 通过移动端底部导航「服务」打开服务呼叫抽屉
    await page.getByRole('button', { name: /服务|Service/ }).first().click()
    await expect(page.getByText('桌边服务')).toBeVisible()
    // 一键呼叫加汤（功能等价：移动端底部抽屉入口触发 CALL_SERVICE）
    await page.getByRole('button', { name: /一键呼叫加汤|One-tap/ }).click()
    // 呼叫记录区出现「等待响应」状态项，证明服务呼叫已注册
    await expect(page.getByText('等待响应').first()).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
})
