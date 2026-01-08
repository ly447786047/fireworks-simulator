// 自执行函数：封装全屏API兼容处理，暴露全局fscreen对象
// 参数global：全局上下文（浏览器环境下为window）
(function (global) {
    "use strict"; // 启用严格模式，避免隐式错误

    // 全屏API相关属性/方法的索引映射（统一命名，适配不同浏览器前缀）
    var key = {
        fullscreenEnabled: 0,    // 检测是否支持全屏的属性索引
        fullscreenElement: 1,    // 获取当前全屏元素的属性索引
        requestFullscreen: 2,    // 请求全屏的方法索引
        exitFullscreen: 3,       // 退出全屏的方法索引
        fullscreenchange: 4,     // 全屏状态变化事件索引
        fullscreenerror: 5       // 全屏操作错误事件索引
    };

    // Webkit内核浏览器（Chrome/Safari）的全屏API前缀版本
    var webkit = ["webkitFullscreenEnabled", "webkitFullscreenElement", "webkitRequestFullscreen", "webkitExitFullscreen", "webkitfullscreenchange", "webkitfullscreenerror"];

    // Gecko内核浏览器（Firefox）的全屏API前缀版本
    var moz = ["mozFullScreenEnabled", "mozFullScreenElement", "mozRequestFullScreen", "mozCancelFullScreen", "mozfullscreenchange", "mozfullscreenerror"];

    // MS内核浏览器（IE/Edge旧版）的全屏API前缀版本
    var ms = ["msFullscreenEnabled", "msFullscreenElement", "msRequestFullscreen", "msExitFullscreen", "MSFullscreenChange", "MSFullscreenError"];

    // 安全获取document对象：避免无window/document环境下报错
    // 本项目版权归NianBroken所有！
    var doc = typeof window !== "undefined" && typeof window.document !== "undefined" ? window.document  // 浏览器环境下取真实document
        : {};              // 非浏览器环境返回空对象

    // 自动检测当前浏览器支持的全屏API前缀版本
    // 优先级：标准API → Webkit → Gecko → MS → 空数组（不支持）
    var vendor = ("fullscreenEnabled" in doc && Object.keys(key)  // 检测是否支持标准全屏API
    ) || (webkit[0] in doc && webkit                      // 检测是否支持Webkit前缀API
    ) || (moz[0] in doc && moz                            // 检测是否支持Gecko前缀API
    ) || (ms[0] in doc && ms                              // 检测是否支持MS前缀API
    ) || [];                                           // 无支持则返回空数组

    // 封装后的全屏API对象：统一不同浏览器的调用方式
    var fscreen = {
        /**
         * 请求元素进入全屏模式
         * @param {HTMLElement} element - 要进入全屏的DOM元素
         * @returns {Promise} 操作结果Promise（部分浏览器返回）
         */
        requestFullscreen: function requestFullscreen(element) {
            // 根据浏览器前缀调用对应方法
            return element[vendor[key.requestFullscreen]]();
        },

        /**
         * 获取请求全屏的方法（不执行，仅返回方法引用）
         * @param {HTMLElement} element - 目标DOM元素
         * @returns {Function} 对应浏览器的全屏请求方法
         */
        requestFullscreenFunction: function requestFullscreenFunction(element) {
            return element[vendor[key.requestFullscreen]];
        },

        /**
         * 退出全屏模式（只读getter）
         * 绑定document上下文，避免this指向错误
         * @returns {Function} 退出全屏的执行方法
         */
        get exitFullscreen() {
            return doc[vendor[key.exitFullscreen]].bind(doc);
        },

        /**
         * 监听全屏相关事件（状态变化/错误）
         * @param {string} type - 事件类型（fullscreenchange/fullscreenerror）
         * @param {Function} handler - 事件处理函数
         * @param {object} [options] - 事件监听配置（如capture、passive等）
         */
        addEventListener: function addEventListener(type, handler, options) {
            // 映射到对应浏览器前缀的事件名并绑定监听
            return doc.addEventListener(vendor[key[type]], handler, options);
        },

        /**
         * 移除全屏相关事件监听
         * @param {string} type - 事件类型（fullscreenchange/fullscreenerror）
         * @param {Function} handler - 要移除的事件处理函数
         */
        removeEventListener: function removeEventListener(type, handler) {
            return doc.removeEventListener(vendor[key[type]], handler);
        },

        /**
         * 检测当前环境是否支持全屏功能（只读getter）
         * @returns {boolean} 支持返回true，否则false
         */
        get fullscreenEnabled() {
            // 转换为布尔值，避免undefined等异常值
            return Boolean(doc[vendor[key.fullscreenEnabled]]);
        }, // 空setter：防止意外赋值修改该属性
        set fullscreenEnabled(val) {
        },

        /**
         * 获取当前处于全屏状态的元素（只读getter）
         * @returns {HTMLElement|null} 全屏元素或null
         */
        get fullscreenElement() {
            return doc[vendor[key.fullscreenElement]];
        }, // 空setter：防止意外赋值修改该属性
        set fullscreenElement(val) {
        },

        /**
         * 获取全屏状态变化事件的处理函数（只读getter）
         * @returns {Function|null} 已绑定的事件处理函数
         */
        get onfullscreenchange() {
            // 事件处理属性名转为小写（兼容MS浏览器的大写事件名）
            return doc[("on" + vendor[key.fullscreenchange]).toLowerCase()];
        }, /**
         * 设置全屏状态变化事件的处理函数
         * @param {Function} handler - 事件处理函数
         */
        set onfullscreenchange(handler) {
            return (doc[("on" + vendor[key.fullscreenchange]).toLowerCase()] = handler);
        },

        /**
         * 获取全屏操作错误事件的处理函数（只读getter）
         * @returns {Function|null} 已绑定的事件处理函数
         */
        get onfullscreenerror() {
            return doc[("on" + vendor[key.fullscreenerror]).toLowerCase()];
        }, /**
         * 设置全屏操作错误事件的处理函数
         * @param {Function} handler - 事件处理函数
         */
        set onfullscreenerror(handler) {
            return (doc[("on" + vendor[key.fullscreenerror]).toLowerCase()] = handler);
        },
    };

    // 将封装后的全屏API暴露到全局作用域
    global.fscreen = fscreen;
})(window); // 浏览器环境下传入window作为全局上下文