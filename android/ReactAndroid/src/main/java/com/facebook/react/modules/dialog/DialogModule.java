/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
package com.facebook.react.modules.dialog;

import android.app.Activity;
import android.content.DialogInterface;
import android.content.DialogInterface.OnClickListener;
import android.content.DialogInterface.OnDismissListener;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentActivity;
import androidx.fragment.app.FragmentManager;
import com.facebook.common.logging.FLog;
import com.facebook.fbreact.specs.NativeDialogManagerAndroidSpec;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.SoftAssertions;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.module.annotations.ReactModule;
import java.util.Map;

@ReactModule(name = DialogModule.NAME)
public class DialogModule extends NativeDialogManagerAndroidSpec implements LifecycleEventListener {

    /* package */
    public static String FRAGMENT_TAG = "com.facebook.catalyst.react.dialog.DialogModule";

    public static final String NAME = "DialogManagerAndroid";

    /* package */
    public static String ACTION_BUTTON_CLICKED = "buttonClicked";

    /* package */
    public static String ACTION_DISMISSED = "dismissed";

    /* package */
    public static String KEY_TITLE = "title";

    /* package */
    public static String KEY_MESSAGE = "message";

    /* package */
    public static String KEY_BUTTON_POSITIVE = "buttonPositive";

    /* package */
    public static String KEY_BUTTON_NEGATIVE = "buttonNegative";

    /* package */
    public static String KEY_BUTTON_NEUTRAL = "buttonNeutral";

    /* package */
    public static String KEY_ITEMS = "items";

    /* package */
    public static String KEY_CANCELABLE = "cancelable";

    /* package */
    public static Map<String, Object> CONSTANTS = MapBuilder.<String, Object>of(ACTION_BUTTON_CLICKED, ACTION_BUTTON_CLICKED, ACTION_DISMISSED, ACTION_DISMISSED, KEY_BUTTON_POSITIVE, DialogInterface.BUTTON_POSITIVE, KEY_BUTTON_NEGATIVE, DialogInterface.BUTTON_NEGATIVE, KEY_BUTTON_NEUTRAL, DialogInterface.BUTTON_NEUTRAL);

    public boolean mIsInForeground;

    public DialogModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    private class FragmentManagerHelper {

        @NonNull
        public final FragmentManager mFragmentManager;

        @Nullable
        public Object mFragmentToShow;

        public FragmentManagerHelper(@NonNull FragmentManager fragmentManager) {
            mFragmentManager = fragmentManager;
        }

        public void showPendingAlert() {
            UiThreadUtil.assertOnUiThread();
            SoftAssertions.assertCondition(mIsInForeground, "showPendingAlert() called in background");
            if (mFragmentToShow == null) {
                return;
            }
            dismissExisting();
            ((AlertFragment) mFragmentToShow).show(mFragmentManager, FRAGMENT_TAG);
            mFragmentToShow = null;
        }

        private void dismissExisting() {
            if (!mIsInForeground) {
                return;
            }
            AlertFragment oldFragment = (AlertFragment) mFragmentManager.findFragmentByTag(FRAGMENT_TAG);
            if (oldFragment != null && oldFragment.isResumed()) {
                oldFragment.dismiss();
            }
        }

        public void showNewAlert(Bundle arguments, Callback actionCallback) {
            UiThreadUtil.assertOnUiThread();
            dismissExisting();
            AlertFragmentListener actionListener = actionCallback != null ? new AlertFragmentListener(actionCallback) : null;
            AlertFragment alertFragment = new AlertFragment(actionListener, arguments);
            if (mIsInForeground && !mFragmentManager.isStateSaved()) {
                if (arguments.containsKey(KEY_CANCELABLE)) {
                    alertFragment.setCancelable(arguments.getBoolean(KEY_CANCELABLE));
                }
                alertFragment.show(mFragmentManager, FRAGMENT_TAG);
            } else {
                mFragmentToShow = alertFragment;
            }
        }
    }

    /* package */
    class AlertFragmentListener implements OnClickListener, OnDismissListener {

        public final Callback mCallback;

        public boolean mCallbackConsumed = false;

        public AlertFragmentListener(Callback callback) {
            mCallback = callback;
        }

