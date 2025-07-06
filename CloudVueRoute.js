// ==UserScript==
// @name         Vue Router Auth Patcher
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  自动修改 Vue Router 的鉴权设置，绕过路由守卫和权限控制（修复悬浮球bug）
// @author       cloud-jie & LuKeyC-NetSEC
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 样式定义
    GM_addStyle(`
        #vue-patcher-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 380px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            z-index: 99999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            color: #2c3e50;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            cursor: default;
            user-select: none;
            transition: transform 0.2s ease;
        }

        #vp-header {
            background: #42b983;
            color: white;
            padding: 15px 20px;
            font-weight: 600;
            font-size: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        #vp-toggle {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #vp-content {
            padding: 20px;
            overflow-y: auto;
            flex-grow: 1;
        }

        .vp-section {
            margin-bottom: 25px;
        }

        .vp-section-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 12px;
            color: #42b983;
            display: flex;
            align-items: center;
        }

        .vp-section-title:before {
            content: "•";
            margin-right: 8px;
            font-size: 20px;
        }

        .vp-btn {
            background: #42b983;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            margin-bottom: 10px;
        }

        .vp-btn:hover {
            background: #3aa776;
            transform: translateY(-2px);
        }

        .vp-btn.danger {
            background: #e74c3c;
        }

        .vp-btn.danger:hover {
            background: #c0392b;
        }

        .vp-btn.secondary {
            background: #3498db;
        }

        .vp-btn.secondary:hover {
            background: #2980b9;
        }

        .vp-status {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .vp-status-icon {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }

        .vp-status-icon.active {
            background: #42b983;
        }

        .vp-status-icon.inactive {
            background: #e74c3c;
        }

        .vp-log {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 12px;
            font-family: monospace;
            font-size: 13px;
            max-height: 200px;
            overflow-y: auto;
            line-height: 1.5;
        }

        .vp-log-entry {
            margin-bottom: 5px;
        }

        .vp-log-entry.success {
            color: #42b983;
        }

        .vp-log-entry.warning {
            color: #f39c12;
        }

        .vp-log-entry.error {
            color: #e74c3c;
        }

        .vp-hidden {
            display: none;
        }

        #vp-footer {
            padding: 15px 20px;
            background: #f8f9fa;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
        }

        .vp-route-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .vp-route-table th {
            background: #ecf0f1;
            text-align: left;
            padding: 8px;
            font-weight: 600;
        }

        .vp-route-table td {
            padding: 8px;
            border-bottom: 1px solid #ecf0f1;
        }

        .vp-route-table tr:last-child td {
            border-bottom: none;
        }

        #vp-floating-ball {
            position: fixed;
            width: 50px;
            height: 50px;
            background: #42b983;
            border-radius: 50%;
            display: none;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 99998;
            top: 20px;
            right: 20px;
            transition: transform 0.2s ease;
            user-select: none;
            touch-action: none;
        }

        #vp-floating-ball:hover {
            transform: scale(1.1);
        }

        #vp-floating-ball:active {
            transform: scale(1.05);
        }

        .vp-dragging {
            opacity: 0.9;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            transition: none;
        }

        .vp-no-transition {
            transition: none !important;
        }
    `);

    // 创建UI容器
    const container = document.createElement('div');
    container.id = 'vue-patcher-container';
    container.innerHTML = `
        <div id="vp-header">
            <div>Vue Router Patcher</div>
            <button id="vp-toggle">−</button>
        </div>
        <div id="vp-content">
            <div class="vp-section">
                <div class="vp-section-title">系统状态</div>
                <div class="vp-status">
                    <div class="vp-status-icon inactive"></div>
                    <div id="vp-vue-status">等待初始化...</div>
                </div>
                <div class="vp-status">
                    <div class="vp-status-icon inactive"></div>
                    <div id="vp-router-status">未检测到Vue Router</div>
                </div>
            </div>

            <div class="vp-section">
                <div class="vp-section-title">路由操作</div>
                <button class="vp-btn" id="vp-patch-auth">修改路由权限设置</button>
                <button class="vp-btn danger" id="vp-clear-guards">清除所有路由守卫</button>
                <button class="vp-btn secondary" id="vp-list-routes">列出所有路由</button>
                <button class="vp-btn secondary" id="vp-copy-routes">复制路由列表</button>
            </div>

            <div class="vp-section">
                <div class="vp-section-title">操作日志</div>
                <div class="vp-log" id="vp-log"></div>
            </div>

            <div class="vp-section vp-hidden" id="vp-routes-section">
                <div class="vp-section-title">路由列表</div>
                <div class="vp-route-table-container">
                    <table class="vp-route-table">
                        <thead>
                            <tr>
                                <th>路径</th>
                                <th>名称</th>
                                <th>权限状态</th>
                            </tr>
                        </thead>
                        <tbody id="vp-route-list"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="vp-footer">
            Vue Router Patcher By cloud-jie & LuKeyC-NetSEC
        </div>
    `;
    document.body.appendChild(container);

    // 创建悬浮球
    const floatingBall = document.createElement('div');
    floatingBall.id = 'vp-floating-ball';
    floatingBall.textContent = 'VP';
    document.body.appendChild(floatingBall);

    // 状态变量
    let vueRoot = null;
    let router = null;
    const logs = [];
    let isMinimized = GM_getValue('vp_is_minimized', false);
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startLeft = 0;
    let startTop = 0;
    let currentRoutes = [];
    let currentDragElement = null;
    let ballMouseDownTime = 0;
    let isBallDragged = false;

    // DOM 元素
    const contentEl = document.getElementById('vp-content');
    const toggleBtn = document.getElementById('vp-toggle');
    const vueStatusEl = document.getElementById('vp-vue-status');
    const routerStatusEl = document.getElementById('vp-router-status');
    const logEl = document.getElementById('vp-log');
    const patchAuthBtn = document.getElementById('vp-patch-auth');
    const clearGuardsBtn = document.getElementById('vp-clear-guards');
    const listRoutesBtn = document.getElementById('vp-list-routes');
    const copyRoutesBtn = document.getElementById('vp-copy-routes');
    const routesSection = document.getElementById('vp-routes-section');
    const routeListEl = document.getElementById('vp-route-list');
    const headerEl = document.getElementById('vp-header');

    // 应用存储的位置
    function applySavedPositions() {
        // 应用面板位置
        const panelTop = GM_getValue('vp_position_top', null);
        const panelLeft = GM_getValue('vp_position_left', null);
        const panelRight = GM_getValue('vp_position_right', null);

        if (panelTop !== null) {
            container.style.top = panelTop;
        }
        if (panelLeft !== null) {
            container.style.left = panelLeft;
            container.style.right = 'auto';
        } else if (panelRight !== null) {
            container.style.right = panelRight;
            container.style.left = 'auto';
        }

        // 应用悬浮球位置
        const ballTop = GM_getValue('vp_ball_top', null);
        const ballLeft = GM_getValue('vp_ball_left', null);
        const ballRight = GM_getValue('vp_ball_right', null);

        if (ballTop !== null) {
            floatingBall.style.top = ballTop;
        }
        if (ballLeft !== null) {
            floatingBall.style.left = ballLeft;
            floatingBall.style.right = 'auto';
        } else if (ballRight !== null) {
            floatingBall.style.right = ballRight;
            floatingBall.style.left = 'auto';
        }
    }

    // 初始化状态
    applySavedPositions();
    if (isMinimized) {
        minimizePanel();
    }

    // 添加日志
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `vp-log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        logEl.appendChild(logEntry);
        logEl.scrollTop = logEl.scrollHeight;
        logs.push({timestamp, message, type});
    }

    // 更新状态显示
    function updateStatus() {
        if (vueRoot) {
            vueStatusEl.textContent = 'Vue 已检测到';
            vueStatusEl.previousElementSibling.className = 'vp-status-icon active';

            if (router) {
                routerStatusEl.textContent = 'Vue Router 已检测到';
                routerStatusEl.previousElementSibling.className = 'vp-status-icon active';
            } else {
                routerStatusEl.textContent = '未检测到 Vue Router';
                routerStatusEl.previousElementSibling.className = 'vp-status-icon inactive';
            }
        } else {
            vueStatusEl.textContent = '未检测到 Vue';
            vueStatusEl.previousElementSibling.className = 'vp-status-icon inactive';
            routerStatusEl.textContent = '未检测到 Vue Router';
            routerStatusEl.previousElementSibling.className = 'vp-status-icon inactive';
        }
    }

    // 最小化面板
    function minimizePanel() {
        container.style.display = 'none';
        floatingBall.style.display = 'flex';
        toggleBtn.textContent = '+';
        isMinimized = true;

        // 同步悬浮球位置到面板位置
        const ballRect = floatingBall.getBoundingClientRect();
        container.style.left = `${ballRect.left}px`;
        container.style.top = `${ballRect.top}px`;
        container.style.right = 'auto';

        saveState();
    }

    // 恢复面板
    function restorePanel() {
        container.style.display = 'flex';
        floatingBall.style.display = 'none';
        toggleBtn.textContent = '−';
        isMinimized = false;
        saveState();
    }

    // 保存状态到存储
    function saveState() {
        // 保存面板状态
        GM_setValue('vp_is_minimized', isMinimized);
        GM_setValue('vp_display_state', isMinimized ? 'none' : 'flex');
        GM_setValue('vp_ball_display', isMinimized ? 'flex' : 'none');

        // 保存面板位置
        const panelRect = container.getBoundingClientRect();
        GM_setValue('vp_position_top', `${panelRect.top}px`);
        GM_setValue('vp_position_left', `${panelRect.left}px`);
        GM_setValue('vp_position_right', 'auto');

        // 保存悬浮球位置
        const ballRect = floatingBall.getBoundingClientRect();
        GM_setValue('vp_ball_top', `${ballRect.top}px`);
        GM_setValue('vp_ball_left', `${ballRect.left}px`);
        GM_setValue('vp_ball_right', 'auto');
    }

    // 切换UI显示
    toggleBtn.addEventListener('click', () => {
        if (isMinimized) {
            restorePanel();
        } else {
            minimizePanel();
        }
    });

    // 悬浮球事件处理
    floatingBall.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ballMouseDownTime = Date.now();
        isBallDragged = false;

        // 如果是左键点击才开始拖动
        if (e.button === 0) {
            startDrag(e, floatingBall);
        }
    });

    floatingBall.addEventListener('mousemove', () => {
        // 如果在拖动过程中移动了鼠标，则标记为拖动行为
        if (isDragging) {
            isBallDragged = true;
        }
    });

    floatingBall.addEventListener('mouseup', (e) => {
        // 如果拖动时间超过100ms或者移动了鼠标，则认为是拖动行为
        const isLongPress = Date.now() - ballMouseDownTime > 100;

        if (!isBallDragged && !isLongPress) {
            restorePanel();
        }

        // 重置状态
        isBallDragged = false;
        ballMouseDownTime = 0;
    });

    // 面板拖动处理
    headerEl.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            startDrag(e, container);
        }
    });

    // 开始拖动
    function startDrag(e, element) {
        isDragging = true;
        currentDragElement = element;

        // 禁用过渡效果
        element.classList.add('vp-no-transition');

        // 记录初始位置
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        // 添加拖动样式
        element.classList.add('vp-dragging');

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag, { once: true });
    }

    // 拖动处理
    function onDrag(e) {
        if (!isDragging) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        const newLeft = startLeft + dx;
        const newTop = startTop + dy;

        // 边界检查
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elementWidth = currentDragElement.offsetWidth;
        const elementHeight = currentDragElement.offsetHeight;

        const boundedLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
        const boundedTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

        // 应用新位置
        currentDragElement.style.left = `${boundedLeft}px`;
        currentDragElement.style.top = `${boundedTop}px`;
        currentDragElement.style.right = 'auto';

        // 如果是悬浮球拖动，同步面板位置
        if (currentDragElement === floatingBall) {
            container.style.left = `${boundedLeft}px`;
            container.style.top = `${boundedTop}px`;
            container.style.right = 'auto';
        }
    }

    // 停止拖动
    function stopDrag() {
        if (!isDragging) return;

        isDragging = false;

        // 移除拖动样式
        currentDragElement.classList.remove('vp-dragging');
        currentDragElement.classList.remove('vp-no-transition');

        // 恢复过渡效果
        setTimeout(() => {
            currentDragElement.classList.remove('vp-no-transition');
        }, 100);

        // 保存状态
        saveState();

        document.removeEventListener('mousemove', onDrag);
    }

    // 工具函数：查找Vue根实例
    function findVueRoot(root, maxDepth = 1000) {
        const queue = [{ node: root, depth: 0 }];
        while (queue.length) {
            const { node, depth } = queue.shift();
            if (depth > maxDepth) break;
            if (node.__vue_app__ || node.__vue__ || node._vnode) {
                return node;
            }
            if (node.nodeType === 1 && node.childNodes) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    queue.push({ node: node.childNodes[i], depth: depth + 1 });
                }
            }
        }
        return null;
    }

    // 工具函数：定位Vue Router实例
    function findVueRouter(vueRoot) {
        try {
            if (vueRoot.__vue_app__) {
                return vueRoot.__vue_app__.config.globalProperties.$router;
            }
            if (vueRoot.__vue__) {
                return vueRoot.__vue__.$root.$options.router || vueRoot.__vue__._router;
            }
        } catch (e) {
            addLog(`查找Vue Router时出错: ${e.message}`, 'error');
        }
        return null;
    }

    // 工具函数：遍历路由
    function walkRoutes(routes, cb) {
        routes.forEach(route => {
            cb(route);
            if (Array.isArray(route.children) && route.children.length) {
                walkRoutes(route.children, cb);
            }
        });
    }

    // 工具函数：判断权限值
    function isAuthTrue(val) {
        return val === true || val === 'true' || val === 1 || val === '1';
    }

    // 修改路由权限
    function patchAllRouteAuth() {
        if (!router) {
            addLog('错误：未找到Vue Router实例', 'error');
            return;
        }

        const modified = [];

        function patchMeta(route) {
            if (route.meta && typeof route.meta === 'object') {
                Object.keys(route.meta).forEach(key => {
                    if (key.toLowerCase().includes('auth') && isAuthTrue(route.meta[key])) {
                        route.meta[key] = false;
                        modified.push({ path: route.path, name: route.name });
                    }
                });
            }
        }

        if (typeof router.getRoutes === 'function') {
            router.getRoutes().forEach(patchMeta);
            addLog(`已修改 ${modified.length} 个路由的权限设置`, 'success');
        } else if (router.options && Array.isArray(router.options.routes)) {
            walkRoutes(router.options.routes, patchMeta);
            addLog(`已修改 ${modified.length} 个路由的权限设置`, 'success');
        } else {
            addLog('未识别的Vue Router版本，跳过修改', 'warning');
            return;
        }

        if (modified.length > 0) {
            modified.forEach(route => {
                addLog(`已修改: ${route.name || '无名路由'} (${route.path})`, 'success');
            });
        } else {
            addLog('没有需要修改的路由权限字段', 'info');
        }
    }

    // 清除路由守卫
    function patchRouterGuards() {
        if (!router) {
            addLog('错误：未找到Vue Router实例', 'error');
            return;
        }

        ['beforeEach', 'beforeResolve', 'afterEach'].forEach(hook => {
            if (typeof router[hook] === 'function') {
                router[hook] = () => {};
                addLog(`已清除 ${hook} 守卫`, 'success');
            }
        });

        if (Array.isArray(router.beforeGuards)) {
            router.beforeGuards.length = 0;
            addLog('已清除 beforeGuards 队列', 'success');
        }

        if (Array.isArray(router.beforeHooks)) {
            router.beforeHooks.length = 0;
            addLog('已清除 beforeHooks 队列', 'success');
        }

        addLog('所有路由守卫已清除', 'success');
    }

    // 复制路由列表到剪贴板
    function copyRoutesToClipboard() {
        if (currentRoutes.length === 0) {
            addLog('没有可复制的路由数据，请先点击"列出所有路由"', 'warning');
            return;
        }

        let text = '路径\t名称\t权限状态\n';
        text += currentRoutes.map(route => {
            const name = route.name || '—';
            let authStatus = '无权限控制';
            if (route.meta) {
                const authKeys = Object.keys(route.meta).filter(k => k.toLowerCase().includes('auth'));
                if (authKeys.length > 0) {
                    const authValue = route.meta[authKeys[0]];
                    authStatus = isAuthTrue(authValue) ? '需要权限' : '开放访问';
                }
            }
            return `${route.path}\t${name}\t${authStatus}`;
        }).join('\n');

        GM_setClipboard(text, 'text')
            .then(() => {
                addLog('路由列表已复制到剪贴板', 'success');
            })
            .catch(err => {
                addLog(`复制失败: ${err.message}`, 'error');
            });
    }

    // 列出所有路由
    function listAllRoutes() {
        if (!router) {
            addLog('错误：未找到Vue Router实例', 'error');
            return;
        }

        currentRoutes = [];

        function joinPath(base, path) {
            if (!path) return base || '/';
            if (path.startsWith('/')) return path;
            if (!base || base === '/') return '/' + path;
            return (base.endsWith('/') ? base.slice(0, -1) : base) + '/' + path;
        }

        if (typeof router.getRoutes === 'function') {
            router.getRoutes().forEach(r => {
                currentRoutes.push({
                    name: r.name,
                    path: r.path,
                    meta: r.meta
                });
            });
        } else if (router.options && Array.isArray(router.options.routes)) {
            function traverse(routes, basePath) {
                routes.forEach(r => {
                    const fullPath = joinPath(basePath, r.path);
                    currentRoutes.push({ name: r.name, path: fullPath, meta: r.meta });
                    if (Array.isArray(r.children) && r.children.length) {
                        traverse(r.children, fullPath);
                    }
                });
            }
            traverse(router.options.routes, '');
        } else {
            addLog('无法列出路由信息', 'warning');
            return;
        }

        routesSection.classList.remove('vp-hidden');
        routeListEl.innerHTML = '';

        currentRoutes.forEach(route => {
            const row = document.createElement('tr');

            const pathCell = document.createElement('td');
            pathCell.textContent = route.path;

            const nameCell = document.createElement('td');
            nameCell.textContent = route.name || '—';

            const authCell = document.createElement('td');
            let authStatus = '无权限控制';
            if (route.meta) {
                const authKeys = Object.keys(route.meta).filter(k => k.toLowerCase().includes('auth'));
                if (authKeys.length > 0) {
                    const authValue = route.meta[authKeys[0]];
                    authStatus = isAuthTrue(authValue) ? '需要权限' : '开放访问';
                }
            }
            authCell.textContent = authStatus;

            row.appendChild(pathCell);
            row.appendChild(nameCell);
            row.appendChild(authCell);
            routeListEl.appendChild(row);
        });

        addLog(`已列出 ${currentRoutes.length} 条路由`, 'success');
        addLog('点击"复制路由列表"按钮可将数据复制到剪贴板', 'info');
    }

    // 初始化检测
    function initDetection() {
        vueRoot = findVueRoot(document.body);
        if (vueRoot) {
            router = findVueRouter(vueRoot);
            updateStatus();
            addLog('Vue 实例已找到', 'success');

            if (router) {
                addLog('Vue Router 实例已找到', 'success');
                const version = vueRoot.__vue_app__?.version ||
                               vueRoot.__vue__?.$root?.$options?._base?.version ||
                               '未知版本';
                addLog(`检测到 Vue ${version}`, 'info');
            } else {
                addLog('未找到 Vue Router 实例', 'warning');
            }
        } else {
            addLog('未找到 Vue 实例', 'warning');
            updateStatus();
            // 隐藏UI元素
            container.style.display = 'none';
            floatingBall.style.display = 'none';
        }
    }

    // 按钮事件绑定
    patchAuthBtn.addEventListener('click', patchAllRouteAuth);
    clearGuardsBtn.addEventListener('click', patchRouterGuards);
    listRoutesBtn.addEventListener('click', listAllRoutes);
    copyRoutesBtn.addEventListener('click', copyRoutesToClipboard);

    // 初始化
    setTimeout(initDetection, 1000);
    addLog('Vue Router Patcher 已加载', 'success');
    addLog('提示：拖动标题栏可以移动控制面板', 'info');
})();
