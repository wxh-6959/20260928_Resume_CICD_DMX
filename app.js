/* ═══════════════════════════════════════════════════════════════
   吴霞焕 · 个人主页脚本
   ═══════════════════════════════════════════════════════════════
   这个文件干三件事：
     一、装饰效果：背景蛛网、沿着蛛丝爬的蜘蛛、视差
     二、第 4 课的五个 TODO（返回顶部 / 进度条 / 导航高亮 / 栏目名）
     三、卡片的 3D 跟随鼠标

   一条重要原则：**JS 挂了，页面照样能读。**
   所以"内容默认隐藏"这件事是挂在 .js 类下面的 —— 只有这个脚本跑起来，
   才给 <html> 加上 js 类，那套隐藏规则才生效。脚本没跑，内容按默认状态
   （可见）渲染。这叫渐进增强。
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js')


/* ═══════════════ 先把要用到的元素抓到手 ═══════════════
   querySelector     按选择器找**第一个**，找不到返回 null
   querySelectorAll  按选择器找**全部**，返回一个可以 forEach 的集合
   选择器写法和 CSS 完全一样：#id 找 id，.class 找类 */
const root        = document.documentElement
const progressBar = document.querySelector('#reading-progress')
const toTop       = document.querySelector('#to-top')
const indicator   = document.querySelector('#section-indicator')
const silkFill    = document.querySelector('#silkFill')
const silkSpider  = document.querySelector('#silkSpider')
const webBg       = document.querySelector('.web-bg')
const navLinks    = document.querySelectorAll('nav a')


/* ═══════════════ 一、导航高亮 + 右下角栏目名 ═══════════════
   第 4 课 TODO 04 / 05 就是这一块。 */
// 导航链接上的文字就是栏目的中文名，直接拿来用，不另外维护一份对照表。
// 好处：以后在 HTML 里加一个栏目，这个文件一行都不用改。
const sectionNames = new Map()
navLinks.forEach(link => {
  sectionNames.set(link.getAttribute('href'), link.textContent.trim())
})

function showCurrent(hash){
  // 没有 # 时默认第一个栏目，否则刚打开页面什么都不高亮
  const current = hash || '#about'

  // 右下角徽标显示栏目名。Map.get 取不到时是 undefined，用 || '' 兜底，
  // 别让页面上出现 "undefined" 这个词。
  if (indicator) indicator.textContent = sectionNames.get(current) || ''

  navLinks.forEach(link => {
    // 这个链接的 href 和当前栏目一样吗？一样就是"当前项"
    const isCurrent = link.getAttribute('href') === current
    link.classList.toggle('is-current', isCurrent)

    // 告诉读屏软件"当前在这一项"。视觉上看不见，但在 F12 里能看到它跟着走。
    if (isCurrent) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  })
}

// 点 <a href="#story"> 会改地址栏的 hash，hash 一变浏览器就触发 hashchange；
// **按前进/后退键也会触发**。
addEventListener('hashchange', () => showCurrent(location.hash))
// 最容易漏的一行：别人把 index.html#story 直接发给你，你打开时 hash
// 从头到尾**没有"变化"过**，hashchange 根本不会触发，于是什么都不高亮。
// "监听变化"和"一开始先做一次"是两件事，两件都要做。
showCurrent(location.hash)


/* ═══════════════ 二、生成背景蛛网 ═══════════════
   网心放在右上角，向外放射 13 条线 + 10 圈同心网。
   每圈半径用 Math.pow(r/rings, 1.6) 分布，靠近中心更密；
   顶点加一点点抖动，不然规整得像个雷达图。 */
;(function buildWeb(){
  const svg = document.getElementById('webBg')
  if (!svg) return

  function draw(){
    const W = innerWidth, H = innerHeight
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

    const cx = W * .88, cy = H * .04            // 网心在右上
    const R  = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.1
    const spokes = 13, rings = 10
    let d = ''

    // 放射线
    for (let i = 0; i < spokes; i++){
      const a = (Math.PI * 2 / spokes) * i + .16
      d += `M${cx.toFixed(1)} ${cy.toFixed(1)}` +
           `L${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}`
    }
    // 一圈圈把网连起来
    for (let r = 1; r <= rings; r++){
      const rad = R * Math.pow(r / rings, 1.6)
      for (let i = 0; i <= spokes; i++){
        const a = (Math.PI * 2 / spokes) * i + .16
        const j = 1 + Math.sin(i * 2.7 + r * 1.3) * .05     // 轻微抖动
        const x = cx + Math.cos(a) * rad * j
        const y = cy + Math.sin(a) * rad * j
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
      }
    }
    svg.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1"/>`
  }

  draw()
  addEventListener('resize', draw, { passive: true })
})()


