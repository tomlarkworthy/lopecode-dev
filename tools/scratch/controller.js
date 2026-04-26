const _sqk2dq = function _svgEditorController(svgEditor_setStatus,$0,svgEditor_createOverlay,htl,rectAnchorsStable,svgPointFromClient,svgEditor_estimateJacobianForAnchor,renderProbe,svgParameterNames,getCurrentParams,svgEditor_drawOverlay,pseudoInverseStepMxN,svgEditor_commitParams,svgParameterViewElByName,pickAnchor,svgEditor_setOverlayVisible,svgTemplateVariable,svgEditor_computeOverTarget,svgEditor_syncOverlayToTarget,svgEditor_clearOverlay,invalidation) {
    const state = this ?? {};
    const setStatus = patch => svgEditor_setStatus($0, patch);
    const ensureOverlay = () => {
        if (state.overlay)
            return;
        state.overlay = svgEditor_createOverlay(htl);
        document.body.appendChild(state.overlay);
        state.lastTarget = null;
        state.anchors = [];
        state.hover = null;
        state.drags = new Map();
        state.lockedAnchors = new Map();
        state.gestureBaseParams = null;
        state.overTarget = false;
        state.targetRect = null;
        state.rebasing = false;
        const LOCK_WEIGHT = 20;
        const getLockedIdSet = () => new Set(state.lockedAnchors.keys());
        const refreshAnchorsFromTarget = target => {
            state.anchors = rectAnchorsStable(target);
            const hoverId = state.hover?.id;
            state.hover = hoverId ? state.anchors.find(a => a.id === hoverId) ?? null : state.hover;
        };
        const getInvScreenCTM = overlay => {
            try {
                const ctm = overlay.getScreenCTM?.();
                return ctm ? ctm.inverse() : null;
            } catch {
                return null;
            }
        };
        const overlayAnchorsWithActivePointerPositions = () => {
            if (!state.drags.size)
                return state.anchors;
            const overlay = state.overlay;
            const byId = new Map(state.anchors.map(a => [
                a.id,
                { ...a }
            ]));
            for (const d of state.drags.values()) {
                const lc = d.lastClient ?? d.startClient;
                const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
                const a = byId.get(d.anchorId);
                if (a) {
                    a.x = pNow.x;
                    a.y = pNow.y;
                }
            }
            return Array.from(byId.values());
        };
        const rebaseAllDrags = async newBaseParams => {
            const overlay = state.overlay;
            const inv = getInvScreenCTM(overlay);
            if (state.drags.size) {
                const entries = Array.from(state.drags.entries());
                const nextDrags = new Map(state.drags);
                for (const [pid, d] of entries) {
                    const lastClient = d.lastClient ?? d.startClient;
                    const startPointer = svgPointFromClient(overlay, lastClient.x, lastClient.y, inv);
                    const jacobian = await svgEditor_estimateJacobianForAnchor({
                        anchorId: d.anchorId,
                        p0: newBaseParams,
                        renderProbe,
                        paramNames: svgParameterNames,
                        anchorsFn: rectAnchorsStable
                    });
                    if (!jacobian)
                        continue;
                    nextDrags.set(pid, {
                        ...d,
                        startClient: { ...lastClient },
                        startPointer,
                        startParams: newBaseParams,
                        jacobian,
                        invScreenCTM: inv
                    });
                }
                state.drags = nextDrags;
            }
            for (const [lockId, lockData] of state.lockedAnchors) {
                const jacobian = await svgEditor_estimateJacobianForAnchor({
                    anchorId: lockId,
                    p0: newBaseParams,
                    renderProbe,
                    paramNames: svgParameterNames,
                    anchorsFn: rectAnchorsStable
                });
                if (jacobian) {
                    state.lockedAnchors.set(lockId, { jacobian });
                }
            }
        };
        const toggleLock = async anchorId => {
            if (state.lockedAnchors.has(anchorId)) {
                state.lockedAnchors.delete(anchorId);
            } else {
                const params = getCurrentParams();
                const jacobian = await svgEditor_estimateJacobianForAnchor({
                    anchorId,
                    p0: params,
                    renderProbe,
                    paramNames: svgParameterNames,
                    anchorsFn: rectAnchorsStable
                });
                if (jacobian) {
                    state.lockedAnchors.set(anchorId, { jacobian });
                }
            }
            svgEditor_drawOverlay(state.overlay, {
                anchors: state.anchors,
                hoverId: state.hover?.id ?? null,
                lockedIds: getLockedIdSet(),
                show: true
            });
        };
        const computeCombinedUpdate = baseParams => {
            const overlay = state.overlay;
            const base = baseParams ?? getCurrentParams();
            const n = svgParameterNames.length;
            const dragDetails = [];
            const drags = Array.from(state.drags.values());
            const hasLocks = state.lockedAnchors.size > 0;
            if (!drags.length && !hasLocks) {
                return {
                    next: { ...base },
                    dpTotal: new Array(n).fill(0),
                    dragDetails
                };
            }
            if (drags.length === 1 && !hasLocks) {
                const d = drags[0];
                const lc = d.lastClient ?? d.startClient;
                const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
                const da = [
                    pNow.x - d.startPointer.x,
                    pNow.y - d.startPointer.y
                ];
                const dp = pseudoInverseStepMxN(d.jacobian.J, da);
                const next = { ...base };
                for (let i = 0; i < n; i++) {
                    const name = svgParameterNames[i];
                    const v = +base[name];
                    if (!Number.isFinite(v))
                        continue;
                    next[name] = v + (+dp[i] || 0);
                }
                dragDetails.push({
                    pointerId: d.pointerId,
                    anchorId: d.anchorId,
                    pointer: pNow,
                    da,
                    dp,
                    J: d.jacobian.J
                });
                return {
                    next,
                    dpTotal: dp,
                    dragDetails
                };
            }
            const A = [];
            const b = [];
            for (const d of drags) {
                const lc = d.lastClient ?? d.startClient;
                const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
                const da0 = pNow.x - d.startPointer.x;
                const da1 = pNow.y - d.startPointer.y;
                const J = d.jacobian.J;
                A.push(J[0].slice(), J[1].slice());
                b.push(da0, da1);
                dragDetails.push({
                    pointerId: d.pointerId,
                    anchorId: d.anchorId,
                    pointer: pNow,
                    da: [
                        da0,
                        da1
                    ],
                    J
                });
            }
            // Lock constraints: heavily weighted zero-displacement rows
            for (const [lockId, lockData] of state.lockedAnchors) {
                const J = lockData.jacobian.J;
                A.push(J[0].map(v => v * LOCK_WEIGHT), J[1].map(v => v * LOCK_WEIGHT));
                b.push(0, 0);
            }
            if (!A.length) {
                return {
                    next: { ...base },
                    dpTotal: new Array(n).fill(0),
                    dragDetails
                };
            }
            const dp = pseudoInverseStepMxN(A, b);
            for (const dd of dragDetails)
                dd.dp = dp;
            const next = { ...base };
            for (let i = 0; i < n; i++) {
                const name = svgParameterNames[i];
                const v = +base[name];
                if (!Number.isFinite(v))
                    continue;
                next[name] = v + (+dp[i] || 0);
            }
            return {
                next,
                dpTotal: dp,
                dragDetails
            };
        };
        const commitFromCurrentDragState = reason => {
            const base = state.gestureBaseParams ?? getCurrentParams();
            const {next, dpTotal, dragDetails} = computeCombinedUpdate(base);
            svgEditor_commitParams(next, svgParameterViewElByName);
            setStatus({
                mode: state.rebasing ? 'rebasing' : state.drags.size > 1 ? 'dragging-multi' : state.drags.size ? 'dragging' : state.overTarget ? 'hover' : 'idle',
                anchors: state.anchors.map(a => ({
                    id: a.id,
                    x: a.x,
                    y: a.y
                })),
                activeAnchors: Array.from(state.drags.values()).map(x => x.anchorId),
                lockedAnchors: Array.from(state.lockedAnchors.keys()),
                params: next,
                dp: dpTotal,
                drags: dragDetails,
                reason
            });
        };
        const pointerMoveOverlay = evt => {
            const overlay = state.overlay;
            if (!overlay?.isConnected)
                return;
            if (state.drags.size) {
                const d = state.drags.get(evt.pointerId);
                if (d) {
                    d.lastClient = {
                        x: evt.clientX,
                        y: evt.clientY
                    };
                    state.drags.set(evt.pointerId, d);
                }
                if (!state.rebasing) {
                    commitFromCurrentDragState('pointermove');
                    svgEditor_drawOverlay(overlay, {
                        anchors: overlayAnchorsWithActivePointerPositions(),
                        hoverId: null,
                        lockedIds: getLockedIdSet(),
                        show: true
                    });
                    // Continuous rebase: re-estimate Jacobian at new params
                    // so the next pointermove uses an up-to-date linearization
                    if (!state._rebasePending) {
                        state._rebasePending = true;
                        requestAnimationFrame(async () => {
                            if (state.drags.size && !state.rebasing) {
                                state.rebasing = true;
                                try {
                                    const newBase = getCurrentParams();
                                    state.gestureBaseParams = newBase;
                                    await rebaseAllDrags(newBase);
                                } finally {
                                    state.rebasing = false;
                                }
                                // Re-commit with updated Jacobian
                                if (state.drags.size) {
                                    commitFromCurrentDragState('continuous-rebase');
                                    svgEditor_drawOverlay(state.overlay, {
                                        anchors: overlayAnchorsWithActivePointerPositions(),
                                        hoverId: null,
                                        lockedIds: getLockedIdSet(),
                                        show: true
                                    });
                                }
                            }
                            state._rebasePending = false;
                        });
                    }
                }
                evt.preventDefault();
                return;
            }
            if (!state.overTarget)
                return;
            if (state.rebasing)
                return;
            const p = svgPointFromClient(overlay, evt.clientX, evt.clientY);
            state.hover = pickAnchor(state.anchors, p, 12);
            setStatus({
                mode: 'hover',
                anchor: state.hover?.id ?? null,
                pointer: p,
                params: getCurrentParams(),
                anchors: state.anchors.map(a => ({
                    id: a.id,
                    x: a.x,
                    y: a.y
                })),
                reason: 'hover'
            });
            svgEditor_drawOverlay(overlay, {
                anchors: state.anchors,
                hoverId: state.hover?.id ?? null,
                lockedIds: getLockedIdSet(),
                show: true
            });
        };
        const pointerDownOverlay = async evt => {
            const anchorId = evt.target?.dataset?.anchorId;
            if (!anchorId)
                return;
            if (evt.shiftKey) {
                await toggleLock(anchorId);
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (state.lockedAnchors.has(anchorId))
                return;
            const overlay = state.overlay;
            const pointerId = evt.pointerId;
            state.rebasing = true;
            try {
                const newBase = getCurrentParams();
                state.gestureBaseParams = newBase;
                await rebaseAllDrags(newBase);
                const startParams = state.gestureBaseParams ?? getCurrentParams();
                const jacobian = await svgEditor_estimateJacobianForAnchor({
                    anchorId,
                    p0: startParams,
                    renderProbe,
                    paramNames: svgParameterNames,
                    anchorsFn: rectAnchorsStable
                });
                if (!jacobian)
                    return;
                const inv = getInvScreenCTM(overlay);
                const startPointer = svgPointFromClient(overlay, evt.clientX, evt.clientY, inv);
                state.drags.set(pointerId, {
                    pointerId,
                    anchorId,
                    startClient: {
                        x: evt.clientX,
                        y: evt.clientY
                    },
                    lastClient: {
                        x: evt.clientX,
                        y: evt.clientY
                    },
                    startPointer,
                    startParams,
                    jacobian,
                    invScreenCTM: inv
                });
                try {
                    overlay.setPointerCapture(pointerId);
                } catch {
                }
                svgEditor_setOverlayVisible(overlay, true);
                commitFromCurrentDragState('pointerdown');
                svgEditor_drawOverlay(overlay, {
                    anchors: overlayAnchorsWithActivePointerPositions(),
                    hoverId: null,
                    lockedIds: getLockedIdSet(),
                    show: true
                });
                evt.preventDefault();
                evt.stopPropagation();
            } finally {
                state.rebasing = false;
                if (state.drags.size) {
                    commitFromCurrentDragState('pointerdown-rebased');
                    svgEditor_drawOverlay(state.overlay, {
                        anchors: overlayAnchorsWithActivePointerPositions(),
                        hoverId: null,
                        lockedIds: getLockedIdSet(),
                        show: true
                    });
                }
            }
        };
        const pointerUpOverlay = async evt => {
            if (!state.drags.size)
                return;
            const had = state.drags.delete(evt.pointerId);
            if (!had)
                return;
            const overlay = state.overlay;
            if (!state.drags.size) {
                state.gestureBaseParams = null;
                setStatus({
                    mode: 'drag-end',
                    params: getCurrentParams(),
                    anchors: state.anchors.map(a => ({
                        id: a.id,
                        x: a.x,
                        y: a.y
                    })),
                    reason: 'pointerup'
                });
                svgEditor_setOverlayVisible(overlay, !!state.overTarget);
                svgEditor_drawOverlay(overlay, {
                    anchors: state.anchors,
                    hoverId: state.hover?.id ?? null,
                    lockedIds: getLockedIdSet(),
                    show: !!state.overTarget
                });
                evt.preventDefault();
                return;
            }
            state.rebasing = true;
            try {
                const newBase = getCurrentParams();
                state.gestureBaseParams = newBase;
                await rebaseAllDrags(newBase);
                commitFromCurrentDragState('pointerup-rebase-remaining');
                svgEditor_setOverlayVisible(overlay, true);
                svgEditor_drawOverlay(overlay, {
                    anchors: overlayAnchorsWithActivePointerPositions(),
                    hoverId: null,
                    lockedIds: getLockedIdSet(),
                    show: true
                });
                evt.preventDefault();
            } finally {
                state.rebasing = false;
            }
        };
        const pointerMoveDoc = evt => {
            const target = svgTemplateVariable?._value;
            if (!target)
                return;
            if (!state.targetRect) {
                try {
                    state.targetRect = target.getBoundingClientRect();
                } catch {
                    state.targetRect = null;
                }
            }
            if (state.drags.size)
                return;
            const inside = svgEditor_computeOverTarget(state.targetRect, evt.clientX, evt.clientY);
            if (inside === state.overTarget)
                return;
            state.overTarget = inside;
            if (!inside) {
                state.hover = null;
                state.anchors = [];
                setStatus({
                    mode: 'idle',
                    anchor: null,
                    params: getCurrentParams(),
                    anchors: [],
                    reason: 'leave'
                });
            }
            svgEditor_setOverlayVisible(state.overlay, inside);
            svgEditor_drawOverlay(state.overlay, {
                anchors: state.anchors,
                hoverId: state.hover?.id ?? null,
                lockedIds: getLockedIdSet(),
                show: inside
            });
        };
        state.overlay.addEventListener('pointermove', pointerMoveOverlay, { passive: false });
        state.overlay.addEventListener('pointerdown', pointerDownOverlay, { passive: false });
        state.overlay.addEventListener('pointerup', pointerUpOverlay, { passive: false });
        state.overlay.addEventListener('pointercancel', pointerUpOverlay, { passive: false });
        document.addEventListener('pointermove', pointerMoveDoc, { passive: true });
        let raf = 0;
        const tick = () => {
            const target = svgTemplateVariable?._value;
            if (target && target !== state.lastTarget)
                state.lastTarget = target;
            if (target?.getBoundingClientRect) {
                if (state.overTarget || state.drags.size) {
                    state.targetRect = svgEditor_syncOverlayToTarget(state.overlay, target) ?? state.targetRect;
                    refreshAnchorsFromTarget(target);
                    const activeAnchors = Array.from(state.drags.values()).map(x => x.anchorId);
                    setStatus({
                        mode: state.rebasing ? 'rebasing' : state.drags.size ? state.drags.size > 1 ? 'dragging-multi' : 'dragging' : 'idle',
                        params: getCurrentParams(),
                        anchor: activeAnchors[0] ?? state.hover?.id ?? null,
                        activeAnchors,
                        lockedAnchors: Array.from(state.lockedAnchors.keys()),
                        anchors: state.anchors.map(a => ({
                            id: a.id,
                            x: a.x,
                            y: a.y
                        })),
                        reason: 'tick'
                    });
                    svgEditor_drawOverlay(state.overlay, {
                        anchors: state.drags.size ? overlayAnchorsWithActivePointerPositions() : state.anchors,
                        hoverId: state.drags.size ? null : state.hover?.id ?? null,
                        lockedIds: getLockedIdSet(),
                        show: true
                    });
                } else {
                    try {
                        state.targetRect = target.getBoundingClientRect();
                    } catch {
                        state.targetRect = null;
                    }
                    svgEditor_clearOverlay(state.overlay);
                }
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        Promise.resolve(invalidation).then(() => {
            cancelAnimationFrame(raf);
            state.overlay?.removeEventListener('pointermove', pointerMoveOverlay);
            state.overlay?.removeEventListener('pointerdown', pointerDownOverlay);
            state.overlay?.removeEventListener('pointerup', pointerUpOverlay);
            state.overlay?.removeEventListener('pointercancel', pointerUpOverlay);
            document.removeEventListener('pointermove', pointerMoveDoc);
            try {
                state.overlay?.remove();
            } catch {
            }
            state.overlay = null;
            state.drags = new Map();
            state.lockedAnchors = new Map();
            state.gestureBaseParams = null;
            state.hover = null;
            state.anchors = [];
            state.lastTarget = null;
            state.overTarget = false;
            state.targetRect = null;
            state.rebasing = false;
        });
    };
    ensureOverlay();
    svgEditor_setOverlayVisible(state.overlay, !!state.drags?.size || !!state.overTarget);
    return Object.assign(state, {
        value: {
            headless: true,
            overlay: state.overlay,
            multitouch: true
        }
    });
};
const _9s2ls = function _inverseConfig(Inputs){return(
