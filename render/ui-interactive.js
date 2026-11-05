// ===== render/ui-interactive.js =====
// 交互式UI组件 - 连接UI组件系统和动画系统

window.G = window.G || {};
G.render = G.render || {};
G.render.ui = G.render.ui || {};

(function () {
  // 所有交互式组件的注册表
  var interactives = [];
  var nextId = 1;

  // ===== InteractiveButton类 =====
  
  function InteractiveButton(config) {
    this.id = 'btn_' + (nextId++);
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 200;
    this.height = config.height || 60;
    this.label = config.label || '按钮';
    this.subtitle = config.subtitle || null;
    this.onClick = config.onClick || null;
    this.enabled = config.enabled !== false;
    
    // 视觉状态
    this.scale = 1;
    this.alpha = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // 动画状态
    this.hoverProgress = 0;
    this.pressProgress = 0;
    this.isAnimating = false;
    this.wasPressed = false;
    
    // 注册hover和press状态
    this._registerStates();
  }

  InteractiveButton.prototype._registerStates = function () {
    if (G.render.animations.state) {
      G.render.animations.state.registerHoverTarget(this.id, {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      });
      
      G.render.animations.state.registerPressTarget(this.id, {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      });
    }
  };

  InteractiveButton.prototype.updateBounds = function (x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width || this.width;
    this.height = height || this.height;
    this._registerStates();
  };

  InteractiveButton.prototype.update = function () {
    if (!this.enabled) {
      return;
    }
    
    // 获取hover和press状态
    if (G.render.animations.state) {
      this.hoverProgress = G.render.animations.state.getHoverState(this.id);
      var currentPressProgress = G.render.animations.state.getPressState(this.id);
      
      // 检测点击（从按下到释放的转换）
      var isPressed = currentPressProgress > 0.5;
      
      if (this.wasPressed && !isPressed && this.onClick) {
        this.playClickAnimation();
        this.onClick();
      }
      
      this.wasPressed = isPressed;
      this.pressProgress = currentPressProgress;
    }
    
    // 应用hover效果（轻微缩放）
    if (!this.isAnimating) {
      this.scale = 1 + this.hoverProgress * 0.03;
      
      // 应用press效果（按下）
      if (this.pressProgress > 0) {
        this.scale = 1 - this.pressProgress * 0.05;
      }
    } else {
      // 动画播放时，平滑过渡到目标缩放
      var targetScale = 1 + this.hoverProgress * 0.03;
      var diff = targetScale - this.scale;
      // 使用线性插值平滑过渡
      if (Math.abs(diff) > 0.001) {
        this.scale += diff * 0.15;
      }
    }
  };

  InteractiveButton.prototype.playClickAnimation = function () {
    var self = this;
    if (this.isAnimating) {
      return;
    }
    
    this.isAnimating = true;
    
    // 果冻弹跳动画
    if (G.render.animations.ui) {
      G.render.animations.ui.jellyBounce(function (scaleX, scaleY) {
        // 在动画过程中叠加hover效果
        var hoverBonus = self.hoverProgress * 0.03;
        self.scale = scaleX + hoverBonus;
      }, 400, function () {
        self.isAnimating = false;
        // 动画结束时确保scale正确
        self.scale = 1 + self.hoverProgress * 0.03;
      });
    }
  };

  InteractiveButton.prototype.render = function (ctx) {
    ctx.save();
    
    // 应用变换
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x + this.width / 2 + this.offsetX, this.y + this.height / 2 + this.offsetY);
    ctx.scale(this.scale, this.scale);
    
    // 绘制按钮
    if (G.render.ui.drawButton) {
      G.render.ui.drawButton(ctx, {
        x: -this.width / 2,
        y: -this.height / 2,
        width: this.width,
        height: this.height,
        label: this.label,
        subtitle: this.subtitle,
        fill: this.enabled ? (this.hoverProgress > 0 ? '#8b1d2a' : '#7b1724') : '#4a4a4a',
        stroke: this.enabled ? '#c2a57a' : '#6a6a6a'
      });
    }
    
    ctx.restore();
  };

  InteractiveButton.prototype.destroy = function () {
    if (G.render.animations.state) {
      G.render.animations.state.unregisterHoverTarget(this.id);
      G.render.animations.state.unregisterPressTarget(this.id);
    }
  };

  // ===== InteractivePanel类 =====
  
  function InteractivePanel(config) {
    this.id = 'panel_' + (nextId++);
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 400;
    this.height = config.height || 300;
    this.fill = config.fill || 'rgba(10, 11, 14, 0.76)';
    this.stroke = config.stroke || 'rgba(168, 138, 104, 0.14)';
    this.surface = config.surface || 'ink-panel';
    
    // 视觉状态
    this.alpha = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    
    // 生命周期
    this.visible = false;
    this.isAnimating = false;
  }

  InteractivePanel.prototype.show = function (animation) {
    var self = this;
    animation = animation || 'fadeIn';
    
    if (this.visible || this.isAnimating) {
      return;
    }
    
    this.visible = true;
    this.isAnimating = true;
    
    if (!G.render.animations.ui) {
      this.alpha = 1;
      this.isAnimating = false;
      return;
    }
    
    switch (animation) {
      case 'fadeIn':
        G.render.animations.ui.fadeIn(function (alpha) {
          self.alpha = alpha;
        }, 300, function () {
          self.isAnimating = false;
        });
        break;
        
      case 'scaleIn':
        this.scale = 0;
        this.alpha = 1;
        G.render.animations.ui.scaleIn(function (scale) {
          self.scale = scale;
        }, 300, function () {
          self.isAnimating = false;
        });
        break;
        
      case 'jellyBounce':
        this.scale = 0;
        this.alpha = 1;
        G.render.animations.ui.jellyBounce(function (scaleX, scaleY) {
          self.scale = scaleX;
        }, 600, function () {
          self.isAnimating = false;
        });
        break;
        
      case 'slideIn':
        this.offsetY = -100;
        this.alpha = 1;
        G.render.animations.ui.slideIn('top', 100, function (x, y) {
          self.offsetX = x;
          self.offsetY = y;
        }, 400, function () {
          self.isAnimating = false;
        });
        break;
        
      default:
        this.alpha = 1;
        this.isAnimating = false;
    }
  };

  InteractivePanel.prototype.hide = function (animation) {
    var self = this;
    animation = animation || 'fadeOut';
    
    if (!this.visible || this.isAnimating) {
      return;
    }
    
    this.isAnimating = true;
    
    if (!G.render.animations.ui) {
      this.alpha = 0;
      this.visible = false;
      this.isAnimating = false;
      return;
    }
    
    switch (animation) {
      case 'fadeOut':
        G.render.animations.ui.fadeOut(function (alpha) {
          self.alpha = alpha;
        }, 300, function () {
          self.visible = false;
          self.isAnimating = false;
        });
        break;
        
      case 'scaleOut':
        G.render.animations.ui.scaleOut(function (scale) {
          self.scale = scale;
        }, 200, function () {
          self.visible = false;
          self.isAnimating = false;
        });
        break;
        
      case 'slideOut':
        G.render.animations.ui.slideOut('top', 100, function (x, y) {
          self.offsetX = x;
          self.offsetY = y;
        }, 300, function () {
          self.visible = false;
          self.isAnimating = false;
        });
        break;
        
      default:
        this.alpha = 0;
        this.visible = false;
        this.isAnimating = false;
    }
  };

  InteractivePanel.prototype.render = function (ctx) {
    if (!this.visible && this.alpha <= 0) {
      return;
    }
    
    ctx.save();
    
    // 应用变换
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x + this.width / 2 + this.offsetX, this.y + this.height / 2 + this.offsetY);
    ctx.scale(this.scale, this.scale);
    
    // 绘制面板
    if (G.render.ui.drawPanel) {
      G.render.ui.drawPanel(ctx, -this.width / 2, -this.height / 2, this.width, this.height, {
        fill: this.fill,
        stroke: this.stroke,
        surface: this.surface,
        paperAlpha: 0.04,
        lineWidth: 1.1
      });
    }
    
    ctx.restore();
  };

  // ===== 管理函数 =====
  
  function createInteractiveButton(config) {
    var button = new InteractiveButton(config);
    interactives.push(button);
    return button;
  }

  function createInteractivePanel(config) {
    var panel = new InteractivePanel(config);
    interactives.push(panel);
    return panel;
  }

  function removeInteractive(interactive) {
    var index = interactives.indexOf(interactive);
    if (index !== -1) {
      if (interactive.destroy) {
        interactive.destroy();
      }
      interactives.splice(index, 1);
    }
  }

  function updateInteractives() {
    interactives.forEach(function (interactive) {
      if (interactive.update) {
        interactive.update();
      }
    });
  }

  function renderInteractives(ctx) {
    interactives.forEach(function (interactive) {
      if (interactive.render) {
        interactive.render(ctx);
      }
    });
  }

  function clearAllInteractives() {
    interactives.forEach(function (interactive) {
      if (interactive.destroy) {
        interactive.destroy();
      }
    });
    interactives = [];
  }

  function getInteractiveById(id) {
    return interactives.find(function (interactive) {
      return interactive.id === id;
    });
  }

  function getDebugInfo() {
    return {
      count: interactives.length,
      items: interactives.map(function (interactive) {
        return {
          id: interactive.id,
          type: interactive.constructor.name,
          visible: interactive.visible !== false,
          enabled: interactive.enabled !== false,
          isAnimating: interactive.isAnimating || false
        };
      })
    };
  }

  // 导出API
  G.render.ui.InteractiveButton = InteractiveButton;
  G.render.ui.InteractivePanel = InteractivePanel;
  G.render.ui.createInteractiveButton = createInteractiveButton;
  G.render.ui.createInteractivePanel = createInteractivePanel;
  G.render.ui.removeInteractive = removeInteractive;
  G.render.ui.updateInteractives = updateInteractives;
  G.render.ui.renderInteractives = renderInteractives;
  G.render.ui.clearAllInteractives = clearAllInteractives;
  G.render.ui.getInteractiveById = getInteractiveById;
  G.render.ui.getInteractivesDebugInfo = getDebugInfo;
})();
