package nl.gzeven.opensail.background

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import nl.gzeven.opensail.MainActivity
import nl.gzeven.opensail.R

/**
 * The page's background support (pwa/src/platform/background.ts,
 * `registerPlugin('OpenSailBackground')`):
 * - keepRunning({ activities }) starts, updates or (with an empty list) stops [NavigationService];
 * - showAlarm({ id, title, text }) / clearAlarm({ id }): alarms as notifications that sound like
 *   an alarm clock and wake the screen, shown while the app isn't in the foreground;
 * - event `alarmsSilenced` when the user taps Silence on such a notification.
 */
@CapacitorPlugin(
    name = "OpenSailBackground",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class BackgroundPlugin : Plugin() {
    companion object {
        const val ALARM_CHANNEL_ID = "opensail-alarms"
        private const val ALARM_TAG = "opensail-alarm"
    }

    private val book = AlarmBook()
    private val silenceAction by lazy { "${context.packageName}.SILENCE_ALARMS" }
    private val silenceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            apply(book.silence())
            notifyListeners("alarmsSilenced", JSObject())
        }
    }

    override fun load() {
        ContextCompat.registerReceiver(context, silenceReceiver, IntentFilter(silenceAction), ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    @PluginMethod
    fun keepRunning(call: PluginCall) {
        val needsAsking = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") == PermissionState.PROMPT
        // The service runs without the permission too, but then its notification and the alarms stay hidden
        if (needsAsking && activities(call).isNotEmpty()) {
            requestPermissionForAlias("notifications", call, "keepRunningAfterPermission")
        } else {
            keepRunningNow(call)
        }
    }

    @PermissionCallback
    private fun keepRunningAfterPermission(call: PluginCall) {
        keepRunningNow(call)
    }

    private fun activities(call: PluginCall): List<String> =
        call.getArray("activities")?.toList<String>() ?: emptyList()

    private fun keepRunningNow(call: PluginCall) {
        val activities = activities(call)
        try {
            if (activities.isEmpty()) NavigationService.stop(context)
            else NavigationService.start(context, NavigationService.describe(activities))
            call.resolve()
        } catch (error: RuntimeException) {
            // e.g. ForegroundServiceStartNotAllowedException: Android 12+ only starts one from the foreground
            call.reject(error.message ?: "could not start the background service")
        }
    }

    @PluginMethod
    fun showAlarm(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id is needed")
        val alarm = AlarmBook.Alarm(id, call.getString("title") ?: "OpenSail alarm", call.getString("text") ?: "")
        apply(book.show(alarm))
        call.resolve()
    }

    @PluginMethod
    fun clearAlarm(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id is needed")
        apply(book.clear(id))
        call.resolve()
    }

    override fun handleOnResume() {
        apply(book.setForeground(true))
    }

    override fun handleOnPause() {
        apply(book.setForeground(false))
    }

    override fun handleOnDestroy() {
        context.unregisterReceiver(silenceReceiver)
        NavigationService.stop(context)
    }

    private fun apply(commands: List<AlarmBook.Command>) {
        val manager = context.getSystemService(NotificationManager::class.java)
        for (command in commands) {
            when (command) {
                is AlarmBook.Command.Post -> manager.notify(ALARM_TAG, command.alarm.id.hashCode(), alarmNotification(command.alarm))
                is AlarmBook.Command.Cancel -> manager.cancel(ALARM_TAG, command.id.hashCode())
            }
        }
        if (commands.isNotEmpty()) showOverLockScreen(book.hasAlarms)
    }

    /** While an alarm is on, tapping it (or its full-screen intent) opens the app over the lock screen */
    private fun showOverLockScreen(show: Boolean) {
        val activity = activity ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) return
        activity.runOnUiThread {
            activity.setShowWhenLocked(show)
            activity.setTurnScreenOn(show)
        }
    }

    private fun alarmNotification(alarm: AlarmBook.Alarm): Notification {
        createAlarmChannel()
        val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        val open = PendingIntent.getActivity(
            context,
            alarm.id.hashCode(),
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            flags,
        )
        val silence = PendingIntent.getBroadcast(context, 0, Intent(silenceAction).setPackage(context.packageName), flags)
        val notification = NotificationCompat.Builder(context, ALARM_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_opensail)
            .setContentTitle(alarm.title)
            .setContentText(alarm.text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(alarm.text))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), android.media.AudioManager.STREAM_ALARM)
            .setVibrate(longArrayOf(0, 800, 400, 800, 400, 800))
            .setContentIntent(open)
            .setFullScreenIntent(open, true)
            .addAction(0, "Silence", silence)
            .setAutoCancel(true)
            .build()
        // Keep sounding until it's opened or silenced
        notification.flags = notification.flags or Notification.FLAG_INSISTENT
        return notification
    }

    private fun createAlarmChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(ALARM_CHANNEL_ID, "Alarms", NotificationManager.IMPORTANCE_HIGH)
        channel.description = "Anchor drag, man overboard and instrument alarms while OpenSail isn't on screen"
        channel.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        channel.enableVibration(true)
        channel.vibrationPattern = longArrayOf(0, 800, 400, 800, 400, 800)
        channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
