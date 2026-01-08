/**
 * 帧循环管理器（Ticker）：基于requestAnimationFrame封装的高性能帧循环
 * 核心作用：统一管理动画帧回调，控制帧率并传递帧耗时参数
 * @param {Window} window - 全局window对象
 * @returns {Object} 暴露addListener方法的Ticker对象
 */
const Ticker = (function TickerFactory(window) {
    "use strict"; // 启用严格模式，禁止隐式全局变量、this指向window等

    const Ticker = {}; // 核心暴露对象

    /**
     * 【公开方法】注册帧循环监听器
     * 注册后回调函数会被逐帧调用，传入两个参数：
     * - 帧耗时（当前帧与上一帧的时间差，单位ms）
     * - 延迟倍数（帧耗时 / 16.6667，即相对于60fps的延迟比例）
     * @param {Function} callback - 帧回调函数（必须是函数类型）
     * @throws {string} 若传入非函数类型，抛出错误提示
     */
    Ticker.addListener = function addListener(callback) {
        // 参数校验：确保回调是函数类型
        if (typeof callback !== "function") throw "Ticker.addListener() requires a function reference passed for a callback.";

        // 将回调加入监听器列表
        listeners.push(callback);

        // 懒加载启动帧循环：仅当有监听器且未启动时才开始循环
        if (!started) {
            started = true;
            queueFrame(); // 请求第一帧
        }
    };

    // 私有状态变量
    let started = false;       // 帧循环是否已启动
    let lastTimestamp = 0;     // 上一帧的时间戳（用于计算帧耗时）
    let listeners = [];        // 帧回调监听器列表

    /**
     * 【私有方法】请求下一帧
     * 兼容标准requestAnimationFrame和老版webkit内核（如旧版Chrome/Safari）
     */
    function queueFrame() {
        if (window.requestAnimationFrame) {
            requestAnimationFrame(frameHandler); // 标准API
        } else if (window.webkitRequestAnimationFrame) { // 兼容老版webkit内核
            webkitRequestAnimationFrame(frameHandler);
        }
    }

    /**
     * 【私有方法】帧处理核心函数（由requestAnimationFrame调用）
     * @param {number} timestamp - 浏览器传入的当前帧时间戳（单位ms）
     */
    function frameHandler(timestamp) {
        // 计算当前帧耗时（当前时间戳 - 上一帧时间戳）
        let frameTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp; // 更新上一帧时间戳

        // 修正异常帧时间：
        // 1. 首帧可能出现负数，默认设为17ms（约60fps的单帧时间）
        if (frameTime < 0) {
            frameTime = 17;
        }
        // 2. 限制最低帧率为15fps（68ms），避免卡顿导致帧时间过长
        else if (frameTime > 68) {
            frameTime = 68;
        }

        // 执行所有注册的帧监听器
        // call(window)：确保回调的this指向window
        // 传入参数：帧耗时、延迟倍数（用于动画速度补偿）
        listeners.forEach((listener) => listener.call(window, frameTime, frameTime / 16.6667));

        // 持续请求下一帧，维持循环
        queueFrame();
    }

    return Ticker; // 暴露Ticker对象
})(window);

/**
 * Canvas画布管理器（Stage）：封装Canvas尺寸、高DPI适配、鼠标/触摸事件统一处理
 * @param {Window} window - 全局window对象
 * @param {Document} document - 全局document对象
 * @param {Object} Ticker - 帧循环管理器
 * @returns {Function} Stage构造函数
 */
