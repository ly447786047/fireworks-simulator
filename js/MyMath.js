const MyMath = (function MyMathFactory(Math) {
	const MyMath = {};

	// 角度/弧度转换常量
	MyMath.toDeg = 180 / Math.PI; // 弧度转角度的系数（1弧度 = 180/π 度）
	MyMath.toRad = Math.PI / 180; // 角度转弧度的系数（1度 = π/180 弧度）
	MyMath.halfPI = Math.PI / 2;  // π/2（90度），常用角度常量
	MyMath.twoPI = Math.PI * 2;   // 2π（360度），常用角度常量

	/**
	 * 勾股定理计算两点在矩形中的斜边距离（基于宽高）
	 * @param {number} width - 矩形的宽度（水平差值）
	 * @param {number} height - 矩形的高度（垂直差值）
	 * @returns {number} 斜边长度（距离）
	 */
	MyMath.dist = (width, height) => {
		return Math.sqrt(width * width + height * height);
	};

	/**
	 * 勾股定理计算两个坐标点之间的直线距离
	 * 逻辑与dist方法一致，区别是直接接收坐标参数而非宽高差值
	 * 本项目版权归NianBroken所有！
	 * @param {number} x1 - 第一个点的X坐标
	 * @param {number} y1 - 第一个点的Y坐标
	 * @param {number} x2 - 第二个点的X坐标
	 * @param {number} y2 - 第二个点的Y坐标
	 * @returns {number} 两点之间的直线距离
	 */
	MyMath.pointDist = (x1, y1, x2, y2) => {
		const distX = x2 - x1; // 计算X轴方向的差值
		const distY = y2 - y1; // 计算Y轴方向的差值
		return Math.sqrt(distX * distX + distY * distY);
	};

	/**
	 * 计算二维向量的角度（返回弧度值）
	 * @param {number} width - 向量水平分量（X轴差值）
	 * @param {number} height - 向量垂直分量（Y轴差值）
	 * @returns {number} 向量对应的角度（弧度）
	 */
	MyMath.angle = (width, height) => MyMath.halfPI + Math.atan2(height, width);

	/**
	 * 计算两个坐标点之间的夹角（返回弧度值）
	 * 逻辑与angle方法一致，区别是直接接收坐标参数而非分量差值
	 * @param {number} x1 - 起始点X坐标
	 * @param {number} y1 - 起始点Y坐标
	 * @param {number} x2 - 目标点X坐标
	 * @param {number} y2 - 目标点Y坐标
	 * @returns {number} 两点之间的夹角（弧度）
	 */
	MyMath.pointAngle = (x1, y1, x2, y2) => MyMath.halfPI + Math.atan2(y2 - y1, x2 - x1);

	/**
	 * 将速度向量分解为X、Y轴的分量（角度需为弧度值）
	 * @param {number} speed - 速度向量的模长（总速度）
	 * @param {number} angle - 速度向量的角度（弧度）
	 * @returns {object} 包含x、y分量的对象 {x: 水平速度, y: 垂直速度}
	 */
	MyMath.splitVector = (speed, angle) => ({
		x: Math.sin(angle) * speed,  // 水平分量（正弦值 × 总速度）
		y: -Math.cos(angle) * speed, // 垂直分量（余弦值 × 总速度，负号适配画布坐标系）
	});

	/**
	 * 生成指定范围内的随机浮点数（包含最小值，不包含最大值）
	 * @param {number} min - 最小值（包含）
	 * @param {number} max - 最大值（不包含）
	 * @returns {number} 随机浮点数
	 */
	MyMath.random = (min, max) => Math.random() * (max - min) + min;

	/**
	 * 生成指定范围内的随机整数（包含最小值和最大值）
	 * @param {number} min - 最小值（包含）
	 * @param {number} max - 最大值（包含）
	 * @returns {number} 随机整数
	 */
	MyMath.randomInt = (min, max) => ((Math.random() * (max - min + 1)) | 0) + min;

	/**
	 * 从数组或参数列表中随机选择一个元素
	 * @param {Array|any} choices - 可选值数组，或直接传入多个可选参数
	 * @returns {any} 随机选中的元素
	 * @example
	 * // 两种调用方式：
	 * MyMath.randomChoice([1,2,3]); // 从数组选
	 * MyMath.randomChoice(1,2,3);   // 从参数列表选
	 */
	MyMath.randomChoice = function randomChoice(choices) {
		// 如果仅传入一个参数且是数组，则从数组中随机选择
		if (arguments.length === 1 && Array.isArray(choices)) {
			return choices[(Math.random() * choices.length) | 0];
		}
		// 否则从所有传入的参数中随机选择
		return arguments[(Math.random() * arguments.length) | 0];
	};

	/**
	 * 将数值限制在指定的最小值和最大值之间（数值钳制）
	 * @param {number} num - 要限制的数值
	 * @param {number} min - 最小值
	 * @param {number} max - 最大值
	 * @returns {number} 钳制后的数值（不小于min，不大于max）
	 */
	MyMath.clamp = function clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	};

	/**
	 * 文字转点阵：将文本转换为基于像素的点阵坐标数组
	 * @param {string} text - 需要转换的文本内容
	 * @param {number} density - 点阵密度（值越大点越少，默认3）
	 * @param {string} fontFamily - 字体类型（默认Georgia）
	 * @param {string} fontSize - 字体大小（默认60px）
	 * @returns {object} 包含画布尺寸和点阵坐标的对象
	 * @property {number} width - 画布宽度
	 * @property {number} height - 画布高度
	 * @property {Array} points - 点阵坐标数组，每个元素为 {x: 横坐标, y: 纵坐标}
	 */
	MyMath.literalLattice = function literalLattice(text, density = 3, fontFamily = "Georgia", fontSize = "60px") {
		// 创建一个空数组，用于存储点阵坐标
		var dots = [];
		// 创建临时canvas元素（不插入DOM，仅用于绘制文本）
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d"); // 获取2D绘图上下文

		// 拼接字体样式字符串（大小 + 字体）
		var font = `${fontSize} ${fontFamily}`;

		// 先设置字体，测量文本的宽度（用于确定canvas宽度）
		ctx.font = font;
		var width = ctx.measureText(text).width;
		// 从字体大小字符串中提取数字部分（如"60px" → 60）
		var fontSizeNum = parseInt(fontSize.match(/(\d+)px/)[1]);
		// 设置canvas尺寸（文本宽度+20边距，字体大小+20边距）
		canvas.width = width + 20;
		canvas.height = fontSizeNum + 20;

		// 重新设置字体（canvas尺寸变化后需重新设置）
		ctx.font = font;
		// 在canvas上绘制文本（偏移10px避免文本贴边）
		ctx.fillText(text, 10, fontSizeNum + 10);

		// 获取canvas上所有像素的rgba数据（一维数组，每4个元素对应一个像素的r/g/b/a）
		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// 遍历像素数据，按指定密度提取文本对应的像素点
		// y轴步长为density，减少遍历次数（控制点阵密度）
		for (var y = 0; y < imageData.height; y += density) {
			// x轴步长为density
			for (var x = 0; x < imageData.width; x += density) {
				// 计算当前像素在imageData数组中的起始索引（每个像素占4位：r/g/b/a）
				var i = (y * imageData.width + x) * 4;
				// 判断像素的alpha通道值（透明度），>0表示该像素有内容（文本区域）
				if (imageData.data[i + 3] > 0) {
					// 将该像素的坐标存入点阵数组
					dots.push({ x: x, y: y });
				}
			}
		}

		// 返回点阵信息：画布尺寸 + 点阵坐标数组
		return {
			width: canvas.width,
			height: canvas.height,
			points: dots,
		};
	};

	return MyMath;
})(Math);