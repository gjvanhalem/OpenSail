package nl.gzeven.opensail.background

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import nl.gzeven.opensail.MainActivity
import nl.gzeven.opensail.R

/**
 * Keeps OpenSail running with the screen off while an anchor watch, a man overboard, a route,
 * a track or an instrument connection is on: a foreground service (types location and
 * connectedDevice) with a permanent notification. It holds the CPU and the Wi-Fi awake, so GPS
 * updates, the autopilot's TCP stream and the page's anchor check keep going.
 */
class NavigationService : Service() {
    companion object {
        const val CHANNEL_ID = "opensail-running"
        const val NOTIFICATION_ID = 1
        private const val EXTRA_TEXT = "text"

        @Volatile
        var running = false
            private set

        /** "Anchor watch, Instruments" for the notification */
        fun describe(activities: List<String>): String = when (activities.size) {
            0 -> ""
            1 -> "${activities[0]} on"
            else -> activities.joinToString(", ") + " on"
        }

        /** Start the service, or update its notification when it runs already */
        fun start(context: Context, text: String) {
            if (running) {
                val manager = context.getSystemService(NotificationManager::class.java)
                manager.notify(NOTIFICATION_ID, notification(context, text))
                return
            }
            val intent = Intent(context, NavigationService::class.java).putExtra(EXTRA_TEXT, text)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, NavigationService::class.java))
        }

        private fun notification(context: Context, text: String): Notification {
            createChannel(context)
            val open = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            return NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_opensail)
                .setContentTitle("OpenSail is running")
                .setContentText(text)
                .setContentIntent(open)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build()
        }

        private fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val channel = NotificationChannel(CHANNEL_ID, "Running in the background", NotificationManager.IMPORTANCE_LOW)
            channel.description = "Shown while OpenSail keeps a watch, route or instrument connection running with the screen off"
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val text = intent?.getStringExtra(EXTRA_TEXT) ?: "Running"
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(this, text), serviceTypes())
        running = true
        holdLocks()
        // Started again by Android after it stopped the app: nothing to run without the page
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        running = false
        wakeLock?.takeIf { it.isHeld }?.release()
        wifiLock?.takeIf { it.isHeld }?.release()
        super.onDestroy()
    }

    /** Location only with the location permission: Android refuses the type without it */
    private fun serviceTypes(): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0
        var types = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
        val location = listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (location.any { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }) {
            types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        }
        return types
    }

    @Suppress("DEPRECATION") // WIFI_MODE_FULL_HIGH_PERF: the low-latency mode needs API 29
    private fun holdLocks() {
        if (wakeLock == null) {
            val power = getSystemService(PowerManager::class.java)
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OpenSail:navigation").apply {
                setReferenceCounted(false)
                acquire()
            }
        }
        if (wifiLock == null) {
            val wifi = applicationContext.getSystemService(WifiManager::class.java)
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                WifiManager.WIFI_MODE_FULL_LOW_LATENCY
            } else {
                WifiManager.WIFI_MODE_FULL_HIGH_PERF
            }
            wifiLock = wifi.createWifiLock(mode, "OpenSail:instruments").apply {
                setReferenceCounted(false)
                acquire()
            }
        }
    }
}