        @Override
        public void onClick(DialogInterface dialog, int which) {
            if (!mCallbackConsumed) {
                if (getReactApplicationContext().isBridgeless() || getReactApplicationContext().hasActiveCatalystInstance()) {
                    mCallback.invoke(ACTION_BUTTON_CLICKED, which);
                    mCallbackConsumed = true;
                }
            }
        }

        @Override
        public void onDismiss(DialogInterface dialog) {
            if (!mCallbackConsumed) {
                if (getReactApplicationContext().isBridgeless() || getReactApplicationContext().hasActiveCatalystInstance()) {
                    mCallback.invoke(ACTION_DISMISSED);
                    mCallbackConsumed = true;
                }
            }
        }
    }

    @Override
    public Map<String, Object> getTypedExportedConstants() {
        return CONSTANTS;
    }

    @Override
    public void initialize() {
        getReactApplicationContext().addLifecycleEventListener(this);
    }

    @Override
    public void onHostPause() {
        // Don't show the dialog if the host is paused.
        mIsInForeground = false;
    }

    @Override
    public void onHostDestroy() {
    }

    @Override
    public void onHostResume() {
        try {
            {
                mIsInForeground = true;
                // Check if a dialog has been created while the host was paused, so that we can show it now.
                FragmentManagerHelper fragmentManagerHelper = getFragmentManagerHelper();
                if (fragmentManagerHelper != null) {
                    fragmentManagerHelper.showPendingAlert();
                } else {
                    FLog.w(DialogModule.class, "onHostResume called but no FragmentManager found");
                }
            }
        } catch (Throwable expoException) {
        }
    }

    @Override
    public void showAlert(ReadableMap options, Callback errorCallback, final Callback actionCallback) {
        final FragmentManagerHelper fragmentManagerHelper = getFragmentManagerHelper();
        if (fragmentManagerHelper == null) {
            errorCallback.invoke("Tried to show an alert while not attached to an Activity");
            return;
        }
        final Bundle args = new Bundle();
        if (options.hasKey(KEY_TITLE)) {
            args.putString(AlertFragment.ARG_TITLE, options.getString(KEY_TITLE));
        }
        if (options.hasKey(KEY_MESSAGE)) {
            args.putString(AlertFragment.ARG_MESSAGE, options.getString(KEY_MESSAGE));
        }
        if (options.hasKey(KEY_BUTTON_POSITIVE)) {
            args.putString(AlertFragment.ARG_BUTTON_POSITIVE, options.getString(KEY_BUTTON_POSITIVE));
        }
        if (options.hasKey(KEY_BUTTON_NEGATIVE)) {
            args.putString(AlertFragment.ARG_BUTTON_NEGATIVE, options.getString(KEY_BUTTON_NEGATIVE));
        }
        if (options.hasKey(KEY_BUTTON_NEUTRAL)) {
            args.putString(AlertFragment.ARG_BUTTON_NEUTRAL, options.getString(KEY_BUTTON_NEUTRAL));
        }
        if (options.hasKey(KEY_ITEMS)) {
            ReadableArray items = options.getArray(KEY_ITEMS);
            CharSequence[] itemsArray = new CharSequence[items.size()];
            for (int i = 0; i < items.size(); i++) {
                itemsArray[i] = items.getString(i);
            }
            args.putCharSequenceArray(AlertFragment.ARG_ITEMS, itemsArray);
        }
        if (options.hasKey(KEY_CANCELABLE)) {
            args.putBoolean(KEY_CANCELABLE, options.getBoolean(KEY_CANCELABLE));
        }
        UiThreadUtil.runOnUiThread(new Runnable() {

            @Override
            public void run() {
                fragmentManagerHelper.showNewAlert(args, actionCallback);
            }
        });
    }

    /**
   * Creates a new helper to work with FragmentManager. Returns null if we're not attached to an
   * Activity.
   *
   * <p>DO NOT HOLD LONG-LIVED REFERENCES TO THE OBJECT RETURNED BY THIS METHOD, AS THIS WILL CAUSE
   * MEMORY LEAKS.
   */
    @Nullable
    private FragmentManagerHelper getFragmentManagerHelper() {
        Activity activity = getCurrentActivity();
        if (activity == null || !(activity instanceof FragmentActivity)) {
            return null;
        }
        return new FragmentManagerHelper(((FragmentActivity) activity).getSupportFragmentManager());
    }
}
