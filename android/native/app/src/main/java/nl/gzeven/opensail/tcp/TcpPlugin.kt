package nl.gzeven.opensail.tcp

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.IOException
import java.net.InetAddress
import java.net.Socket
import java.util.concurrent.Executors

/**
 * The page's TCP sockets (pwa/src/platform/nativeTcp.ts, `registerPlugin('OpenSailTcp')`):
 * connect({ id, host, port }), write({ id, data }), disconnect({ id }); events `tcp-data`
 * { id, data } and `tcp-closed` { id, error }. The same calls and events as the Windows app's
 * Rust commands.
 *
 * The boat's Wi-Fi (pcnautic_AP) has no internet, so Android may send traffic over mobile data
 * instead. Sockets to an address on a local network are therefore bound to the Wi-Fi network.
 */
@CapacitorPlugin(name = "OpenSailTcp")
class TcpPlugin : Plugin() {
    private val executor = Executors.newCachedThreadPool()

    private val sockets = TcpSockets(object : TcpSockets.TcpEvents {
        override fun onData(id: String, data: String) {
            notifyListeners("tcp-data", JSObject().put("id", id).put("data", data))
        }

        override fun onClosed(id: String, error: String?) {
            val event = JSObject().put("id", id)
            event.put("error", error ?: JSObject.NULL)
            notifyListeners("tcp-closed", event)
        }
    })

    @PluginMethod
    fun connect(call: PluginCall) {
        val id = call.getString("id")
        val host = call.getString("host")?.trim()
        val port = call.getInt("port")
        if (id.isNullOrEmpty() || host.isNullOrEmpty() || port == null) {
            call.reject("id, host and port are needed")
            return
        }
        executor.execute {
            try {
                connectOverWifi(id, host, port)
                call.resolve()
            } catch (error: IOException) {
                call.reject(error.message ?: "connection failed")
            }
        }
    }

    @PluginMethod
    fun write(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id is needed")
        val data = call.getString("data") ?: return call.reject("data is needed")
        executor.execute {
            try {
                sockets.write(id, data)
                call.resolve()
            } catch (error: IOException) {
                call.reject(error.message ?: "write failed")
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id is needed")
        executor.execute {
            sockets.disconnect(id)
            call.resolve()
        }
    }

    override fun handleOnDestroy() {
        sockets.disconnectAll()
        executor.shutdown()
    }

    /** Over the Wi-Fi network for a local address; over the default network when that fails */
    private fun connectOverWifi(id: String, host: String, port: Int) {
        val address = try {
            InetAddress.getByName(host)
        } catch (error: IOException) {
            throw IOException("unknown host $host", error)
        }
        val wifi = if (TcpSockets.isLocalNetwork(address)) wifiNetwork() else null
        if (wifi == null) {
            sockets.connect(id, address.hostAddress ?: host, port)
            return
        }
        try {
            sockets.connect(id, address.hostAddress ?: host, port) { Socket().also { wifi.bindSocket(it) } }
        } catch (wifiError: IOException) {
            // e.g. an address behind a VPN: try the way Android would route it
            try {
                sockets.connect(id, address.hostAddress ?: host, port)
            } catch (_: IOException) {
                throw wifiError
            }
        }
    }

    @Suppress("DEPRECATION") // allNetworks: the simplest way that works from API 24 on
    private fun wifiNetwork(): Network? {
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return connectivity.allNetworks.firstOrNull { network ->
            connectivity.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        }
    }
}
