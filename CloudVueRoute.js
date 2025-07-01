(function () {
  // ======== 工具函数 ========
  // 广度优先查找 Vue 根实例（Vue2/3）
  function findVueRoot(root, maxDepth = 1000) {
    const queue = [{ node: root, depth: 0 }];
    while (queue.length) {
      const { node, depth } = queue.shift();
      if (depth > maxDepth) break;
      // Vue3 应用实例在根 DOM 上有 __vue_app__
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

  // 定位 Vue Router 实例：Vue3 在 appContext.globalProperties，Vue2 在 $root.$options.router
  function findVueRouter(vueRoot) {
    try {
      if (vueRoot.__vue_app__) {
        // Vue3 + Router4
        return vueRoot.__vue_app__.config.globalProperties.$router;
      }
      if (vueRoot.__vue__) {
        // Vue2 + Router2/3
        return vueRoot.__vue__.$root.$options.router || vueRoot.__vue__._router;
      }
    } catch (e) {
      console.warn('Error finding Vue Router:', e);
    }
    return null;
  }

  // 遍历路由数组及其子路由
  function walkRoutes(routes, cb) {
    routes.forEach(route => {
      cb(route);
      if (Array.isArray(route.children) && route.children.length) {
        walkRoutes(route.children, cb);
      }
    });
  }

  // 判断 meta 字段值是否表示“真”（需要鉴权）
  function isAuthTrue(val) {
    return val === true || val === 'true' || val === 1 || val === '1';
  }

  // ======== 修改路由 meta ========
  function patchAllRouteAuth(router) {
    const modified = [];
    function patchMeta(route) {
      if (route.meta && typeof route.meta === 'object') {
        Object.keys(route.meta).forEach(key => {
          // 识别所有包含 "auth" 字眼的字段
          if (key.toLowerCase().includes('auth') && isAuthTrue(route.meta[key])) {
            route.meta[key] = false;
            modified.push({ path: route.path, name: route.name });
          }
        });
      }
    }

    // Vue Router 4.x / 3.5+ 支持 getRoutes()
    if (typeof router.getRoutes === 'function') {
      router.getRoutes().forEach(patchMeta);
    }
    // Vue Router 2.x/3.x
    else if (router.options && Array.isArray(router.options.routes)) {
      walkRoutes(router.options.routes, patchMeta);
    } else {
      console.warn('🚫 未识别的 Vue Router 版本，跳过 Route Auth Patch');
    }

    if (modified.length) {
      console.log('🚀 已修改的路由 auth meta：');
      console.table(modified);
    } else {
      console.log('ℹ️ 没有需要修改的路由 auth 字段');
    }
    return modified;
  }

  // ======== 清除路由守卫 ========
  function patchRouterGuards(router) {
    ['beforeEach', 'beforeResolve', 'afterEach'].forEach(hook => {
      if (typeof router[hook] === 'function') {
        router[hook] = () => {};
      }
    });
    // Vue Router 4 内部存储的守卫队列
    if (Array.isArray(router.beforeGuards)) router.beforeGuards.length = 0;
    if (Array.isArray(router.beforeHooks))  router.beforeHooks.length = 0;
    console.log('✅ 路由守卫已清除');
  }

  // ======== 列出所有路由（完整路径） ========
  function listAllRoutes(router) {
    const list = [];
    // 辅助拼接完整路径
    function joinPath(base, path) {
      if (!path) return base || '/';
      if (path.startsWith('/')) return path;
      if (!base || base === '/') return '/' + path;
      return (base.endsWith('/') ? base.slice(0, -1) : base) + '/' + path;
    }
    // 针对 Vue Router 4 (getRoutes 已包含所有记录，扁平结构)
    if (typeof router.getRoutes === 'function') {
      router.getRoutes().forEach(r => {
        list.push({
          name: r.name,
          path: r.path,    // 在 Vue Router 4 中，r.path 为完整路径
          meta: r.meta
        });
      });
    }
    // 针对 Vue Router 2/3，递归合成完整路径
    else if (router.options && Array.isArray(router.options.routes)) {
      function traverse(routes, basePath) {
        routes.forEach(r => {
          const fullPath = joinPath(basePath, r.path);
          list.push({ name: r.name, path: fullPath, meta: r.meta });
          if (Array.isArray(r.children) && r.children.length) {
            traverse(r.children, fullPath);
          }
        });
      }
      traverse(router.options.routes, '');
    } else {
      console.warn('🚫 无法列出路由信息');
      return;
    }
    console.log('🔍 当前所有路由：');
    console.table(list);
  }

  // ======== 主流程 ========
  const vueRoot = findVueRoot(document.body);
  if (!vueRoot) {
    return console.error('❌ 未检测到 Vue 实例');
  }
  const router = findVueRouter(vueRoot);
  if (!router) {
    return console.error('❌ 未检测到 Vue Router 实例');
  }
  console.log('✅ Vue 版本 ：', vueRoot.__vue_app__?.version || vueRoot.__vue__?.$root?.$options?._base?.version || 'unknown');

  // 修改路由鉴权元信息并清除导航守卫
  const modifiedRoutes = patchAllRouteAuth(router);
  patchRouterGuards(router);
  // 列出所有路由（含完整路径）
  listAllRoutes(router);
})();
