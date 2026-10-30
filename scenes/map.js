window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var DEFAULT_ACT_META = {
    1: {
      number: 1,
      title: "卷一：沦陷的九城",
      mapSubtitle: "12 个节点，3 条路径，在乱城废墟间寻找活路。"
    },
    2: {
      number: 2,
      title: "卷二：焦土驿道",
      mapSubtitle: "12 个节点，3 条路径，驿道尽成焦土，劫匪和追兵一路压来。"
    },
    3: {
      number: 3,
      title: "卷三：津门租界",
      mapSubtitle: "12 个节点，3 条路径，租界灯火未熄，但刀枪都比城外更整齐。"
    },
    4: {
      number: 4,
      title: "卷四：军阀铁路线",
      mapSubtitle: "12 个节点，3 条路径，北洋兵沿着铁路层层架火，把江湖逼成直线。"
    },
    5: {
      number: 5,
      title: "卷五：南下渡口",
      mapSubtitle: "12 个节点，3 条路径，南下只剩最后一道渡口，死士与枪手一齐封江。"
    }
  };
  var TIER_BLUEPRINTS = [
    {
      tier: 1,
      y: 610,
      anchors: [206, 636, 1072],
      jitterX: 112,
      jitterY: 22,
      minGap: 210,
      templates: [
        { type: "street", label: "喋血街头", icon: "⚔️", scene: "combat" },
        { type: "event", label: "奇遇", icon: "❓", scene: "event" },
        { type: "street", label: "喋血街头", icon: "⚔️", scene: "combat" }
      ]
    },
    {
      tier: 2,
      y: 494,
      anchors: [228, 628, 1056],
      jitterX: 128,
      jitterY: 24,
      minGap: 210,
      templates: [
        { type: "rest", label: "破庙", icon: "🔥", scene: "rest" },
        { type: "street", label: "喋血街头", icon: "⚔️", scene: "combat" },
        { type: "shop", label: "黑市", icon: "🏪", scene: "shop" }
      ]
    },
    {
      tier: 3,
      y: 378,
      anchors: [252, 646, 1028],
      jitterX: 132,
      jitterY: 24,
      minGap: 210,
      templates: [
        { type: "elite", label: "强敌", icon: "💀", scene: "combat" },
        { type: "event", label: "奇遇", icon: "❓", scene: "event" },
        { type: "street", label: "喋血街头", icon: "⚔️", scene: "combat" }
      ]
    },
    {
      tier: 4,
      y: 258,
      anchors: [392, 892],
      jitterX: 116,
      jitterY: 22,
      minGap: 250,
      templates: [
        { type: "rest", label: "破庙", icon: "🔥", scene: "rest" },
        { type: "shop", label: "黑市", icon: "🏪", scene: "shop" }
      ]
    },
    {
      tier: 5,
      y: 176,
      anchors: [640],
      jitterX: 0,
      jitterY: 0,
      minGap: 0,
      templates: [
        { type: "gate", label: "关卡", icon: "👝", scene: "combat" }
      ]
    }
  ];
  var MAP_BACKGROUND_TEXTURE_PATH = "assets/ui/map_jiaotu_yidao_background_gpt4ovip_01.png";
  var MAP_NODE_SEAL_TEXTURE_PATH = "assets/ui/map_node_seal_texture_gpt4ovip_01.png";

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getNodeGlyphByType(type) {
    if (type === "elite") {
      return "\u51f6";
    }
    if (type === "gate") {
      return "\u5173";
    }
    if (type === "rest") {
      return "\u5e99";
    }
    if (type === "shop") {
      return "\u5e02";
    }
    if (type === "event") {
      return "\u9047";
    }
    if (type === "nemesis") {
      return "\u4ec7";
    }
    return "\u6218";
  }

  function pushUniqueValue(list, value) {
    if (list.indexOf(value) === -1) {
      list.push(value);
    }
    return list;
  }

  function buildRouteSeed(actNumber, previousMap) {
    var prior = previousMap || {};
    var safeAct = Math.max(1, Number(actNumber) || 1);

    if (!prior.completed && Number(prior.actNumber) === safeAct && typeof prior.routeSeed === "number") {
      return prior.routeSeed >>> 0;
    }

    if (typeof prior.nextRouteSeed === "number") {
      return prior.nextRouteSeed >>> 0;
    }

    return (((Date.now() >>> 0) ^ ((Math.random() * 0xffffffff) >>> 0) ^ ((safeAct * 2654435761) >>> 0)) >>> 0);
  }

  function createNode(id, tier, x, y, type, label, icon, scene, nextIds) {
    var glyph = getNodeGlyphByType(type);
    return {
      id: id,
      tier: tier,
      x: x,
      y: y,
      type: type,
      label: label,
      icon: glyph,
      scene: scene,
      nextIds: nextIds.slice(),
      baseType: type,
      baseLabel: label,
      baseIcon: glyph,
      baseScene: scene,
      nemesisEntryId: null
    };
  }

  function shuffleTemplates(templates, seed) {
    var items = templates.slice();
    var currentSeed = seed >>> 0;
    var i = 0;
    var swapIndex = 0;
    var temp = null;

    for (i = items.length - 1; i > 0; i -= 1) {
      currentSeed = nextSeed(currentSeed);
      swapIndex = currentSeed % (i + 1);
      temp = items[i];
      items[i] = items[swapIndex];
      items[swapIndex] = temp;
    }

    return {
      items: items,
      nextSeed: currentSeed
    };
  }

  function normalizeTierPositions(points, minX, maxX, minGap) {
    var sorted = points.slice().sort(function (left, right) {
      return left.x - right.x;
    });
    var overflow = 0;
    var underflow = 0;
    var i = 0;

    if (sorted.length === 0) {
      return sorted;
    }

    sorted[0].x = clamp(sorted[0].x, minX, maxX - minGap * Math.max(0, sorted.length - 1));
    for (i = 1; i < sorted.length; i += 1) {
      if (sorted[i].x - sorted[i - 1].x < minGap) {
        sorted[i].x = sorted[i - 1].x + minGap;
      }
    }

    overflow = sorted[sorted.length - 1].x - maxX;
    if (overflow > 0) {
      for (i = sorted.length - 1; i >= 0; i -= 1) {
        sorted[i].x -= overflow;
      }
    }

    underflow = minX - sorted[0].x;
    if (underflow > 0) {
      for (i = 0; i < sorted.length; i += 1) {
        sorted[i].x += underflow;
      }
    }

    return sorted;
  }

  function createTierPositions(blueprint, seed) {
    var currentSeed = seed >>> 0;
    var points = blueprint.anchors.map(function (anchor) {
      var x = anchor;
      var y = blueprint.y;

      if (blueprint.jitterX > 0) {
        currentSeed = nextSeed(currentSeed);
        x += (currentSeed % (blueprint.jitterX * 2 + 1)) - blueprint.jitterX;
      }

      if (blueprint.jitterY > 0) {
        currentSeed = nextSeed(currentSeed);
        y += (currentSeed % (blueprint.jitterY * 2 + 1)) - blueprint.jitterY;
      }

      return { x: x, y: y };
    });

    return {
      positions: normalizeTierPositions(points, 170, 1110, blueprint.minGap),
      nextSeed: currentSeed
    };
  }

  function findNearestNodeIndex(nodes, targetX) {
    var nearestIndex = 0;
    var nearestDistance = Infinity;
    var i = 0;

    for (i = 0; i < nodes.length; i += 1) {
      var distance = Math.abs(nodes[i].x - targetX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  function pickAlternateTarget(nextTier, sourceNode, takenIds) {
    var candidates = nextTier.slice().sort(function (left, right) {
      return Math.abs(left.x - sourceNode.x) - Math.abs(right.x - sourceNode.x);
    });
    var i = 0;

    for (i = 0; i < candidates.length; i += 1) {
      if (takenIds.indexOf(candidates[i].id) === -1) {
        return candidates[i];
      }
    }

    return null;
  }

  function buildTierConnections(tiers, seed) {
    var currentSeed = seed >>> 0;
    var edgeMap = {};
    var tierIndex = 0;
    var routeIndex = 0;
    var sourceIndex = 0;
    var driftRoll = 0;
    var targetIndex = 0;

    tiers.forEach(function (tierNodes) {
      tierNodes.forEach(function (node) {
        edgeMap[node.id] = [];
      });
    });

    for (routeIndex = 0; routeIndex < tiers[0].length; routeIndex += 1) {
      sourceIndex = routeIndex;

      for (tierIndex = 0; tierIndex < tiers.length - 1; tierIndex += 1) {
        currentSeed = nextSeed(currentSeed);
        driftRoll = currentSeed % 100;
        targetIndex = clamp(
          sourceIndex +
          (driftRoll < 58 ? 0 : (driftRoll < 79 ? -1 : 1)),
          0,
          tiers[tierIndex + 1].length - 1
        );

        pushUniqueValue(edgeMap[tiers[tierIndex][Math.min(sourceIndex, tiers[tierIndex].length - 1)].id], tiers[tierIndex + 1][targetIndex].id);
        sourceIndex = targetIndex;
      }
    }

    for (tierIndex = 0; tierIndex < tiers.length - 1; tierIndex += 1) {
      var previousTier = tiers[tierIndex];
      var nextTier = tiers[tierIndex + 1];
      var incomingMap = {};

      previousTier.forEach(function (node) {
        if (edgeMap[node.id].length === 0) {
          pushUniqueValue(edgeMap[node.id], nextTier[findNearestNodeIndex(nextTier, node.x)].id);
        }
      });

      previousTier.forEach(function (node) {
        edgeMap[node.id].forEach(function (targetId) {
          incomingMap[targetId] = true;
        });
      });

      nextTier.forEach(function (node) {
        var sourceNode = null;
        if (!incomingMap[node.id]) {
          sourceNode = previousTier[findNearestNodeIndex(previousTier, node.x)];
          pushUniqueValue(edgeMap[sourceNode.id], node.id);
        }
      });

      previousTier.forEach(function (node) {
        var alternateTarget = null;

        currentSeed = nextSeed(currentSeed);
        if (edgeMap[node.id].length >= 2 || currentSeed % 100 >= 38) {
          return;
        }

        alternateTarget = pickAlternateTarget(nextTier, node, edgeMap[node.id]);
        if (alternateTarget) {
          pushUniqueValue(edgeMap[node.id], alternateTarget.id);
        }
      });
    }

    return {
      edgeMap: edgeMap,
      nextSeed: currentSeed
    };
  }

  function createNodes(seed) {
    var currentSeed = (seed || 1900) >>> 0;
    var allNodes = [];
    var tierNodes = [];
    var nextNodeNumber = 1;
    var tierIndex = 0;
    var positionResult = null;
    var templateResult = null;
    var connectionResult = null;

    for (tierIndex = 0; tierIndex < TIER_BLUEPRINTS.length; tierIndex += 1) {
      positionResult = createTierPositions(TIER_BLUEPRINTS[tierIndex], currentSeed);
      currentSeed = positionResult.nextSeed;
      templateResult = shuffleTemplates(TIER_BLUEPRINTS[tierIndex].templates, currentSeed);
      currentSeed = templateResult.nextSeed;

      tierNodes[tierIndex] = positionResult.positions.map(function (point, index) {
        var template = templateResult.items[index];
        var node = createNode(
          "node_" + nextNodeNumber,
          TIER_BLUEPRINTS[tierIndex].tier,
          point.x,
          point.y,
          template.type,
          template.label,
          template.icon,
          template.scene,
          []
        );

        nextNodeNumber += 1;
        return node;
      });

      allNodes = allNodes.concat(tierNodes[tierIndex]);
    }

    connectionResult = buildTierConnections(tierNodes, currentSeed);
    currentSeed = connectionResult.nextSeed;
    allNodes.forEach(function (node) {
      node.nextIds = connectionResult.edgeMap[node.id].slice();
    });

    return {
      nodes: allNodes,
      nextSeed: currentSeed
    };
  }

  function getActCount() {
    if (G.enemies && typeof G.enemies.getActCount === "function") {
      return G.enemies.getActCount();
    }

    return Object.keys(DEFAULT_ACT_META).length;
  }

  function getActMeta(actNumber) {
    var safeNumber = Math.max(1, Math.min(getActCount(), Number(actNumber) || 1));

    if (G.enemies && typeof G.enemies.getActMeta === "function") {
      return G.enemies.getActMeta(safeNumber);
    }

    return cloneState(DEFAULT_ACT_META[safeNumber] || DEFAULT_ACT_META[1]);
  }

  function getCurrentActNumber(state) {
    if (G.enemies && typeof G.enemies.getActNumber === "function") {
      return G.enemies.getActNumber(state);
    }

    return Math.max(1, Math.min(getActCount(), state && state.map ? Number(state.map.actNumber) || 1 : 1));
  }

  function buildActEnterNote(actMeta) {
    if (!actMeta || actMeta.number <= 1) {
      return "选择可到达的下一个节点。";
    }

    return "已踏入【" + actMeta.title + "】。从可到达节点继续突围。";
  }

  function pushUnique(list, value) {
    var nextList = Array.isArray(list) ? list.slice() : [];

    if (nextList.indexOf(value) === -1) {
      nextList.push(value);
    }

    return nextList;
  }

  function buildMapStateForAct(actNumber, previousMap) {
    var actMeta = getActMeta(actNumber);
    var prior = previousMap || {};
    var routeSeed = buildRouteSeed(actMeta.number, prior);
    var generated = createNodes(routeSeed);

    return {
      actNumber: actMeta.number,
      actCount: getActCount(),
      actTitle: actMeta.title,
      subtitle: actMeta.mapSubtitle,
      routeSeed: routeSeed,
      nextRouteSeed: generated.nextSeed,
      nodes: generated.nodes,
      reachableNodeIds: ["node_1", "node_2", "node_3"],
      visitedNodeIds: [],
      routeHistory: Array.isArray(prior.routeHistory) ? prior.routeHistory.slice() : [],
      currentNodeId: null,
      note: buildActEnterNote(actMeta),
      lastRewardChoice: prior.lastRewardChoice || null,
      lastRewardRelicChoice: prior.lastRewardRelicChoice || null,
      nemesisAssignments: [],
      nemesisNodeId: null,
      nemesisEntryId: null,
      clearedActs: Array.isArray(prior.clearedActs) ? prior.clearedActs.slice() : [],
      completed: false
    };
  }

  function buildInitialMapState() {
    return buildMapStateForAct(1);
  }

  function buildCompletedMapState(previousMap, note) {
    var prior = previousMap || {};
    var nodes = Array.isArray(prior.nodes) && prior.nodes.length === 12 ?
      cloneState(prior.nodes) :
      createNodes(buildRouteSeed(getActCount(), prior)).nodes;

    return {
      actNumber: getActCount(),
      actCount: getActCount(),
      actTitle: "五卷已破",
      subtitle: "五卷已经打通，点击任意位置查看终局簿。",
      routeSeed: typeof prior.routeSeed === "number" ? prior.routeSeed : null,
      nextRouteSeed: typeof prior.nextRouteSeed === "number" ? prior.nextRouteSeed : null,
      nodes: nodes,
      layoutVersion: prior.nodes && prior.nodes.length === 12 ? prior.layoutVersion || 1 : 1,
      reachableNodeIds: [],
      visitedNodeIds: Array.isArray(prior.visitedNodeIds) ? prior.visitedNodeIds.slice() : [],
      routeHistory: Array.isArray(prior.routeHistory) ? prior.routeHistory.slice() : [],
      currentNodeId: "node_12",
      note: note || "你已经穿过五卷残图。",
      lastRewardChoice: prior.lastRewardChoice || null,
      lastRewardRelicChoice: prior.lastRewardRelicChoice || null,
      nemesisAssignments: [],
      nemesisNodeId: null,
      nemesisEntryId: null,
      clearedActs: Array.isArray(prior.clearedActs) ? prior.clearedActs.slice() : [],
      completed: true
    };
  }

  function restoreNode(node) {
    node.type = node.baseType || node.type;
    node.label = node.baseLabel || node.label;
    node.icon = node.baseIcon || node.icon;
    node.scene = node.baseScene || node.scene;
    node.nemesisEntryId = null;
    return node;
  }

  function applyNemesisNode(node, entry) {
    if (!node || !entry) {
      return node;
    }

    node.type = "nemesis";
    node.label = "宿敌复仇";
    node.icon = getNodeGlyphByType("nemesis");
    node.scene = "nemesis";
    node.nemesisEntryId = entry.id;
    return node;
  }

  function getNodeById(state, nodeId) {
    var i = 0;

    for (i = 0; i < state.map.nodes.length; i += 1) {
      if (state.map.nodes[i].id === nodeId) {
        return state.map.nodes[i];
      }
    }

    return null;
  }

  function getFutureReachableNodeIds(mapState) {
    var map = mapState || {};
    var queue = Array.isArray(map.reachableNodeIds) ? map.reachableNodeIds.slice() : [];
    var reachableIds = [];
    var nodesById = {};
    var index = 0;
    var currentId = null;
    var currentNode = null;

    (map.nodes || []).forEach(function (node) {
      nodesById[node.id] = node;
    });

    while (index < queue.length) {
      currentId = queue[index];
      index += 1;

      if (reachableIds.indexOf(currentId) !== -1) {
        continue;
      }

      reachableIds.push(currentId);
      currentNode = nodesById[currentId];
      if (currentNode && Array.isArray(currentNode.nextIds)) {
        currentNode.nextIds.forEach(function (nextId) {
          if (queue.indexOf(nextId) === -1) {
            queue.push(nextId);
          }
        });
      }
    }

    return reachableIds;
  }

  function getNemesisPool(state) {
    if (G.nemesis && typeof G.nemesis.getPoolSnapshot === "function") {
      return G.nemesis.getPoolSnapshot(state);
    }

    return [];
  }

  function applyNemesisAmbushNode(node, entry) {
    if (!node || !entry) {
      return node;
    }

    node.type = "nemesis";
    node.label = "旧仇追迹";
    node.icon = getNodeGlyphByType("nemesis");
    node.scene = "nemesis";
    node.nemesisEntryId = entry.id;
    return node;
  }

  function getDesiredNemesisNodeCount(state) {
    if (G.relicRuntime && typeof G.relicRuntime.getNemesisAmbushCount === "function") {
      return Math.max(1, Number(G.relicRuntime.getNemesisAmbushCount(state)) || 1);
    }

    return 1;
  }

  function normalizeNemesisAssignments(mapState) {
    var map = mapState || {};
    var assignments = Array.isArray(map.nemesisAssignments) ? map.nemesisAssignments.slice() : [];
    var seenNodeIds = [];

    if (assignments.length === 0 && map.nemesisNodeId && map.nemesisEntryId) {
      assignments = [{
        nodeId: map.nemesisNodeId,
        entryId: map.nemesisEntryId
      }];
    }

    return assignments.filter(function (assignment) {
      var valid = !!assignment &&
        typeof assignment.nodeId === "string" &&
        typeof assignment.entryId === "string" &&
        seenNodeIds.indexOf(assignment.nodeId) === -1;

      if (valid) {
        seenNodeIds.push(assignment.nodeId);
      }

      return valid;
    }).map(function (assignment) {
      return {
        nodeId: assignment.nodeId,
        entryId: assignment.entryId
      };
    });
  }

  function setNemesisAssignments(mapState, assignments) {
    var nextAssignments = Array.isArray(assignments) ? assignments.map(function (assignment) {
      return {
        nodeId: assignment.nodeId,
        entryId: assignment.entryId
      };
    }) : [];

    mapState.nemesisAssignments = nextAssignments;
    mapState.nemesisNodeId = nextAssignments.length > 0 ? nextAssignments[0].nodeId : null;
    mapState.nemesisEntryId = nextAssignments.length > 0 ? nextAssignments[0].entryId : null;
  }

  function pickNemesisEntries(pool, startIndex, excludedEntryIds, count) {
    var picked = [];
    var seenEntryIds = Array.isArray(excludedEntryIds) ? excludedEntryIds.slice() : [];
    var offset = Math.max(0, Number(startIndex) || 0);
    var i = 0;
    var entry = null;

    for (i = 0; i < pool.length && picked.length < count; i += 1) {
      entry = pool[(offset + i) % pool.length];
      if (!entry || seenEntryIds.indexOf(entry.id) !== -1) {
        continue;
      }
      seenEntryIds.push(entry.id);
      picked.push(entry);
    }

    return picked;
  }

  function sortNemesisCandidates(left, right) {
    var leftElite = left.baseType === "elite" ? 1 : 0;
    var rightElite = right.baseType === "elite" ? 1 : 0;

    if (left.tier !== right.tier) {
      return right.tier - left.tier;
    }

    if (leftElite !== rightElite) {
      return rightElite - leftElite;
    }

    return left.x - right.x;
  }

  function assignNemesisNode(state) {
    var nextState = cloneState(state);
    var pool = getNemesisPool(nextState);
    var visitedCount = nextState.map.visitedNodeIds.length;
    var actNumber = getCurrentActNumber(nextState);
    var futureReachableIds = getFutureReachableNodeIds(nextState.map);
    var desiredCount = Math.min(getDesiredNemesisNodeCount(nextState), pool.length || 0);
    var existingAssignments = normalizeNemesisAssignments(nextState.map);
    var assignments = [];
    var assignedNodeIds = [];
    var assignedEntryIds = [];
    var candidates = [];
    var refillEntries = [];
    var assignedNode = null;
    var assignedEntry = null;
    var i = 0;

    nextState.map.nodes.forEach(function (node) {
      restoreNode(node);
    });

    if (nextState.map.completed || actNumber < 2 || pool.length === 0) {
      setNemesisAssignments(nextState.map, []);
      return nextState;
    }

    existingAssignments.forEach(function (assignment) {
      if (assignments.length >= desiredCount) {
        return;
      }

      assignedNode = getNodeById(nextState, assignment.nodeId);
      assignedEntry = G.nemesis && typeof G.nemesis.getEntryById === "function" ?
        G.nemesis.getEntryById(nextState, assignment.entryId) :
        null;

      if (!assignedNode || !assignedEntry) {
        return;
      }

      if (futureReachableIds.indexOf(assignedNode.id) === -1) {
        return;
      }

      if (assignedNodeIds.indexOf(assignedNode.id) !== -1 || assignedEntryIds.indexOf(assignedEntry.id) !== -1) {
        return;
      }

      applyNemesisAmbushNode(assignedNode, assignedEntry);
      assignments.push({
        nodeId: assignedNode.id,
        entryId: assignedEntry.id
      });
      assignedNodeIds.push(assignedNode.id);
      assignedEntryIds.push(assignedEntry.id);
    });

    candidates = nextState.map.nodes.filter(function (node) {
      return futureReachableIds.indexOf(node.id) !== -1 &&
        node.baseScene === "combat" &&
        node.baseType !== "gate" &&
        assignedNodeIds.indexOf(node.id) === -1 &&
        node.tier >= 3;
    });

    if (candidates.length === 0) {
      candidates = nextState.map.nodes.filter(function (node) {
        return futureReachableIds.indexOf(node.id) !== -1 &&
          node.baseScene === "combat" &&
          node.baseType !== "gate" &&
          assignedNodeIds.indexOf(node.id) === -1;
      });
    }

    if (candidates.length === 0 && assignments.length === 0) {
      setNemesisAssignments(nextState.map, []);
      return nextState;
    }

    candidates.sort(sortNemesisCandidates);
    refillEntries = pickNemesisEntries(
      pool,
      visitedCount + (nextState.nemesis.nextId || 1),
      assignedEntryIds,
      Math.max(0, desiredCount - assignments.length)
    );

    for (i = 0; i < refillEntries.length && i < candidates.length; i += 1) {
      applyNemesisAmbushNode(candidates[i], refillEntries[i]);
      assignments.push({
        nodeId: candidates[i].id,
        entryId: refillEntries[i].id
      });
    }

    setNemesisAssignments(nextState.map, assignments);
    return nextState;
  }

  function fitRouteLabels(map) {
    if (map.layoutVersion === 4) return;
    // Reserve the footer for route advice. Migrate positions only; preserve the
    // old save's seed, edges, identities, visits and reachable choices.
    var centres = { 1: 566, 2: 460, 3: 354, 4: 248, 5: 142 };
    map.nodes.forEach(function (node) {
      var blueprint = TIER_BLUEPRINTS[node.tier - 1];
      var oldY = map.layoutVersion === 2 ? 176 + (node.y - 176) / 0.84 : node.y;
      var sourceY = map.layoutVersion === 3 ? {1:560,2:455,3:350,4:245,5:150}[node.tier] : blueprint.y;
      var jitter = blueprint.jitterY ? Math.max(-1, Math.min(1, (oldY - sourceY) / (map.layoutVersion === 3 ? 6 : blueprint.jitterY))) * 6 : 0;
      node.x = 360 + (node.x - 64) * 0.72;
      node.y = centres[node.tier] + jitter;
    });
    map.layoutVersion = 4;
  }

  function ensureMapState(state) {
    var nextState = cloneState(state);
    var actMeta = null;
    var safeActNumber = 1;

    nextState.map = nextState.map || {};
    safeActNumber = getCurrentActNumber(nextState);
    actMeta = getActMeta(safeActNumber);

    if (nextState.map.completed) {
      if (!Array.isArray(nextState.map.nodes) || nextState.map.nodes.length !== 12) {
        nextState.map = buildCompletedMapState(nextState.map, nextState.map.note);
      }
      nextState.map.actNumber = getActCount();
      nextState.map.actCount = getActCount();
      nextState.map.reachableNodeIds = [];
      nextState.map.nemesisAssignments = [];
      nextState.map.nemesisNodeId = null;
      nextState.map.nemesisEntryId = null;
      fitRouteLabels(nextState.map);
      return nextState;
    }

    if (!nextState.map.nodes || nextState.map.nodes.length !== 12 || !nextState.map.nodes[0].baseType) {
      nextState.map = buildMapStateForAct(safeActNumber, nextState.map);
    }

    nextState.map.actNumber = actMeta.number;
    nextState.map.actCount = getActCount();
    nextState.map.actTitle = actMeta.title;
    nextState.map.subtitle = actMeta.mapSubtitle;
    nextState.map.completed = false;
    nextState.map.clearedActs = Array.isArray(nextState.map.clearedActs) ? nextState.map.clearedActs.slice() : [];
    nextState.map.routeHistory = Array.isArray(nextState.map.routeHistory) ? nextState.map.routeHistory.slice() : [];

    if (!Array.isArray(nextState.map.reachableNodeIds) || nextState.map.reachableNodeIds.length === 0) {
      nextState.map.reachableNodeIds = nextState.map.currentNodeId ? [] : ["node_1", "node_2", "node_3"];
    }

    if (!Array.isArray(nextState.map.visitedNodeIds)) {
      nextState.map.visitedNodeIds = [];
    }

    nextState = assignNemesisNode(nextState);
    fitRouteLabels(nextState.map);
    return nextState;
  }

  function prepareState(state) {
    return ensureMapState(state);
  }

  function advanceAfterGate(state, rewardNote) {
    var nextState = cloneState(state);
    var currentActNumber = getCurrentActNumber(nextState);
    var currentActMeta = getActMeta(currentActNumber);
    var nextActMeta = null;
    var note = rewardNote || "你收起战利品，继续沿路突围。";

    nextState.map = nextState.map || buildInitialMapState();
    nextState.map.clearedActs = pushUnique(nextState.map.clearedActs, currentActNumber);
    if (G.journeyNarrative) {
      G.journeyNarrative.crossGate(nextState, currentActNumber);
      note = G.journeyNarrative.transition(nextState, currentActNumber) + " " + note;
    }

    if (currentActNumber >= getActCount()) {
      nextState.map = buildCompletedMapState(
        nextState.map,
        note + " 【" + currentActMeta.title + "】已破，五卷暂告打通。"
      );
      nextState.scene = "map";
      if (G.journeyNarrative) G.journeyNarrative.finish(nextState, "victory");
      if (G.journeyPassage) G.journeyPassage.open(nextState, currentActNumber);
      return nextState;
    }

    nextActMeta = getActMeta(currentActNumber + 1);
    nextState.map = buildMapStateForAct(currentActNumber + 1, nextState.map);
    nextState.map.clearedActs = pushUnique(nextState.map.clearedActs, currentActNumber);
    nextState.map.note = note + " 【" + currentActMeta.title + "】已破，转入【" + nextActMeta.title + "】。";
    nextState.scene = "map";
    if (G.journeyPassage) G.journeyPassage.open(nextState, currentActNumber);
    return ensureMapState(nextState);
  }

  function isInsideNode(point, node) {
    var dx = point.x - node.x;
    var dy = point.y - node.y;
    if (window.KGAME_MOBILE || point.type === 'touch' || G.main.getPointer().type === 'touch') {
      var scale = G.main.getCanvas().getBoundingClientRect().width / 1280;
      // Include the visible label and a 44 CSS px minimum without enlarging art.
      return Math.abs(dx) <= Math.max(28, 22 / scale) && dy >= -22 / scale && dy <= 40 + 18 / scale;
    }
    return Math.sqrt(dx * dx + dy * dy) <= 28;
  }

  function markNodeChosen(nextState, node) {
    nextState.map.previewNodeId = null;
    if (nextState.map.visitedNodeIds.indexOf(node.id) === -1) {
      nextState.map.visitedNodeIds.push(node.id);
      nextState.map.routeHistory = (nextState.map.routeHistory || []).concat({
        act: nextState.map.actNumber, nodeId: node.id, type: node.type,
        label: node.label, entryId: node.nemesisEntryId || null
      });
    }
    nextState.map.currentNodeId = node.id;
    nextState.map.reachableNodeIds = node.nextIds.slice();
    nextState.map.note = "已选择【" + node.label + "】。";
  }

  function enterNodeScene(state, node) {
    var nextState = cloneState(state);

    markNodeChosen(nextState, node);

    if (node.scene === "combat") {
      nextState.combat = nextState.combat || {};
      nextState.combat.seeded = false;
      nextState.combat.nemesisEntryId = null;
      nextState.combat.ui = { overlay: null };
      nextState.scene = "combat";
      return nextState;
    }

    if (node.scene === "nemesis") {
      nextState.combat = nextState.combat || {};
      nextState.combat.seeded = false;
      nextState.combat.nemesisEntryId = node.nemesisEntryId;
      nextState.combat.ui = { overlay: null };
      nextState.nemesisIntro = {
        entryId: node.nemesisEntryId,
        sourceNodeId: node.id
      };
      nextState.scene = "nemesis";
      nextState.map.note = "旧相识拦路，先听他把话说完。";
      return nextState;
    }

    nextState.scene = node.scene;
    return nextState;
  }

  function processClicks(state) {
    var nextState = state;
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;
    var i = 0;
    var node = null;

    if (clicks.length === 0) {
      return state;
    }

    if (G.journeyPassage && G.journeyPassage.active(nextState)) {
      if (G.render.journeyOpening.passageWaiting(nextState) || G.render.journeyMotion?.debug().transition) return nextState;
      var passageButton = G.render.journeyOpening.passageLayout().next;
      return clicks.some(function (point) { return point.x >= passageButton.x && point.x <= passageButton.x + passageButton.width && point.y >= passageButton.y && point.y <= passageButton.y + passageButton.height; }) ? G.journeyPassage.finish(nextState) : nextState;
    }

    if (nextState.map.completed) {
      if (G.runReport && typeof G.runReport.enter === "function") {
        return G.runReport.enter(nextState, "victory");
      }
      return nextState;
    }

    while (clicks.length > 0) {
      click = clicks.shift();
      node = null;

      // On touch there is no hover. Inspect first, then deliberately commit via
      // a separate control; repeated taps never irreversibly choose a route.
      var preview = getNodeById(nextState, nextState.map.previewNodeId);
      var confirm = getPreviewConfirmBox();
      if (preview && isInsideBox(click, confirm) && nextState.map.reachableNodeIds.indexOf(preview.id) !== -1) {
        return enterNodeScene(nextState, preview);
      }

      var candidates = nextState.map.nodes.filter(function (n) { return isInsideNode(click, n); });
      // Enlarged touch regions can meet on adjacent tiers. Prefer the nearest
      // visible icon or label, rather than the first node in storage order.
      var scale = G.main.getCanvas().getBoundingClientRect().width / 1280;
      var touch = window.KGAME_MOBILE || click.type === 'touch' || G.main.getPointer().type === 'touch';
      function distance(n) {
        var dx = click.x - n.x, dy = click.y - n.y;
        return touch ? Math.min(Math.hypot(dx, dy), Math.hypot(dx, dy - 34 - 9 / scale)) : Math.hypot(dx, dy);
      }
      candidates.sort(function (a, b) { return distance(a) - distance(b); });
      node = candidates[0] || null;

      if (!node) {
        continue;
      }

      if (window.KGAME_MOBILE || G.main.getPointer().type === "touch") {
        nextState = cloneState(nextState);
        nextState.map.previewNodeId = node.id;
        return nextState;
      }

      if (nextState.map.reachableNodeIds.indexOf(node.id) === -1) {
        nextState.map.note = "这个节点暂时不可到达。";
        continue;
      }

      return enterNodeScene(nextState, node);
    }

    return nextState;
  }

  function getPreviewConfirmBox() { return window.KGAME_MOBILE?{x:46,y:530,width:256,height:72}:{x:48,y:524,width:248,height:46}; }
  function isInsideBox(p,b) { return G.render.canvasUtils.containsAction(p,b); }

  function drawConnection(ctx, fromNode, toNode) {
    ctx.save();
    ctx.strokeStyle = "rgba(196, 173, 139, 0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();
    ctx.restore();
  }

  function getNodeSealPalette(node, visited, reachable, current) {
    var palette = {
      fill: "#1a1a1a",
      stroke: "#5c4033",
      text: "#d7d0c4",
      label: "#cdbfae",
      halo: "rgba(240, 209, 162, 0.1)"
    };

    if (visited) {
      palette.fill = "rgba(58, 26, 28, 0.96)";
      palette.stroke = "#8b694c";
      palette.text = "#f1e6d3";
      palette.label = "#e0d1bd";
      palette.halo = "rgba(216, 177, 124, 0.1)";
    } else if (reachable) {
      palette.fill = "#c8bfa6";
      palette.stroke = "#5c4033";
      palette.text = "#6f1f23";
      palette.label = "#efe2ce";
      palette.halo = "rgba(240, 209, 162, 0.16)";
    }

    if (node.type === "nemesis") {
      palette.fill = "#4a1414";
      palette.stroke = "#c89a61";
      palette.text = "#f3eadc";
      palette.label = "#e7c892";
      palette.halo = "rgba(200, 154, 97, 0.18)";
    }

    if (current) {
      palette.stroke = "#f0d1a2";
      palette.halo = "rgba(240, 209, 162, 0.22)";
    }

    return palette;
  }

  function shouldUseTexturedSeal(nodeType) {
    return nodeType === "street" ||
      nodeType === "event" ||
      nodeType === "elite" ||
      nodeType === "nemesis";
  }

  function drawNodeSeal(ctx, x, y, radius, glyph, palette, options) {
    var opts = options || {};
    var ringRadius = radius + 8 + (opts.pulse || 0) * 3;
    var bodyFont = G.render.ui.getBodyFontFamily ?
      G.render.ui.getBodyFontFamily() :
      "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var textured = false;
    var useTexturedSeal = shouldUseTexturedSeal(opts.nodeType);
    var glyphColor = palette.text;

    if (!opts.skipHalo) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = palette.halo;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (
      useTexturedSeal &&
      G.render.assets &&
      typeof G.render.assets.drawImageCover === "function"
    ) {
      textured = G.render.assets.drawImageCover(
        ctx,
        MAP_NODE_SEAL_TEXTURE_PATH,
        x - radius,
        y - radius,
        radius * 2,
        radius * 2,
        {
          focusX: 0.5,
          focusY: 0.5
        }
      );
    }

    if (!textured) {
      ctx.fillStyle = palette.fill;
      ctx.fillRect(x - radius - 1, y - radius - 1, radius * 2 + 2, radius * 2 + 2);
    } else {
      ctx.fillStyle = opts.current ? "rgba(255, 244, 230, 0.05)" : "rgba(6, 6, 6, 0.08)";
      ctx.fillRect(x - radius - 1, y - radius - 1, radius * 2 + 2, radius * 2 + 2);
      glyphColor = opts.current ? "#fff3de" : "#f0e7da";
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = textured ? (opts.current ? "#f0d1a2" : "rgba(53, 34, 29, 0.78)") : palette.stroke;
    ctx.lineWidth = opts.lineWidth || 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (opts.current) {
      ctx.strokeStyle = "rgba(255, 242, 205, " + (0.44 + (opts.pulse || 0) * 0.16) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 7 + (opts.pulse || 0) * 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    G.render.ui.drawLabel(ctx, glyph, x, y + 1, {
      size: opts.glyphSize || 18,
      weight: "800",
      align: "center",
      color: glyphColor,
      shadow: false,
      fontFamily: bodyFont
    });
  }

  function drawNode(ctx, node, state) {
    var visited = state.map.visitedNodeIds.indexOf(node.id) !== -1;
    var reachable = state.map.reachableNodeIds.indexOf(node.id) !== -1;
    var current = state.map.currentNodeId === node.id;
    var palette = getNodeSealPalette(node, visited, reachable, current);
    var intelLabel = "";

    drawNodeSeal(ctx, node.x, node.y, 28, getNodeGlyphByType(node.type), palette, {
      current: current,
      nodeType: node.type,
      skipHalo: true,
      lineWidth: current ? 4 : 3
    });
    G.render.ui.drawLabel(ctx, node.label, node.x, node.y + 48, {
      size: 14,
      align: "center",
      color: palette.label,
      shadow: false
    });

    if (
      node.type === "elite" &&
      G.relicRuntime &&
      typeof G.relicRuntime.shouldShowEliteIntel === "function" &&
      G.relicRuntime.shouldShowEliteIntel(state)
    ) {
      intelLabel = getEliteIntelLabel(state, node);
      if (intelLabel) {
        G.render.ui.drawLabel(ctx, intelLabel, node.x, node.y + 66, {
          size: 12,
          align: "center",
          color: "#e7d3aa",
          shadow: false
        });
      }
    }

    if (node.type === "nemesis") {
      G.render.ui.drawLabel(ctx, "此路有人等你", node.x, node.y + 66, {
        size: 12,
        align: "center",
        color: "#f3e8d8"
      });
    }
  }

  function renderLegend(ctx) {
    var legend = [
      { type: "street", label: "喋血街头" },
      { type: "elite", label: "强敌" },
      { type: "gate", label: "关卡" },
      { type: "rest", label: "破庙" },
      { type: "shop", label: "黑市" },
      { type: "event", label: "奇遇" },
      { type: "nemesis", label: "旧仇追迹" }
    ];
    var i = 0;
    var item = null;
    var palette = null;
    var rowY = 0;

    G.render.ui.drawPanel(ctx, 20, 58, 188, 220, {
      fill: "rgba(20, 20, 20, 0.85)",
      stroke: "#5c4033",
      lineWidth: 2,
      surface: "dossier-dark"
    });
    G.render.ui.drawLabel(ctx, "节点图例", 108, 82, {
      size: 19,
      align: "center",
      color: "#f3e8d8",
      shadow: false
    });

    for (i = 0; i < legend.length; i += 1) {
      item = legend[i];
      rowY = 114 + i * 24;
      palette = getNodeSealPalette({ type: item.type }, false, item.type === "street" || item.type === "event", false);
      drawNodeSeal(ctx, 48, rowY + 8, 11, getNodeGlyphByType(item.type), palette, {
        skipHalo: true,
        nodeType: item.type,
        lineWidth: 2,
        glyphSize: 11
      });
      G.render.ui.drawLabel(ctx, item.label, 68, rowY + 8, {
        size: 14,
        color: item.type === "nemesis" ? "#e3c285" : "#d8cdbd",
        shadow: false
      });
    }
  }

  function getNodePulse(state, node, offset) {
    var time = (state && state.timeMs ? state.timeMs : 0) / 1000;
    return 0.5 + 0.5 * Math.sin(time * 3.4 + node.tier * 0.85 + node.x * 0.012 + (offset || 0));
  }

  function renderMapBackdrop(ctx) {
    var texturedBackground = false;
    var gradient = null;
    var haze = null;
    var i = 0;

    if (
      G.render.assets &&
      typeof G.render.assets.drawImageCover === "function"
    ) {
      texturedBackground = G.render.assets.drawImageCover(
        ctx,
        MAP_BACKGROUND_TEXTURE_PATH,
        0,
        0,
        1280,
        720,
        {
          focusX: 0.5,
          focusY: 0.5
        }
      );
    }

    if (texturedBackground) {
      ctx.save();
      gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, "rgba(90, 58, 29, 0.08)");
      gradient.addColorStop(0.5, "rgba(32, 22, 14, 0.12)");
      gradient.addColorStop(1, "rgba(22, 16, 11, 0.18)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);

      haze = ctx.createRadialGradient(640, 388, 150, 640, 388, 560);
      haze.addColorStop(0, "rgba(255, 240, 216, 0.06)");
      haze.addColorStop(0.65, "rgba(255, 240, 216, 0.02)");
      haze.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.fillStyle = "rgba(20, 12, 8, 0.14)";
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
      return;
    }

    G.render.canvasUtils.clear(ctx, "#151515");

    ctx.save();
    gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "#171314");
    gradient.addColorStop(0.38, "#191516");
    gradient.addColorStop(1, "#100d0e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    haze = ctx.createRadialGradient(640, 420, 120, 640, 420, 520);
    haze.addColorStop(0, "rgba(129, 34, 46, 0.12)");
    haze.addColorStop(0.55, "rgba(129, 34, 46, 0.04)");
    haze.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.strokeStyle = "rgba(255, 244, 231, 0.025)";
    ctx.lineWidth = 1;
    for (i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, 150 + i * 62);
      ctx.lineTo(1280, 150 + i * 62);
      ctx.stroke();
    }
    ctx.restore();
  }

  function hashNodeId(nodeId) {
    var text = String(nodeId || "");
    var hash = 0;
    var i = 0;

    for (i = 0; i < text.length; i += 1) {
      hash = ((hash * 33) + text.charCodeAt(i)) >>> 0;
    }

    return hash >>> 0;
  }

  function seedToUnit(seed) {
    return ((seed >>> 0) / 4294967295) * 2 - 1;
  }

  function getConnectionCurve(state, fromNode, toNode) {
    var dx = toNode.x - fromNode.x;
    var dy = toNode.y - fromNode.y;
    var routeSeed = state && state.map && typeof state.map.routeSeed === "number" ? state.map.routeSeed : 1900;
    var edgeSeed = (routeSeed ^ hashNodeId(fromNode.id) ^ ((hashNodeId(toNode.id) * 2654435761) >>> 0)) >>> 0;
    var primarySwing = 0;
    var secondarySwing = 0;
    var travel = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var bendStrength = 0;
    var signedBend = 0;
    var taper = 0;

    edgeSeed = nextSeed(edgeSeed);
    primarySwing = seedToUnit(edgeSeed);
    edgeSeed = nextSeed(edgeSeed);
    secondarySwing = seedToUnit(edgeSeed);
    bendStrength = clamp(14 + travel * 0.07 + Math.abs(dx) * 0.03, 14, 38);
    if (Math.abs(dx) < 84) {
      bendStrength = clamp(10 + Math.abs(primarySwing) * 14, 10, 24);
    }
    signedBend = primarySwing * bendStrength;
    taper = 0.7 + Math.abs(secondarySwing) * 0.14;

    return {
      control1X: fromNode.x + dx * 0.26 + signedBend,
      control1Y: fromNode.y + dy * 0.28 + dx * 0.035,
      control2X: fromNode.x + dx * 0.74 + signedBend * taper,
      control2Y: fromNode.y + dy * 0.72 - dx * 0.025
    };
  }

  function drawBezierConnection(ctx, fromNode, toNode, controlPoint) {
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.bezierCurveTo(
      controlPoint.control1X,
      controlPoint.control1Y,
      controlPoint.control2X,
      controlPoint.control2Y,
      toNode.x,
      toNode.y
    );
  }

  function getBezierPoint(fromNode, toNode, controlPoint, t) {
    var safeT = clamp(t, 0, 1);
    var inverse = 1 - safeT;

    return {
      x: inverse * inverse * inverse * fromNode.x +
        3 * inverse * inverse * safeT * controlPoint.control1X +
        3 * inverse * safeT * safeT * controlPoint.control2X +
        safeT * safeT * safeT * toNode.x,
      y: inverse * inverse * inverse * fromNode.y +
        3 * inverse * inverse * safeT * controlPoint.control1Y +
        3 * inverse * safeT * safeT * controlPoint.control2Y +
        safeT * safeT * safeT * toNode.y
    };
  }

  function drawConnectionAnimated(ctx, fromNode, toNode, state) {
    var visitedIds = state.map.visitedNodeIds || [];
    var currentNodeId = state.map.currentNodeId || null;
    var reachableIds = state.map.reachableNodeIds || [];
    var traversed = visitedIds.indexOf(fromNode.id) !== -1 && visitedIds.indexOf(toNode.id) !== -1;
    var frontier = currentNodeId ?
      (fromNode.id === currentNodeId && reachableIds.indexOf(toNode.id) !== -1) :
      reachableIds.indexOf(fromNode.id) !== -1;
    var pulse = getNodePulse(state, fromNode, toNode.y * 0.003);
    var travel = (((state.timeMs || 0) / 1000) * 0.72 + fromNode.tier * 0.11 + toNode.x * 0.0004) % 1;
    var curve = getConnectionCurve(state, fromNode, toNode);
    var dot = getBezierPoint(fromNode, toNode, curve, travel);

    ctx.save();
    ctx.strokeStyle = traversed ? "rgba(225, 183, 113, 0.34)" : "rgba(196, 173, 139, 0.18)";
    ctx.lineWidth = traversed ? 4 : 3;
    drawBezierConnection(ctx, fromNode, toNode, curve);
    ctx.stroke();

    if (frontier) {
      ctx.strokeStyle = "rgba(240, 209, 162, " + (0.2 + pulse * 0.22) + ")";
      ctx.lineWidth = 6;
      drawBezierConnection(ctx, fromNode, toNode, curve);
      ctx.stroke();

      ctx.setLineDash([18, 30]);
      ctx.lineDashOffset = -((state.timeMs || 0) / 50);
      ctx.strokeStyle = "rgba(255, 241, 202, 0.52)";
      ctx.lineWidth = 2;
      drawBezierConnection(ctx, fromNode, toNode, curve);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(255, 240, 206, " + (0.38 + pulse * 0.22) + ")";
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4 + pulse * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawNodeAnimated(ctx, node, state) {
    var visited = state.map.visitedNodeIds.indexOf(node.id) !== -1;
    var reachable = state.map.reachableNodeIds.indexOf(node.id) !== -1;
    var current = state.map.currentNodeId === node.id;
    var pulse = getNodePulse(state, node, current ? 0.8 : 0);
    var radius = 28 + (reachable ? pulse * 1.8 : 0) + (current ? 1.4 : 0);
    var palette = getNodeSealPalette(node, visited, reachable, current);
    var intelLabel = "";

    drawNodeSeal(ctx, node.x, node.y, radius, getNodeGlyphByType(node.type), palette, {
      current: current,
      pulse: pulse,
      nodeType: node.type,
      lineWidth: current ? 4 : 3
    });
    G.render.ui.drawLabel(ctx, node.label, node.x, node.y + 48, {
      size: 14,
      align: "center",
      color: palette.label,
      shadow: false
    });

    if (
      node.type === "elite" &&
      G.relicRuntime &&
      typeof G.relicRuntime.shouldShowEliteIntel === "function" &&
      G.relicRuntime.shouldShowEliteIntel(state)
    ) {
      intelLabel = getEliteIntelLabel(state, node);
      if (intelLabel) {
        G.render.ui.drawLabel(ctx, intelLabel, node.x, node.y + 66, {
          size: 12,
          align: "center",
          color: "#e7d3aa",
          shadow: false
        });
      }
    }

    if (node.type === "nemesis") {
      G.render.ui.drawLabel(ctx, "此路有人等你", node.x, node.y + 66, {
        size: 12,
        align: "center",
        color: "#f3e8d8"
      });
    }
  }

  function summarizeEncounterName(name) {
    var text = String(name || "");

    if (text.indexOf("·") !== -1) {
      text = text.split("·").pop();
    }

    if (text.length > 6) {
      text = text.slice(0, 6);
    }

    return text;
  }

  function getEliteIntelLabel(state, node) {
    var encounter = null;

    if (!G.enemies || typeof G.enemies.buildEncounterForNode !== "function") {
      return "";
    }

    encounter = G.enemies.buildEncounterForNode(state, node);
    return encounter && encounter.name ? summarizeEncounterName(encounter.name) : "";
  }

  G.scenes.map = {
    getPreviewConfirmBox: getPreviewConfirmBox,
    buildStateForAct: buildMapStateForAct,
    advanceAfterGate: advanceAfterGate,
    prepareState: prepareState,

    update: function (state) {
      return processClicks(ensureMapState(state));
    },

    render: function (state, ctx) {
      var i = 0;
      var j = 0;
      var node = null;
      var nextNode = null;

      renderMapBackdrop(ctx);

      G.render.ui.drawPanel(ctx, 332, 18, 616, 130, {
        fill: "rgba(18, 16, 14, 0.48)",
        stroke: "rgba(201, 166, 118, 0.14)",
        lineWidth: 2,
        surface: "combat-overlay"
      });

      G.render.ui.drawLabel(ctx, state.map.actTitle, 640, 54, {
        size: 38,
        align: "center",
        color: "#f0e5d6"
      });
      G.render.ui.drawLabel(ctx, "卷 " + state.map.actNumber + " / " + state.map.actCount, 640, 82, {
        size: 16,
        align: "center",
        color: "#bba891"
      });
      G.render.ui.drawLabel(ctx, state.map.subtitle, 640, 106, {
        size: 17,
        align: "center",
        color: "#cfc4b5"
      });
      G.render.ui.drawLabel(ctx, state.map.note, 640, 138, {
        size: 18,
        align: "center",
        color: "#d8cdbd"
      });
      if (state.map.completed) {
        G.render.ui.drawLabel(ctx, "点击任意位置查看终局簿", 640, 164, {
          size: 15,
          align: "center",
          color: "#e2c388"
        });
      }

      renderLegend(ctx);

      for (i = 0; i < state.map.nodes.length; i += 1) {
        node = state.map.nodes[i];
        for (j = 0; j < node.nextIds.length; j += 1) {
          nextNode = getNodeById(state, node.nextIds[j]);
          if (nextNode) {
            drawConnectionAnimated(ctx, node, nextNode, state);
          }
        }
      }

      for (i = 0; i < state.map.nodes.length; i += 1) {
        drawNodeAnimated(ctx, state.map.nodes[i], state);
      }
    }
  };
})();
