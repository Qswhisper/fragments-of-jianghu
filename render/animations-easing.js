// ===== render/animations-easing.js =====
// 缓动函数库 - 为动画系统提供各种缓动效果
// 所有函数接受 t (0-1) 并返回缓动后的值 (0-1)

window.G = window.G || {};
G.render = G.render || {};
G.render.animations = G.render.animations || {};

(function () {
  // 工具函数：限制值在范围内
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // ===== 线性缓动 =====
  function linear(t) {
    return clamp(t, 0, 1);
  }

  // ===== 二次缓动 (Quadratic) =====
  function easeInQuad(t) {
    t = clamp(t, 0, 1);
    return t * t;
  }

  function easeOutQuad(t) {
    t = clamp(t, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }

  function easeInOutQuad(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ===== 三次缓动 (Cubic) =====
  function easeInCubic(t) {
    t = clamp(t, 0, 1);
    return t * t * t;
  }

  function easeOutCubic(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ===== 四次缓动 (Quartic) =====
  function easeInQuart(t) {
    t = clamp(t, 0, 1);
    return t * t * t * t;
  }

  function easeOutQuart(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 4);
  }

  function easeInOutQuart(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  // ===== 五次缓动 (Quintic) =====
  function easeInQuint(t) {
    t = clamp(t, 0, 1);
    return t * t * t * t * t;
  }

  function easeOutQuint(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 5);
  }

  function easeInOutQuint(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  // ===== 弹性缓动 (Elastic) - 果冻效果！ =====
  function easeInElastic(t) {
    t = clamp(t, 0, 1);
    var c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  }

  function easeOutElastic(t) {
    t = clamp(t, 0, 1);
    var c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  function easeInOutElastic(t) {
    t = clamp(t, 0, 1);
    var c5 = (2 * Math.PI) / 4.5;
    return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }

  // ===== 回弹缓动 (Back) - 回弹效果！ =====
  function easeInBack(t) {
    t = clamp(t, 0, 1);
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  function easeOutBack(t) {
    t = clamp(t, 0, 1);
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeInOutBack(t) {
    t = clamp(t, 0, 1);
    var c1 = 1.70158;
    var c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }

  // ===== 弹跳缓动 (Bounce) - 弹跳效果！ =====
  function easeInBounce(t) {
    return 1 - easeOutBounce(1 - t);
  }

  function easeOutBounce(t) {
    t = clamp(t, 0, 1);
    var n1 = 7.5625;
    var d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  function easeInOutBounce(t) {
    t = clamp(t, 0, 1);
    return t < 0.5
      ? (1 - easeOutBounce(1 - 2 * t)) / 2
      : (1 + easeOutBounce(2 * t - 1)) / 2;
  }

  // ===== 圆形缓动 (Circular) =====
  function easeInCirc(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.sqrt(1 - Math.pow(t, 2));
  }

  function easeOutCirc(t) {
    t = clamp(t, 0, 1);
    return Math.sqrt(1 - Math.pow(t - 1, 2));
  }

  function easeInOutCirc(t) {
    t = clamp(t, 0, 1);
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  }

  // ===== 指数缓动 (Exponential) =====
  function easeInExpo(t) {
    t = clamp(t, 0, 1);
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  }

  function easeOutExpo(t) {
    t = clamp(t, 0, 1);
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function easeInOutExpo(t) {
    t = clamp(t, 0, 1);
    return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }

  // ===== 正弦缓动 (Sine) =====
  function easeInSine(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  function easeOutSine(t) {
    t = clamp(t, 0, 1);
    return Math.sin((t * Math.PI) / 2);
  }

  function easeInOutSine(t) {
    t = clamp(t, 0, 1);
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  // 导出所有缓动函数
  G.render.animations.easing = {
    // 线性
    linear: linear,

    // 二次
    easeInQuad: easeInQuad,
    easeOutQuad: easeOutQuad,
    easeInOutQuad: easeInOutQuad,

    // 三次
    easeInCubic: easeInCubic,
    easeOutCubic: easeOutCubic,
    easeInOutCubic: easeInOutCubic,

    // 四次
    easeInQuart: easeInQuart,
    easeOutQuart: easeOutQuart,
    easeInOutQuart: easeInOutQuart,

    // 五次
    easeInQuint: easeInQuint,
    easeOutQuint: easeOutQuint,
    easeInOutQuint: easeInOutQuint,

    // 弹性（果冻效果）
    easeInElastic: easeInElastic,
    easeOutElastic: easeOutElastic,
    easeInOutElastic: easeInOutElastic,

    // 回弹
    easeInBack: easeInBack,
    easeOutBack: easeOutBack,
    easeInOutBack: easeInOutBack,

    // 弹跳
    easeInBounce: easeInBounce,
    easeOutBounce: easeOutBounce,
    easeInOutBounce: easeInOutBounce,

    // 圆形
    easeInCirc: easeInCirc,
    easeOutCirc: easeOutCirc,
    easeInOutCirc: easeInOutCirc,

    // 指数
    easeInExpo: easeInExpo,
    easeOutExpo: easeOutExpo,
    easeInOutExpo: easeInOutExpo,

    // 正弦
    easeInSine: easeInSine,
    easeOutSine: easeOutSine,
    easeInOutSine: easeInOutSine
  };

  // 提供获取缓动函数的辅助方法
  G.render.animations.getEasing = function (name) {
    return G.render.animations.easing[name] || G.render.animations.easing.linear;
  };
})();
