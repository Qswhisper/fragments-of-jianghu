// ===== render/animations-state.js =====
// 交互状态管理 - 统一管理hover和press状态

window.G = window.G || {};
G.render = G.render || {};
G.render.animations = G.render.animations || {};

(function () {
  // 状态存储
  var hoverTargets = {}; // { id: { bounds, hoverProgress, isHovering } }
  var pressTargets = {}; // { id: { bounds, pressProgress, isPressing } }
  
  // 过渡速度（每帧变化量）
  var HOVER_TRANSITION_SPEED = 0.15;
  var PRESS_TRANSITION_SPEED = 0.25;

  // 当前鼠标位置
  var mouseX = 0;
  var mouseY = 0;
  var mouseDown = false;

  // ===== Hover状态管理 =====
  
  function registerHoverTarget(id, bounds) {
    if (!hoverTargets[id]) {
      hoverTargets[id] = {
        bounds: bounds,
        hoverProgress: 0,
        isHovering: false
      };
    } else {
      hoverTargets[id].bounds = bounds;
    }
  }

  function unregisterHoverTarget(id) {
    delete hoverTargets[id];
  }

  function getHoverState(id) {
    var target = hoverTargets[id];
    return target ? target.hoverProgress : 0;
  }

  function isHovering(id) {
    var target = hoverTargets[id];
    return target ? target.isHovering : false;
  }

  // ===== Press状态管理 =====
  
  function registerPressTarget(id, bounds) {
    if (!pressTargets[id]) {
      pressTargets[id] = {
        bounds: bounds,
        pressProgress: 0,
        isPressing: false
      };
    } else {
      pressTargets[id].bounds = bounds;
    }
  }

  function unregisterPressTarget(id) {
    delete pressTargets[id];
  }

  function getPressState(id) {
    var target = pressTargets[id];
    return target ? target.pressProgress : 0;
  }

  function isPressing(id) {
    var target = pressTargets[id];
    return target ? target.isPressing : false;
  }

  // ===== 内部辅助函数 =====
  
  function isPointInBounds(x, y, bounds) {
    return x >= bounds.x && 
           x <= bounds.x + bounds.width && 
           y >= bounds.y && 
           y <= bounds.y + bounds.height;
  }

  function updateHoverStates() {
    Object.keys(hoverTargets).forEach(function (id) {
      var target = hoverTargets[id];
      var shouldHover = isPointInBounds(mouseX, mouseY, target.bounds);
      
      target.isHovering = shouldHover;
      
      if (shouldHover) {
        target.hoverProgress = Math.min(1, target.hoverProgress + HOVER_TRANSITION_SPEED);
      } else {
        target.hoverProgress = Math.max(0, target.hoverProgress - HOVER_TRANSITION_SPEED);
      }
    });
  }

  function updatePressStates() {
    Object.keys(pressTargets).forEach(function (id) {
      var target = pressTargets[id];
      var shouldPress = mouseDown && isPointInBounds(mouseX, mouseY, target.bounds);
      
      target.isPressing = shouldPress;
      
      if (shouldPress) {
        target.pressProgress = Math.min(1, target.pressProgress + PRESS_TRANSITION_SPEED);
      } else {
        target.pressProgress = Math.max(0, target.pressProgress - PRESS_TRANSITION_SPEED);
      }
    });
  }

  // ===== 更新函数（每帧调用） =====
  
  function update() {
    updateHoverStates();
    updatePressStates();
  }

  // ===== 鼠标事件监听 =====
  
  function setupMouseTracking() {
    document.addEventListener('mousemove', function (e) {
      // 尝试多个可能的canvas ID
      var canvas = document.getElementById('gameCanvas') || document.getElementById('canvas');
      if (canvas) {
        var rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      }
    });

    document.addEventListener('mousedown', function () {
      mouseDown = true;
    });

    document.addEventListener('mouseup', function () {
      mouseDown = false;
    });
  }

  // ===== 清理函数 =====
  
  function clearAllHoverTargets() {
    hoverTargets = {};
  }

  function clearAllPressTargets() {
    pressTargets = {};
  }

  function clearAll() {
    clearAllHoverTargets();
    clearAllPressTargets();
  }

  // ===== 调试函数 =====
  
  function getDebugInfo() {
    return {
      mouseX: mouseX,
      mouseY: mouseY,
      mouseDown: mouseDown,
      hoverTargetCount: Object.keys(hoverTargets).length,
      pressTargetCount: Object.keys(pressTargets).length,
      hoverTargets: Object.keys(hoverTargets).map(function (id) {
        var target = hoverTargets[id];
        return {
          id: id,
          isHovering: target.isHovering,
          hoverProgress: target.hoverProgress.toFixed(2),
          bounds: target.bounds
        };
      }),
      pressTargets: Object.keys(pressTargets).map(function (id) {
        var target = pressTargets[id];
        return {
          id: id,
          isPressing: target.isPressing,
          pressProgress: target.pressProgress.toFixed(2),
          bounds: target.bounds
        };
      })
    };
  }

  // 初始化鼠标追踪
  setupMouseTracking();

  // 导出API
  G.render.animations.state = {
    // Hover状态
    registerHoverTarget: registerHoverTarget,
    unregisterHoverTarget: unregisterHoverTarget,
    getHoverState: getHoverState,
    isHovering: isHovering,
    
    // Press状态
    registerPressTarget: registerPressTarget,
    unregisterPressTarget: unregisterPressTarget,
    getPressState: getPressState,
    isPressing: isPressing,
    
    // 更新
    update: update,
    
    // 清理
    clearAllHoverTargets: clearAllHoverTargets,
    clearAllPressTargets: clearAllPressTargets,
    clearAll: clearAll,
    
    // 调试
    getDebugInfo: getDebugInfo
  };
})();