const Stage = (function StageFactory(window, document, Ticker) {
    "use strict";

    // 全局变量：记录最后一次触摸事件的时间戳
    // 作用：防止触摸事件后立即触发鼠标事件，避免重复响应
    let lastTouchTimestamp = 0;

    /**
     * Stage构造函数：初始化Canvas画布
     * @param {HTMLElement|string} canvas - Canvas DOM节点 或 Canvas的ID字符串
     */
    function Stage(canvas) {
        // 若传入的是字符串（ID），则通过ID获取Canvas节点
        if (typeof canvas === "string") {
            canvas = document.getElementById(canvas);
        }

        // 保存Canvas元素和2D上下文引用
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 禁用Canvas的默认触摸手势（如双指缩放、单指滚动），避免影响自定义交互
        this.canvas.style.touchAction = "none";

        // 物理速度倍数：用于控制动画/物理模拟的速度（需在业务层自行实现）
        this.speed = 1;

        // 设备像素比（DPR）：适配高分辨率屏幕（如Retina屏）
        // disableHighDPI为true时强制使用1（禁用高DPI），否则计算真实DPR
        // backingStorePixelRatio：浏览器内部的Canvas像素比（兼容老版浏览器）
        this.dpr = Stage.disableHighDPI ? 1 : (window.devicePixelRatio || 1) / (this.ctx.backingStorePixelRatio || 1);

        // Canvas尺寸管理：
        // width/height：CSS像素（视觉尺寸）
        // naturalWidth/naturalHeight：物理像素（实际渲染尺寸）
        this.width = canvas.width;
        this.height = canvas.height;
        this.naturalWidth = this.width * this.dpr;
        this.naturalHeight = this.height * this.dpr;

        // 调整Canvas物理尺寸以匹配高DPI，避免渲染模糊
        if (this.width !== this.naturalWidth) {
            this.canvas.width = this.naturalWidth;    // 设置Canvas实际渲染宽度
            this.canvas.height = this.naturalHeight;  // 设置Canvas实际渲染高度
            this.canvas.style.width = this.width + "px"; // 视觉宽度（CSS）
            this.canvas.style.height = this.height + "px"; // 视觉高度（CSS）
        }

        // 将当前Stage实例加入全局管理列表，方便批量处理事件
        Stage.stages.push(this);

        // 事件监听器存储：管理自定义事件的回调函数
        this._listeners = {
            resize: [],                // 画布尺寸调整事件
            pointerstart: [],          // 指针按下事件（统一鼠标/触摸）
            pointermove: [],           // 指针移动事件
            pointerend: [],            // 指针抬起事件
            lastPointerPos: { x: 0, y: 0 } // 记录最后一次指针位置（用于触摸结束时）
        };
    }

    // 静态属性：存储所有Stage实例，用于全局事件分发
    Stage.stages = [];

    // 静态属性：是否禁用高DPI渲染（默认false，启用高DPI）
    // 需在创建Stage实例前设置，否则不生效
    Stage.disableHighDPI = false;

    /**
     * 注册事件监听器
     * @param {string} event - 事件类型（支持：ticker/resize/pointerstart/pointermove/pointerend）
     * @param {Function} handler - 事件回调函数
     * @throws {string} 若事件类型无效，抛出"Invalid Event"错误
     */
    Stage.prototype.addEventListener = function addEventListener(event, handler) {
        try {
            if (event === "ticker") {
                // ticker事件：绑定到Ticker帧循环
                Ticker.addListener(handler);
            } else if (this._listeners.hasOwnProperty(event)) {
                // 普通事件：加入对应监听器列表
                this._listeners[event].push(handler);
            } else {
                // 无效事件类型
                throw "Invalid Event";
            }
        } catch (e) {
            // 捕获所有异常，统一抛出无效事件错误
            throw "Invalid Event";
        }
    };

    /**
     * 触发自定义事件
     * @param {string} event - 事件类型
     * @param {*} val - 传递给回调函数的参数
     * @throws {string} 若事件类型无效，抛出"Invalid Event"错误
     */
    Stage.prototype.dispatchEvent = function dispatchEvent(event, val) {
        const listeners = this._listeners[event];
        if (listeners) {
            // 执行所有该事件的监听器，call(this)确保回调的this指向当前Stage实例
            listeners.forEach((listener) => listener.call(this, val));
        } else {
            throw "Invalid Event";
        }
    };

    /**
     * 调整Canvas画布尺寸
     * @param {number} w - 新的宽度（CSS像素）
     * @param {number} h - 新的高度（CSS像素）
     */
    Stage.prototype.resize = function resize(w, h) {
        // 更新尺寸属性
        this.width = w;
        this.height = h;
        this.naturalWidth = w * this.dpr;
        this.naturalHeight = h * this.dpr;

        // 更新Canvas实际渲染尺寸和视觉尺寸
        this.canvas.width = this.naturalWidth;
        this.canvas.height = this.naturalHeight;
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";

        // 触发resize事件，通知业务层尺寸变化
        this.dispatchEvent("resize");
    };

    /**
     * 【静态方法】窗口坐标转换为Canvas本地坐标
     * 解决Canvas视觉尺寸与实际尺寸不一致、窗口滚动等问题
     * @param {HTMLElement} canvas - 目标Canvas节点
     * @param {number} x - 窗口X坐标（如clientX）
     * @param {number} y - 窗口Y坐标（如clientY）
     * @returns {Object} 转换后的Canvas本地坐标 {x, y}
     */
    Stage.windowToCanvas = function windowToCanvas(canvas, x, y) {
        // 获取Canvas在视口内的位置和尺寸（包含边框、滚动等）
        const bbox = canvas.getBoundingClientRect();
        return {
            // X坐标：(窗口X - Canvas左边界) × (Canvas实际宽度 / Canvas视觉宽度)
            x: (x - bbox.left) * (canvas.width / bbox.width),
            // Y坐标：(窗口Y - Canvas上边界) × (Canvas实际高度 / Canvas视觉高度)
            y: (y - bbox.top) * (canvas.height / bbox.height)
        };
    };

    /**
     * 【静态方法】全局鼠标事件处理函数
     * 统一转换为标准化的指针事件，分发给所有Stage实例
     * @param {MouseEvent} evt - 原生鼠标事件对象
     */
    Stage.mouseHandler = function mouseHandler(evt) {
        // 触摸事件后500ms内忽略鼠标事件，避免重复响应
        if (Date.now() - lastTouchTimestamp < 500) {
            return;
        }

        // 映射原生鼠标事件类型到标准化指针事件类型
        let type = "start"; // mousedown → start
        if (evt.type === "mousemove") {
            type = "move";  // mousemove → move
        } else if (evt.type === "mouseup") {
            type = "end";   // mouseup → end
        }

        // 为所有Stage实例分发指针事件
        Stage.stages.forEach((stage) => {
            // 转换窗口坐标到Canvas本地坐标
            const pos = Stage.windowToCanvas(stage.canvas, evt.clientX, evt.clientY);
            // 分发事件（除以dpr：转换为CSS像素坐标）
            stage.pointerEvent(type, pos.x / stage.dpr, pos.y / stage.dpr);
        });
    };

    /**
     * 【静态方法】全局触摸事件处理函数
     * 统一转换为标准化的指针事件，分发给所有Stage实例
     * @param {TouchEvent} evt - 原生触摸事件对象
     */
    Stage.touchHandler = function touchHandler(evt) {
        // 更新最后一次触摸时间戳，用于屏蔽后续鼠标事件
        lastTouchTimestamp = Date.now();

        // 映射原生触摸事件类型到标准化指针事件类型
        let type = "start"; // touchstart → start
        if (evt.type === "touchmove") {
            type = "move";  // touchmove → move
        } else if (evt.type === "touchend") {
            type = "end";   // touchend → end
        }

        // 为所有Stage实例分发指针事件
        Stage.stages.forEach((stage) => {
            // 兼容Safari：TouchList默认不可迭代，需转为数组
            for (let touch of Array.from(evt.changedTouches)) {
                let pos;
                if (type !== "end") {
                    // 触摸中：获取当前触摸点的Canvas本地坐标
                    pos = Stage.windowToCanvas(stage.canvas, touch.clientX, touch.clientY);
                    // 记录最后一次触摸位置（用于touchend时）
                    stage._listeners.lastPointerPos = pos;
                    // 触摸开始前先触发一次move事件，模拟鼠标移入行为
                    if (type === "start") {
                        stage.pointerEvent("move", pos.x / stage.dpr, pos.y / stage.dpr);
                    }
                } else {
                    // 触摸结束：使用最后一次记录的位置（touchend时touch坐标可能失效）
                    pos = stage._listeners.lastPointerPos;
                }
                // 分发事件（除以dpr：转换为CSS像素坐标）
                stage.pointerEvent(type, pos.x / stage.dpr, pos.y / stage.dpr);
            }
        });
    };

    /**
     * 分发标准化的指针事件（统一鼠标/触摸）
     * @param {string} type - 事件类型（start/move/end）
     * @param {number} x - Canvas本地X坐标（CSS像素）
     * @param {number} y - Canvas本地Y坐标（CSS像素）
     */
    Stage.prototype.pointerEvent = function pointerEvent(type, x, y) {
        // 构建标准化的事件对象
        const evt = {
            type: type, // 事件类型（start/move/end）
            x: x,       // Canvas本地X坐标
            y: y,       // Canvas本地Y坐标
            // 判断指针是否在Canvas范围内（用于业务层过滤）
            onCanvas: x >= 0 && x <= this.width && y >= 0 && y <= this.height
        };

        // 触发对应的指针事件（pointerstart/pointermove/pointerend）
        this.dispatchEvent("pointer" + type, evt);
    };

    // 注册全局鼠标事件监听器
    document.addEventListener("mousedown", Stage.mouseHandler);
    document.addEventListener("mousemove", Stage.mouseHandler);
    document.addEventListener("mouseup", Stage.mouseHandler);

    // 注册全局触摸事件监听器
    document.addEventListener("touchstart", Stage.touchHandler);
    document.addEventListener("touchmove", Stage.touchHandler);
    document.addEventListener("touchend", Stage.touchHandler);

    return Stage; // 暴露Stage构造函数
})(window, document, Ticker);