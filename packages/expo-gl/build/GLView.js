import { NativeModulesProxy, UnavailabilityError, requireNativeViewManager, CodedError, } from '@unimodules/core';
import * as React from 'react';
import { Platform, View, findNodeHandle } from 'react-native';
import { configureLogging } from './GLUtils';
const packageJSON = require('../package.json');
const { ExponentGLObjectManager, ExponentGLViewManager } = NativeModulesProxy;
const NativeView = requireNativeViewManager('ExponentGLView');
/**
 * A component that acts as an OpenGL render target
 */
export class GLView extends React.Component {
    constructor() {
        super(...arguments);
        this.nativeRef = null;
        this._setNativeRef = (nativeRef) => {
            if (this.props.nativeRef_EXPERIMENTAL) {
                this.props.nativeRef_EXPERIMENTAL(nativeRef);
            }
            this.nativeRef = nativeRef;
        };
        this._onSurfaceCreate = ({ nativeEvent: { exglCtxId } }) => {
            const gl = getGl(exglCtxId);
            this.exglCtxId = exglCtxId;
            if (this.props.onContextCreate) {
                this.props.onContextCreate(gl);
            }
        };
    }
    static async createContextAsync() {
        const { exglCtxId } = await ExponentGLObjectManager.createContextAsync();
        return getGl(exglCtxId);
    }
    static async destroyContextAsync(exgl) {
        const exglCtxId = getContextId(exgl);
        return ExponentGLObjectManager.destroyContextAsync(exglCtxId);
    }
    static async takeSnapshotAsync(exgl, options = {}) {
        const exglCtxId = getContextId(exgl);
        return ExponentGLObjectManager.takeSnapshotAsync(exglCtxId, options);
    }
    render() {
        const { onContextCreate, // eslint-disable-line no-unused-vars
        msaaSamples, ...viewProps } = this.props;
        return (React.createElement(View, Object.assign({}, viewProps),
            React.createElement(NativeView, { ref: this._setNativeRef, style: {
                    flex: 1,
                    ...(Platform.OS === 'ios'
                        ? {
                            backgroundColor: 'transparent',
                        }
                        : {}),
                }, onSurfaceCreate: this._onSurfaceCreate, msaaSamples: Platform.OS === 'ios' ? msaaSamples : undefined })));
    }
    async startARSessionAsync() {
        if (!ExponentGLViewManager.startARSessionAsync) {
            throw new UnavailabilityError('expo-gl', 'startARSessionAsync');
        }
        return await ExponentGLViewManager.startARSessionAsync(findNodeHandle(this.nativeRef));
    }
    async createCameraTextureAsync(cameraRefOrHandle) {
        if (!ExponentGLObjectManager.createCameraTextureAsync) {
            throw new UnavailabilityError('expo-gl', 'createCameraTextureAsync');
        }
        const { exglCtxId } = this;
        if (!exglCtxId) {
            throw new Error("GLView's surface is not created yet!");
        }
        const cameraTag = findNodeHandle(cameraRefOrHandle);
        const { exglObjId } = await ExponentGLObjectManager.createCameraTextureAsync(exglCtxId, cameraTag);
        return { id: exglObjId };
    }
    async destroyObjectAsync(glObject) {
        if (!ExponentGLObjectManager.destroyObjectAsync) {
            throw new UnavailabilityError('expo-gl', 'destroyObjectAsync');
        }
        return await ExponentGLObjectManager.destroyObjectAsync(glObject.id);
    }
    async takeSnapshotAsync(options = {}) {
        if (!GLView.takeSnapshotAsync) {
            throw new UnavailabilityError('expo-gl', 'takeSnapshotAsync');
        }
        const { exglCtxId } = this;
        return await GLView.takeSnapshotAsync(exglCtxId, options);
    }
}
GLView.defaultProps = {
    msaaSamples: 4,
};
GLView.NativeView = NativeView;
// Get the GL interface from an EXGLContextID and do JS-side setup
const getGl = (exglCtxId) => {
    if (!global.__EXGLContexts) {
        throw new CodedError('ERR_GL_NOT_AVAILABLE', 'GL is currently not available. (Have you enabled remote debugging? GL is not available while debugging remotely.)');
    }
    const gl = global.__EXGLContexts[exglCtxId];
    configureLogging(gl);
    return gl;
};
const getContextId = (exgl) => {
    const exglCtxId = exgl && typeof exgl === 'object' ? exgl.__exglCtxId : exgl;
    if (!exglCtxId || typeof exglCtxId !== 'number') {
        throw new Error(`Invalid EXGLContext id: ${String(exglCtxId)}`);
    }
    return exglCtxId;
};
//# sourceMappingURL=GLView.js.map