/* ═══════════════ 三、滚动：一次算完所有跟随滚动的东西 ═══════════════
   滚动一秒能触发几十次，所以：
     · 只挂一个监听器，不要每件事挂一个
     · 用 requestAnimationFrame 节流，一帧最多算一次
     · passive: true 告诉浏览器"我不会阻止滚动"，滚起来更顺
   ——这一条也是把返回顶部按钮的显隐（TODO 02）并进来的原因。 */
let ticking = false

function onScroll(){
  const max = root.scrollHeight - innerHeight
  const p   = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0

  // 第 4 课 TODO 03：顶部阅读进度条
  // 已经滚过的距离 ÷ 能滚的总距离 = 读了百分之多少
  if (progressBar) progressBar.style.width = (p * 100) + '%'

  // 蛛丝随滚动"织"出来，蜘蛛沿着它往下爬
  if (silkFill)   silkFill.style.height = (p * 100) + '%'
  if (silkSpider) silkSpider.style.top  = (8 + p * 84) + '%'

  // 背景蛛网做视差：比内容慢 10 倍，纵深就出来了
  if (webBg) webBg.style.transform = `translate3d(0, ${(-scrollY * .10).toFixed(1)}px, 0)`

  // 第 4 课 TODO 02：滚过大半屏，返回顶部按钮才浮出来。
  // 用 innerHeight * 0.6（六成屏高）而不是写死 500px ——
  // 手机屏和电脑屏高度差很多，写死的数字在一种设备上一定不合适。
  if (toTop) toTop.classList.toggle('is-visible', scrollY > innerHeight * .6)

  ticking = false
}

addEventListener('scroll', () => {
  if (!ticking){ ticking = true; requestAnimationFrame(onScroll) }
}, { passive: true })

// 首屏先算一次：刷新页面时浏览器可能已经把你滚到中间了，
// 不先算一次的话进度条是 0、按钮也不出现。
onScroll()


/* ═══════════════ 四、第 4 课 TODO 01：点按钮回到顶部 ═══════════════ */
if (toTop){
  toTop.addEventListener('click', () => {
    // window.scrollTo 让窗口滚到某个位置；behavior:'smooth' 是平滑滚过去，
    // 不写就是"啪"地瞬间跳。
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // 回到顶部后地址栏的 # 还停在刚才那个栏目，手动同步一下，
    // 否则右下角徽标还写着"经历"，人却已经在最上面了。
    history.replaceState(null, '', location.pathname)
    showCurrent('#about')
  })
}


/* ═══════════════ 五、栏目进入屏幕 → 浮出来 + 自动高亮 ═══════════════
   用 IntersectionObserver 而不是在 scroll 里自己算：
   scroll 一秒触发几十次，每次都去算所有元素的位置会让页面发卡。
   这个 API 由浏览器底层实现，只在元素真的进出屏幕时才通知你。 */

/* （一）内容从深处浮出来：z 轴推进 + 淡入 */
const revealTargets = document.querySelectorAll('.sec-title, .path li, .truth, .tag, .end-spider')
const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries){
    if (!entry.isIntersecting) continue
    entry.target.classList.add('is-in')
    revealObserver.unobserve(entry.target)   // 只演一次，往回滚不再重演
  }
}, { threshold: .15, rootMargin: '0px 0px -8% 0px' })
revealTargets.forEach(el => revealObserver.observe(el))

/* （二）滚到哪个栏目，高亮自己跟着换，不用点任何东西。
   rootMargin 把判定范围上下各收窄 45%，只剩屏幕中间一条 ——
   意思是"必须滚到屏幕中间才算进入这个栏目"。
   不收窄的话，栏目刚露个头就切换，滚动时高亮会来回乱跳。 */
const sections = document.querySelectorAll('main .sec[id]')
const spy = new IntersectionObserver(entries => {
  for (const entry of entries){
    if (entry.isIntersecting) showCurrent('#' + entry.target.id)
  }
}, { rootMargin: '-45% 0px -45% 0px' })
sections.forEach(section => spy.observe(section))


/* ═══════════════ 六、卡片 3D 跟随鼠标 ═══════════════
   只在"有鼠标、且系统没开减少动效"的时候才启用。
   触屏没有 hover，开了也没用，还费性能。 */
const hasPointer = matchMedia('(hover:hover) and (pointer:fine)').matches
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches

if (hasPointer && !reduceMotion){
  document.querySelectorAll('.truth').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width  - .5    // 算成 -0.5 ~ 0.5
      const py = (e.clientY - r.top)  / r.height - .5
      // 往右偏就绕 Y 轴转，往下偏就绕 X 轴转，角度都很小（±7°），
      // 再大就变成"晃"了，不像卡片。
      card.style.setProperty('--ry', (px *  7).toFixed(2) + 'deg')
      card.style.setProperty('--rx', (py * -7).toFixed(2) + 'deg')
    })
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg')
      card.style.setProperty('--ry', '0deg')
    })
  })
}
