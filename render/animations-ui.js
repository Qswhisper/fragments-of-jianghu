// ===== render/animations-ui.js =====
// UI动画系统 - 提供通用动画控制器和预设UI动画效果

window.G = window.G || {};
G.render = G.render || {};
G.render.animations = G.render.animations || {};

(function () {
  // 动画队列
  var activeAnimations = [];
  var nextAnimId = 1;

  // ===== 工具函数 =====
  
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // ===== 通用动画控制器 =====
  
  /**
   * 创建通用动画
   * @param {Object} config - 动画配置
   * @param {number} config.duration - 持续时间（毫秒）
   * @param {string} config.easing - 缓动函数名称（默认'easeOutCubic'）
   * @param {Object} config.from - 起始值对象 { x: 0, y: 0, alpha: 0, ... }
   * @param {Object} config.to - 结束值对象 { x: 100, y: 50, alpha: 1, ... }
   * @param {Function} config.onUpdate - 更新回调 function(values) { }
   * @param {Function} config.onComplete - 完成回调 function() { }
   * @param {number} config.delay - 延迟开始（毫秒，默认0）
   * @returns {number} 动画ID
   */
  function animate(config) {
    var anim = {
      id: nextAnimId++,
      duration: config.duration || 300,
      easing: config.easing || 'easeOutCubic',
      from: config.from || {},
      to: config.to || {},
      onUpdate: config.onUpdate || null,
      onComplete: config.onComplete || null,
      delay: config.delay || 0,
      elapsed: 0,
      delayElapsed: 0,
      started: false,
      completed: false
    };

    activeAnimations.push(anim);
    return anim.id;
  }

  /**
   * 取消动画
   * @param {number} animId - 动画ID
   */
  function cancelAnimation(animId) {
    activeAnimations = activeAnimations.filter(function (anim) {
      return anim.id !== animId;
    });
  }

  /**
   * 更新所有动画（每帧调用）
   * @param {number} deltaMs - 帧间隔时间（毫秒）
   */
  function updateAnimations(deltaMs) {
    activeAnimations = activeAnimations.filter(function (anim) {
      if (anim.completed) {
        return false;
      }

      // 处理延迟
      if (!anim.started) {
        anim.delayElapsed += deltaMs;
        if (anim.delayElapsed < anim.delay) {
          return true;
        }
        anim.started = true;
      }

      // 更新进度
      anim.elapsed += deltaMs;
      var progress = clamp(anim.elapsed / anim.duration, 0, 1);

      // 应用缓动
      var easingFunc = G.render.animations.getEasing(anim.easing);
      var easedProgress = easingFunc(progress);

      // 计算当前值
      var currentValues = {};
      Object.keys(anim.from).forEach(function (key) {
        currentValues[key] = lerp(anim.from[key], anim.to[key], easedProgress);
      });

      // 调用更新回调
      if (anim.onUpdate) {
        anim.onUpdate(currentValues);
      }

      // 检查是否完成
      if (progress >= 1) {
        anim.completed = true;
        if (anim.onComplete) {
          anim.onComplete();
        }
        return false;
      }

      return true;
    });
  }

  /**
   * 顺序执行动画
   * @param {Array} configs - 动画配置数组
   * @param {Function} onAllComplete - 全部完成回调
   * @returns {Array} 动画ID数组
   */
  function sequence(configs, onAllComplete) {
    var animIds = [];
    var currentIndex = 0;

    function startNext() {
      if (currentIndex >= configs.length) {
        if (onAllComplete) {
          onAllComplete();
        }
        return;
      }

      var config = configs[currentIndex];
      var originalOnComplete = config.onComplete;
      
      config.onComplete = function () {
        if (originalOnComplete) {
          originalOnComplete();
        }
        currentIndex++;
        startNext();
      };

      animIds.push(animate(config));
    }

    startNext();
    return animIds;
  }

  /**
   * 并行执行动画
   * @param {Array} configs - 动画配置数组
   * @param {Function} onAllComplete - 全部完成回调
   * @returns {Array} 动画ID数组
   */
  function parallel(configs, onAllComplete) {
    var animIds = [];
    var completedCount = 0;

    configs.forEach(function (config) {
      var originalOnComplete = config.onComplete;
      
      config.onComplete = function () {
        if (originalOnComplete) {
          originalOnComplete();
        }
        completedCount++;
        if (completedCount === configs.length && onAllComplete) {
          onAllComplete();
        }
      };

      animIds.push(animate(config));
    });

    return animIds;
  }

  // ===== UI预设动画 =====

  /**
   * 淡入动画
   * @param {Function} onUpdate - 更新回调 function(alpha) { }
   * @param {number} duration - 持续时间（毫秒，默认300）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function fadeIn(onUpdate, duration, onComplete) {
    return animate({
      duration: duration || 300,
      easing: 'easeOutCubic',
      from: { alpha: 0 },
      to: { alpha: 1 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.alpha);
      },
      onComplete: onComplete
    });
  }

  /**
   * 淡出动画
   * @param {Function} onUpdate - 更新回调 function(alpha) { }
   * @param {number} duration - 持续时间（毫秒，默认300）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function fadeOut(onUpdate, duration, onComplete) {
    return animate({
      duration: duration || 300,
      easing: 'easeOutCubic',
      from: { alpha: 1 },
      to: { alpha: 0 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.alpha);
      },
      onComplete: onComplete
    });
  }

  /**
   * 缩放进入动画
   * @param {Function} onUpdate - 更新回调 function(scale) { }
   * @param {number} duration - 持续时间（毫秒，默认300）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function scaleIn(onUpdate, duration, onComplete) {
    return animate({
      duration: duration || 300,
      easing: 'easeOutBack',
      from: { scale: 0 },
      to: { scale: 1 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.scale);
      },
      onComplete: onComplete
    });
  }

  /**
   * 缩放退出动画
   * @param {Function} onUpdate - 更新回调 function(scale) { }
   * @param {number} duration - 持续时间（毫秒，默认300）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function scaleOut(onUpdate, duration, onComplete) {
    return animate({
      duration: duration || 200,
      easing: 'easeInBack',
      from: { scale: 1 },
      to: { scale: 0 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.scale);
      },
      onComplete: onComplete
    });
  }

  /**
   * 滑入动画
   * @param {string} direction - 方向 'left', 'right', 'top', 'bottom'
   * @param {number} distance - 滑动距离（像素）
   * @param {Function} onUpdate - 更新回调 function(x, y) { }
   * @param {number} duration - 持续时间（毫秒，默认400）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function slideIn(direction, distance, onUpdate, duration, onComplete) {
    var from = { x: 0, y: 0 };
    var to = { x: 0, y: 0 };

    if (direction === 'left') {
      from.x = -distance;
    } else if (direction === 'right') {
      from.x = distance;
    } else if (direction === 'top') {
      from.y = -distance;
    } else if (direction === 'bottom') {
      from.y = distance;
    }

    return animate({
      duration: duration || 400,
      easing: 'easeOutCubic',
      from: from,
      to: to,
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.x, values.y);
      },
      onComplete: onComplete
    });
  }

  /**
   * 滑出动画
   * @param {string} direction - 方向 'left', 'right', 'top', 'bottom'
   * @param {number} distance - 滑动距离（像素）
   * @param {Function} onUpdate - 更新回调 function(x, y) { }
   * @param {number} duration - 持续时间（毫秒，默认400）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function slideOut(direction, distance, onUpdate, duration, onComplete) {
    var from = { x: 0, y: 0 };
    var to = { x: 0, y: 0 };

    if (direction === 'left') {
      to.x = -distance;
    } else if (direction === 'right') {
      to.x = distance;
    } else if (direction === 'top') {
      to.y = -distance;
    } else if (direction === 'bottom') {
      to.y = distance;
    }

    return animate({
      duration: duration || 300,
      easing: 'easeInCubic',
      from: from,
      to: to,
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.x, values.y);
      },
      onComplete: onComplete
    });
  }

  /**
   * 果冻弹跳动画（重点！）
   * @param {Function} onUpdate - 更新回调 function(scaleX, scaleY) { }
   * @param {number} duration - 持续时间（毫秒，默认600）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function jellyBounce(onUpdate, duration, onComplete) {
    return animate({
      duration: duration || 400,
      easing: 'easeOutBack',
      from: { scaleX: 0.92, scaleY: 0.92 },
      to: { scaleX: 1, scaleY: 1 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.scaleX, values.scaleY);
      },
      onComplete: onComplete
    });
  }

  /**
   * 抖动动画
   * @param {Function} onUpdate - 更新回调 function(offsetX, offsetY) { }
   * @param {number} amplitude - 抖动幅度（像素，默认5）
   * @param {number} duration - 持续时间（毫秒，默认400）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function wiggle(onUpdate, amplitude, duration, onComplete) {
    amplitude = amplitude || 5;
    duration = duration || 400;
    
    var startTime = Date.now();
    var animId = animate({
      duration: duration,
      easing: 'easeOutCubic',
      from: { progress: 0 },
      to: { progress: 1 },
      onUpdate: function (values) {
        var t = values.progress;
        var intensity = 1 - t; // 逐渐减弱
        var frequency = 20; // 抖动频率
        
        var offsetX = Math.sin(t * Math.PI * frequency) * amplitude * intensity;
        var offsetY = Math.cos(t * Math.PI * frequency * 0.7) * amplitude * intensity * 0.5;
        
        if (onUpdate) onUpdate(offsetX, offsetY);
      },
      onComplete: onComplete
    });
    
    return animId;
  }

  /**
   * 脉冲动画（缩放脉冲）
   * @param {Function} onUpdate - 更新回调 function(scale) { }
   * @param {number} minScale - 最小缩放（默认0.95）
   * @param {number} maxScale - 最大缩放（默认1.05）
   * @param {number} duration - 持续时间（毫秒，默认800）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function pulse(onUpdate, minScale, maxScale, duration, onComplete) {
    minScale = minScale !== undefined ? minScale : 0.95;
    maxScale = maxScale !== undefined ? maxScale : 1.05;
    duration = duration || 800;
    
    return animate({
      duration: duration,
      easing: 'easeInOutSine',
      from: { scale: minScale },
      to: { scale: maxScale },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.scale);
      },
      onComplete: function () {
        // 反向动画
        animate({
          duration: duration,
          easing: 'easeInOutSine',
          from: { scale: maxScale },
          to: { scale: minScale },
          onUpdate: function (values) {
            if (onUpdate) onUpdate(values.scale);
          },
          onComplete: onComplete
        });
      }
    });
  }

  /**
   * 发光效果（透明度脉冲）
   * @param {Function} onUpdate - 更新回调 function(glowAlpha) { }
   * @param {number} duration - 持续时间（毫秒，默认1000）
   * @param {Function} onComplete - 完成回调
   * @returns {number} 动画ID
   */
  function glow(onUpdate, duration, onComplete) {
    duration = duration || 1000;
    
    return animate({
      duration: duration / 2,
      easing: 'easeInOutSine',
      from: { alpha: 0 },
      to: { alpha: 1 },
      onUpdate: function (values) {
        if (onUpdate) onUpdate(values.alpha);
      },
      onComplete: function () {
        animate({
          duration: duration / 2,
          easing: 'easeInOutSine',
          from: { alpha: 1 },
          to: { alpha: 0 },
          onUpdate: function (values) {
            if (onUpdate) onUpdate(values.alpha);
          },
          onComplete: onComplete
        });
      }
    });
  }

  // ===== 清理函数 =====
  
  function clearAllAnimations() {
    activeAnimations = [];
  }

  // ===== 调试函数 =====
  
  function getDebugInfo() {
    return {
      activeAnimationCount: activeAnimations.length,
      animations: activeAnimations.map(function (anim) {
        return {
          id: anim.id,
          duration: anim.duration,
          elapsed: anim.elapsed,
          progress: (anim.elapsed / anim.duration * 100).toFixed(1) + '%',
          easing: anim.easing,
          started: anim.started,
          completed: anim.completed
        };
      })
    };
  }

  // 导出API
  G.render.animations.ui = {
    // 通用动画控制器
    animate: animate,
    cancelAnimation: cancelAnimation,
    updateAnimations: updateAnimations,
    sequence: sequence,
    parallel: parallel,
    
    // UI预设动画
    fadeIn: fadeIn,
    fadeOut: fadeOut,
    scaleIn: scaleIn,
    scaleOut: scaleOut,
    slideIn: slideIn,
    slideOut: slideOut,
    jellyBounce: jellyBounce,
    wiggle: wiggle,
    pulse: pulse,
    glow: glow,
    
    // 清理
    clearAllAnimations: clearAllAnimations,
    
    // 调试
    getDebugInfo: getDebugInfo
  };
})();
