import { test, expect, type Page } from '@playwright/test'

/** 从首页绑定 A08 桌台并进入点餐视图（menu）。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click() // home → welcome
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click() // welcome → menu
}

/** 定位推荐菜区域（含 h2 标题的 section div）。 */
function recommendedSection(page: Page) {
  return page.getByRole('heading', { name: '推荐菜' }).locator('xpath=../..')
}

/** 推荐菜区域内的所有推荐菜卡片（button 元素）。 */
function recommendedCards(page: Page) {
  return recommendedSection(page).getByRole('button')
}

test.describe('推荐菜展示与交互 - E2E 验收测试', () => {
  test('REQ-002.1: 推荐菜区域可见，位于分类导航下方、菜品列表上方', async ({ page }) => {
    await enterMenu(page)
    // 推荐菜标题可见
    await expect(page.getByRole('heading', { name: '推荐菜' })).toBeVisible()
    // 推荐菜副标题可见（sm+ 以上显示）
    await expect(page.getByText('精选好味，不容错过')).toBeVisible()
    // 验证推荐菜区域位于分类导航（搜索栏 + 分类胶囊）下方、菜品列表（首个 article）上方
    const categoryBtn = page.getByRole('button', { name: '锅底' })
    const recommendBox = await page.getByRole('heading', { name: '推荐菜' }).boundingBox()
    const firstArticleBox = await page.locator('article').first().boundingBox()
    const categoryBox = await categoryBtn.boundingBox()
    expect(recommendBox, '推荐菜标题应已渲染').not.toBeNull()
    expect(firstArticleBox, '菜品列表首个 article 应已渲染').not.toBeNull()
    expect(categoryBox, '分类按钮应已渲染').not.toBeNull()
    // 推荐菜在分类导航下方
    expect(recommendBox!.y).toBeGreaterThan(categoryBox!.y)
    // 推荐菜在菜品列表上方
    expect(recommendBox!.y).toBeLessThan(firstArticleBox!.y)
  })

  test('REQ-002.2: 每张推荐菜卡片含图片、名称、价格、描述', async ({ page }) => {
    await enterMenu(page)
    const cards = recommendedCards(page)
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    // 验证第一张卡片包含图片、名称(h3)、描述(p)、价格(p)
    const firstCard = cards.first()
    await expect(firstCard.locator('img')).toBeVisible()
    await expect(firstCard.locator('h3')).toBeVisible()
    // 价格段落含 ¥ 符号
    await expect(firstCard.locator('p').filter({ hasText: /¥/ })).toBeVisible()
    // 描述段落有文本内容
    const descText = await firstCard.locator('p').first().textContent()
    expect(descText, '推荐菜卡片应包含描述文本').toBeTruthy()
    expect(descText!.length).toBeGreaterThan(0)
  })

  test('REQ-002.3: 推荐菜展示数量为 6-8 道', async ({ page }) => {
    await enterMenu(page)
    const count = await recommendedCards(page).count()
    expect(count, '推荐菜数量应在 6-8 道之间').toBeGreaterThanOrEqual(6)
    expect(count, '推荐菜数量应在 6-8 道之间').toBeLessThanOrEqual(8)
  })

  test('REQ-003.1: 点击推荐菜卡片打开规格选择弹窗', async ({ page }) => {
    await enterMenu(page)
    const firstCard = recommendedCards(page).first()
    const productName = await firstCard.locator('h3').textContent()
    await firstCard.click()
    // 规格弹窗标题为菜品名称
    await expect(page.getByRole('heading', { name: productName! })).toBeVisible()
  })

  test('REQ-003.2: 弹窗内展示菜品图片、描述、价格及可用选项', async ({ page }) => {
    await enterMenu(page)
    const firstCard = recommendedCards(page).first()
    await firstCard.click()
    // 弹窗内含菜品图片
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('img')).toBeVisible()
    // 弹窗内含价格（¥ 符号）
    await expect(dialog.locator('p').filter({ hasText: /¥/ })).toBeVisible()
    // 弹窗内含「加入本桌购物车」按钮
    await expect(page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ })).toBeVisible()
  })

  test('REQ-003.3: 选择规格确认后菜品加入购物车', async ({ page }) => {
    await enterMenu(page)
    // 点击第一张推荐菜卡片（鎏金番茄鸳鸯锅，含辣度选项）
    await recommendedCards(page).first().click()
    // 选重辣（非超级辣，无风险提示）
    await page.getByRole('button', { name: '重辣' }).click()
    await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
    // 弹窗关闭，菜品已加入购物车 — 验证购物车区域出现菜品
    await expect(page.getByText('本桌购物车').first()).toBeVisible()
    await expect(page.getByText('鎏金番茄鸳鸯锅').first()).toBeVisible()
    await expect(page.getByText('重辣').first()).toBeVisible()
  })

  test('REQ-003.4: 推荐菜加购行为与菜品列表加购一致', async ({ page }) => {
    await enterMenu(page)
    // 通过推荐菜卡片加购
    await recommendedCards(page).first().click()
    await page.getByRole('button', { name: '重辣' }).click()
    await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
    // 通过菜品列表加购同一菜品
    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()
    await page.getByRole('button', { name: '中辣' }).click()
    await page.getByRole('button', { name: /加入本桌购物车|Add to Table Cart/ }).click()
    // 两次加购后购物车应有两条记录
    await expect(page.getByText('鎏金番茄鸳鸯锅').first()).toBeVisible()
    // 第二条记录也可见（两个同名菜品项）
    const items = page.getByText('鎏金番茄鸳鸯锅')
    await expect(items.nth(1)).toBeVisible()
  })

  test('REQ-004.1: 375px 移动端推荐菜区域正常显示且无横向滚动', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await enterMenu(page)
    await expect(page.getByRole('heading', { name: '推荐菜' })).toBeVisible()
    // 推荐菜卡片可见
    const firstCard = recommendedCards(page).first()
    await expect(firstCard).toBeVisible()
    // 无横向滚动
    const overflowed = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflowed, '移动端不应出现横向滚动').toBe(false)
  })

  test('REQ-004.2: 1280px 桌面端推荐菜区域正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await enterMenu(page)
    await expect(page.getByRole('heading', { name: '推荐菜' })).toBeVisible()
    const count = await recommendedCards(page).count()
    expect(count).toBeGreaterThanOrEqual(6)
    // 桌面端副标题可见（sm:inline 以上显示）
    await expect(page.getByText('精选好味，不容错过')).toBeVisible()
  })

  test('REQ-005.1: 中文环境下推荐菜区域文案正确显示', async ({ page }) => {
    await enterMenu(page)
    await expect(page.getByRole('heading', { name: '推荐菜' })).toBeVisible()
    // 推荐菜卡片含中文菜品名称
    await expect(recommendedCards(page).first().getByText('鎏金番茄鸳鸯锅')).toBeVisible()
    // 价格含「起」字（中文 from 文案）
    await expect(recommendedCards(page).first().getByText('起')).toBeVisible()
  })

  test('REQ-005.2: 英文环境下推荐菜区域文案正确显示', async ({ page }) => {
    await enterMenu(page)
    // 切换到英文（按钮显示 EN 时点击切换到英文）
    await page.getByRole('button', { name: /切换语言|Switch language/ }).click()
    // 推荐菜标题为英文
    await expect(page.getByRole('heading', { name: 'Recommended Dishes' })).toBeVisible()
    // 推荐菜卡片含英文菜品名称
    await expect(recommendedCards(page).first().getByText('Golden Tomato Dual-Flavor Pot')).toBeVisible()
    // 价格含「from」文案
    await expect(recommendedCards(page).first().getByText('from')).toBeVisible()
  })
})
