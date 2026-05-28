package com.catemup.smashingcats;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.HapticFeedbackConstants;
import android.view.View;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

@CapacitorPlugin(name = "SmashingCatsDevice")
public class SmashingCatsDevicePlugin extends Plugin {
    @PluginMethod
    public void vibrate(PluginCall call) {
        JSArray patternArray = call.getArray("pattern");

        if (patternArray == null || patternArray.length() == 0) {
            call.resolve();
            return;
        }

        long[] pattern;

        try {
            pattern = toAndroidPattern(patternArray);
        } catch (JSONException exception) {
            call.reject("Invalid vibration pattern", exception);
            return;
        }

        if (pattern.length == 0) {
            call.resolve();
            return;
        }

        performHapticFeedback(pattern);

        Vibrator vibrator = getVibrator();

        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (pattern.length == 1) {
                    vibrator.vibrate(createOneShotEffect(pattern[0]));
                } else {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                }
            } else {
                if (pattern.length == 1) {
                    vibrator.vibrate(pattern[0]);
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (RuntimeException exception) {
            call.reject("Failed to vibrate", exception);
            return;
        }

        call.resolve();
    }

    private VibrationEffect createOneShotEffect(long duration) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (duration >= 180L) {
                return VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK);
            }

            if (duration >= 80L) {
                return VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK);
            }

            return VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK);
        }

        return VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE);
    }

    private Vibrator getVibrator() {
        Context context = getContext();

        if (context == null) {
            return null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);

            return vibratorManager == null ? null : vibratorManager.getDefaultVibrator();
        }

        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    private void performHapticFeedback(long[] pattern) {
        View view = getActivity() == null ? null : getActivity().getWindow().getDecorView();

        if (view == null) {
            return;
        }

        int feedbackType = getHapticFeedbackType(pattern);

        view.performHapticFeedback(
            feedbackType,
            HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING | HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
        );
    }

    private int getHapticFeedbackType(long[] pattern) {
        long totalDuration = 0L;

        for (long duration : pattern) {
            totalDuration += duration;
        }

        if (totalDuration >= 200L) {
            return HapticFeedbackConstants.LONG_PRESS;
        }

        if (totalDuration >= 80L) {
            return HapticFeedbackConstants.VIRTUAL_KEY;
        }

        return HapticFeedbackConstants.KEYBOARD_TAP;
    }

    private long[] toAndroidPattern(JSArray patternArray) throws JSONException {
        if (patternArray.length() == 1) {
            long duration = Math.max(0L, patternArray.getLong(0));

            return duration == 0L ? new long[0] : new long[] { duration };
        }

        long[] webPattern = new long[patternArray.length()];
        long totalDuration = 0L;

        for (int index = 0; index < patternArray.length(); index += 1) {
            webPattern[index] = Math.max(0L, patternArray.getLong(index));
            totalDuration += webPattern[index];
        }

        if (totalDuration == 0L) {
            return new long[0];
        }

        long[] androidPattern = new long[webPattern.length + 1];
        androidPattern[0] = 0L;

        System.arraycopy(webPattern, 0, androidPattern, 1, webPattern.length);

        return androidPattern;
    }
}
