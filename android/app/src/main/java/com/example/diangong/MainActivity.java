package com.example.diangong;

import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * 沉浸式全屏。
 *
 * 为什么必须在原生侧做：
 *   Web 层的 document.documentElement.requestFullscreen() 在 Android WebView 里
 *   对普通元素是【不支持】的（只支持 video 全屏），调用会被静默拒绝 ——
 *   gameFs.js 里对失败做了降级，于是页面虽然是"铺满布局"，但系统状态栏/导航栏还在。
 *
 * 做法：edge-to-edge + 隐藏 systemBars，并设为 sticky（用户从边缘上滑可临时唤出）。
 * 下拉通知栏、从后台回来、权限弹窗关闭后系统栏会重新出现，所以在
 * onWindowFocusChanged 里重新进入一次。
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterFullscreen();
        }
    }

    private void enterFullscreen() {
        // 内容铺到整块屏幕（含刘海区），配合网页 viewport-fit=cover 使用
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }
        // 隐藏状态栏 + 导航栏
        controller.hide(WindowInsetsCompat.Type.systemBars());
        // 上滑可临时唤出，随后自动隐藏（不会永久退出全屏）
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
